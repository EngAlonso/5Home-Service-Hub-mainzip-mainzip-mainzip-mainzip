import { Router } from "express";
import { db } from "@workspace/db";
import {
  serviceRequestsTable, usersTable, servicesTable,
  governoratesTable, areasTable, offersTable,
  technicianProfilesTable, technicianServicesTable, technicianAreasTable,
  notificationsTable, auditTrailTable, priceAdjustmentsTable,
  pointTransactionsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

// ─── Helper: release reserved points for all pending offers on a request ──────
async function releaseAllPendingOfferReservations(requestId: number) {
  const pendingOffers = await db
    .select({
      id: offersTable.id,
      technicianId: offersTable.technicianId,
      reservedPoints: offersTable.reservedPoints,
    })
    .from(offersTable)
    .where(and(eq(offersTable.requestId, requestId), eq(offersTable.status, "pending")));

  for (const offer of pendingOffers) {
    if (offer.reservedPoints <= 0) continue;
    const [profile] = await db
      .select()
      .from(technicianProfilesTable)
      .where(eq(technicianProfilesTable.userId, offer.technicianId))
      .limit(1);
    if (!profile) continue;
    await db.update(technicianProfilesTable).set({
      reservedPoints: Math.max(0, profile.reservedPoints - offer.reservedPoints),
      updatedAt: new Date(),
    }).where(eq(technicianProfilesTable.id, profile.id));
  }

  if (pendingOffers.length > 0) {
    await db.update(offersTable).set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(offersTable.requestId, requestId), eq(offersTable.status, "pending")));
  }
}

// ─── Helper: notify admins ─────────────────────────────────────────────────────
async function notifyAdmins(title: string, body: string, relatedId: number) {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`${usersTable.role} IN ('admin', 'super_admin')`);
  if (admins.length > 0) {
    await db.insert(notificationsTable).values(
      admins.map((a) => ({
        userId: a.id,
        title,
        body,
        type: "status_change" as const,
        relatedId,
      }))
    );
  }
}

// ─── GET /api/requests ────────────────────────────────────────────────────────
router.get("/requests", authenticate, async (req, res) => {
  try {
    const { status, serviceId, governorateId, areaId, customerId, technicianId, page = "1", limit = "20" } = req.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let conditions: any[] = [];
    const user = req.user!;

    if (user.role === "customer") {
      conditions.push(eq(serviceRequestsTable.customerId, user.id));
    } else if (user.role === "technician") {
      const [profile] = await db
        .select()
        .from(technicianProfilesTable)
        .where(eq(technicianProfilesTable.userId, user.id))
        .limit(1);

      if (!profile || profile.approvalStatus !== "approved") {
        return res.json({ data: [], total: 0, page: pageNum, limit: limitNum });
      }

      const techAreas = await db
        .select({ areaId: technicianAreasTable.areaId })
        .from(technicianAreasTable)
        .where(eq(technicianAreasTable.technicianId, profile.id));
      const techServices = await db
        .select({ serviceId: technicianServicesTable.serviceId })
        .from(technicianServicesTable)
        .where(eq(technicianServicesTable.technicianId, profile.id));

      const areaIds = techAreas.map((a) => a.areaId);
      const serviceIds = techServices.map((s) => s.serviceId);

      if (areaIds.length > 0) conditions.push(inArray(serviceRequestsTable.areaId, areaIds));
      if (serviceIds.length > 0) conditions.push(inArray(serviceRequestsTable.serviceId, serviceIds));
    }

    if (status) conditions.push(eq(serviceRequestsTable.status, status));
    if (serviceId) conditions.push(eq(serviceRequestsTable.serviceId, parseInt(serviceId)));
    if (governorateId) conditions.push(eq(serviceRequestsTable.governorateId, parseInt(governorateId)));
    if (areaId) conditions.push(eq(serviceRequestsTable.areaId, parseInt(areaId)));
    if (customerId && (user.role === "admin" || user.role === "super_admin")) conditions.push(eq(serviceRequestsTable.customerId, parseInt(customerId)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(serviceRequestsTable)
      .where(where);

    const requests = await db
      .select()
      .from(serviceRequestsTable)
      .where(where)
      .orderBy(desc(serviceRequestsTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const offerCounts = await db
      .select({ requestId: offersTable.requestId, count: sql<number>`count(*)::int` })
      .from(offersTable)
      .groupBy(offersTable.requestId);

    const offerCountMap: Record<number, number> = {};
    offerCounts.forEach((o) => { offerCountMap[o.requestId] = o.count; });

    const data = requests.map((r) => ({ ...r, offersCount: offerCountMap[r.id] || 0 }));

    return res.json({ data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests ───────────────────────────────────────────────────────
router.post("/requests", authenticate, async (req, res) => {
  try {
    if (req.user!.role !== "customer") return res.status(403).json({ error: "العملاء فقط يمكنهم إنشاء طلبات" });

    const { serviceId, fullName, mobile, governorateId, areaId, address, description, images, audioUrl } = req.body;
    if (!serviceId || !fullName || !mobile || !governorateId || !areaId || !address || !description) {
      return res.status(400).json({ error: "جميع الحقول الأساسية مطلوبة" });
    }

    const [request] = await db
      .insert(serviceRequestsTable)
      .values({
        customerId: req.user!.id,
        serviceId: parseInt(serviceId),
        fullName, mobile,
        governorateId: parseInt(governorateId),
        areaId: parseInt(areaId),
        address, description,
        images: images || [],
        audioUrl: audioUrl || null,
        status: "pending",
      })
      .returning();

    try {
      const matchingProfiles = await db
        .select({ profileId: technicianServicesTable.technicianId })
        .from(technicianServicesTable)
        .where(eq(technicianServicesTable.serviceId, parseInt(serviceId)));

      const profileIds = matchingProfiles.map((p) => p.profileId);

      if (profileIds.length > 0) {
        const areaMatches = await db
          .select({ profileId: technicianAreasTable.technicianId })
          .from(technicianAreasTable)
          .where(and(
            inArray(technicianAreasTable.technicianId, profileIds),
            eq(technicianAreasTable.areaId, parseInt(areaId)),
          ));

        const qualifiedProfileIds = areaMatches.map((a) => a.profileId);

        if (qualifiedProfileIds.length > 0) {
          const techProfiles = await db
            .select({ userId: technicianProfilesTable.userId })
            .from(technicianProfilesTable)
            .where(and(
              inArray(technicianProfilesTable.id, qualifiedProfileIds),
              eq(technicianProfilesTable.approvalStatus, "approved"),
            ));

          const techUserIds = techProfiles.map((t) => t.userId);

          if (techUserIds.length > 0) {
            const activeUsers = await db
              .select({ id: usersTable.id })
              .from(usersTable)
              .where(and(
                inArray(usersTable.id, techUserIds),
                eq(usersTable.status, "active"),
              ));

            if (activeUsers.length > 0) {
              await db.insert(notificationsTable).values(
                activeUsers.map((u) => ({
                  userId: u.id,
                  title: "طلب خدمة جديد",
                  body: `طلب جديد في منطقتك — ${description.slice(0, 80)}`,
                  type: "new_request" as const,
                  relatedId: request.id,
                }))
              );
            }
          }
        }
      }
    } catch (notifErr) {
      req.log.error({ notifErr }, "failed to send new_request notifications");
    }

    return res.status(201).json(request);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── GET /api/requests/my-completed ─────────────────────────────────────────
// Returns completed/in-progress requests where the logged-in technician was selected
router.get("/requests/my-completed", authenticate, async (req, res) => {
  try {
    if (req.user!.role !== "technician") {
      return res.status(403).json({ error: "الفنيون فقط يمكنهم الوصول لهذا المسار" });
    }

    const { page = "1", limit = "20" } = req.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(serviceRequestsTable)
      .where(and(
        eq(serviceRequestsTable.selectedTechnicianId, req.user!.id),
        inArray(serviceRequestsTable.status, ["completed", "in_progress", "price_change_requested", "waiting_approval"]),
      ));

    const requests = await db
      .select()
      .from(serviceRequestsTable)
      .where(and(
        eq(serviceRequestsTable.selectedTechnicianId, req.user!.id),
        inArray(serviceRequestsTable.status, ["completed", "in_progress", "price_change_requested", "waiting_approval"]),
      ))
      .orderBy(desc(serviceRequestsTable.updatedAt))
      .limit(limitNum)
      .offset(offset);

    // Enrich with customer and service
    const enriched = await Promise.all(requests.map(async (r) => {
      const [customer] = await db
        .select({ id: usersTable.id, fullName: usersTable.fullName, mobile: usersTable.mobile })
        .from(usersTable)
        .where(eq(usersTable.id, r.customerId))
        .limit(1);

      const [service] = await db
        .select({ id: servicesTable.id, name: servicesTable.name })
        .from(servicesTable)
        .where(eq(servicesTable.id, r.serviceId))
        .limit(1);

      return { ...r, customer: customer || null, service: service || null };
    }));

    return res.json({ data: enriched, total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── GET /api/requests/:id ────────────────────────────────────────────────────
router.get("/requests/:id", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, request.serviceId)).limit(1);
    const [governorate] = await db.select().from(governoratesTable).where(eq(governoratesTable.id, request.governorateId)).limit(1);
    const [area] = await db.select().from(areasTable).where(eq(areasTable.id, request.areaId)).limit(1);
    const [customer] = await db
      .select({ id: usersTable.id, fullName: usersTable.fullName, mobile: usersTable.mobile, profileImage: usersTable.profileImage })
      .from(usersTable)
      .where(eq(usersTable.id, request.customerId))
      .limit(1);
    const [offerCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(offersTable)
      .where(eq(offersTable.requestId, id));

    return res.json({ ...request, service, governorate, area, customer, offersCount: offerCount?.count || 0 });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── PATCH /api/requests/:id ──────────────────────────────────────────────────
router.patch("/requests/:id", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status, adminNote } = req.body;

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (req.user!.role !== "admin" && req.user!.role !== "super_admin") {
      return res.status(403).json({ error: "غير مسموح" });
    }

    const oldStatus = request.status;
    const [updated] = await db
      .update(serviceRequestsTable)
      .set({ status, adminNote, updatedAt: new Date() })
      .where(eq(serviceRequestsTable.id, id))
      .returning();

    if (oldStatus !== status) {
      await db.insert(auditTrailTable).values({
        requestId: id,
        changedBy: req.user!.id,
        fieldName: "status",
        oldValue: oldStatus,
        newValue: status,
      });
    }

    return res.json(updated);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:id/cancel ───────────────────────────────────────────
router.post("/requests/:id/cancel", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { reason } = req.body;
    const user = req.user!;

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (user.role === "customer") {
      if (!["pending", "offers_received"].includes(request.status)) {
        return res.status(403).json({
          error: "لا يمكن إلغاء الطلب بعد اختيار الفني. يرجى التواصل مع الدعم الفني لإلغاء الطلب عبر الإدارة.",
        });
      }
    }

    await releaseAllPendingOfferReservations(id);

    if ((user.role === "admin" || user.role === "super_admin") && request.selectedTechnicianId) {
      const [selectedOffer] = await db
        .select()
        .from(offersTable)
        .where(and(eq(offersTable.requestId, id), eq(offersTable.status, "selected")))
        .limit(1);

      if (selectedOffer && selectedOffer.reservedPoints > 0) {
        const [profile] = await db
          .select()
          .from(technicianProfilesTable)
          .where(eq(technicianProfilesTable.userId, selectedOffer.technicianId))
          .limit(1);
        if (profile) {
          await db.update(technicianProfilesTable).set({
            reservedPoints: Math.max(0, profile.reservedPoints - selectedOffer.reservedPoints),
            updatedAt: new Date(),
          }).where(eq(technicianProfilesTable.id, profile.id));
        }
      }
    }

    let status: string;
    if (user.role === "customer") status = "cancelled_by_customer";
    else if (user.role === "technician") status = "cancelled_by_technician";
    else status = "cancelled_by_admin";

    await db
      .update(serviceRequestsTable)
      .set({ status: status as any, cancelReason: reason, updatedAt: new Date() })
      .where(eq(serviceRequestsTable.id, id));

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── GET /api/requests/:id/price-adjustment (latest pending) ──────────────────
router.get("/requests/:id/price-adjustment", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [adj] = await db
      .select()
      .from(priceAdjustmentsTable)
      .where(and(eq(priceAdjustmentsTable.requestId, id), eq(priceAdjustmentsTable.status, "pending")))
      .orderBy(desc(priceAdjustmentsTable.createdAt))
      .limit(1);
    if (!adj) return res.status(404).json({ error: "لا يوجد طلب تعديل معلق" });

    // Join technician name
    let technicianName: string | null = null;
    if (adj.technicianId) {
      const [techUser] = await db
        .select({ fullName: usersTable.fullName })
        .from(usersTable)
        .where(eq(usersTable.id, adj.technicianId))
        .limit(1);
      technicianName = techUser?.fullName || null;
    }

    return res.json({ ...adj, technicianName });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── GET /api/requests/:id/price-adjustments (full history) ───────────────────
router.get("/requests/:id/price-adjustments", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const adjustments = await db
      .select()
      .from(priceAdjustmentsTable)
      .where(eq(priceAdjustmentsTable.requestId, id))
      .orderBy(desc(priceAdjustmentsTable.createdAt));

    const result = await Promise.all(
      adjustments.map(async (adj) => {
        let technicianName: string | null = null;
        if (adj.technicianId) {
          const [techUser] = await db
            .select({ fullName: usersTable.fullName })
            .from(usersTable)
            .where(eq(usersTable.id, adj.technicianId))
            .limit(1);
          technicianName = techUser?.fullName || null;
        }
        return { ...adj, technicianName };
      })
    );

    return res.json(result);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:id/price-adjustment ──────────────────────────────────
router.post("/requests/:id/price-adjustment", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const user = req.user!;

    if (user.role !== "technician") {
      return res.status(403).json({ error: "الفنيون فقط يمكنهم طلب تعديل السعر" });
    }

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (request.selectedTechnicianId !== user.id) {
      return res.status(403).json({ error: "أنت لست الفني المختار لهذا الطلب" });
    }

    if (!["technician_selected", "in_progress"].includes(request.status)) {
      return res.status(400).json({ error: "لا يمكن طلب تعديل السعر في هذه المرحلة" });
    }

    // Block if pending adjustment already exists
    const [existingPending] = await db
      .select({ id: priceAdjustmentsTable.id })
      .from(priceAdjustmentsTable)
      .where(and(
        eq(priceAdjustmentsTable.requestId, id),
        eq(priceAdjustmentsTable.status, "pending"),
      ))
      .limit(1);

    if (existingPending) {
      return res.status(400).json({ error: "يوجد طلب تعديل سعر قيد المراجعة. يرجى انتظار رد العميل." });
    }

    const { newPrice, newSpareParts, newDescription, supportingImage } = req.body;
    if (!newPrice || parseFloat(newPrice) <= 0) {
      return res.status(400).json({ error: "السعر الجديد مطلوب ويجب أن يكون أكبر من صفر" });
    }

    // Get old offer prices
    const [selectedOffer] = await db
      .select()
      .from(offersTable)
      .where(and(eq(offersTable.requestId, id), eq(offersTable.status, "selected")))
      .limit(1);

    const oldPrice = selectedOffer ? parseFloat(selectedOffer.price as string) : null;
    const oldSpareParts = selectedOffer?.spareParts ? parseFloat(selectedOffer.spareParts as string) : null;

    const [adj] = await db.insert(priceAdjustmentsTable).values({
      requestId: id,
      technicianId: user.id,
      oldPrice: oldPrice !== null ? oldPrice.toString() : null,
      oldSpareParts: oldSpareParts !== null ? oldSpareParts.toString() : null,
      newPrice: parseFloat(newPrice).toString(),
      newSpareParts: newSpareParts ? parseFloat(newSpareParts).toString() : null,
      newDescription: newDescription || null,
      supportingImage: supportingImage || null,
      status: "pending",
    }).returning();

    await db
      .update(serviceRequestsTable)
      .set({ status: "price_change_requested", updatedAt: new Date() })
      .where(eq(serviceRequestsTable.id, id));

    // Notify customer
    await db.insert(notificationsTable).values({
      userId: request.customerId,
      title: "طلب تعديل السعر",
      body: `الفني طلب تعديل السعر للطلب رقم #${id}. السعر الجديد: ${parseFloat(newPrice)} جنيه`,
      type: "status_change" as const,
      relatedId: id,
    });

    // Audit log
    await db.insert(auditTrailTable).values({
      requestId: id,
      changedBy: user.id,
      fieldName: "price_adjustment_requested",
      oldValue: `${oldPrice || 0}`,
      newValue: `${parseFloat(newPrice)}`,
    });

    return res.json({ success: true, adjustment: adj });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:id/price-adjustment/respond ─────────────────────────
router.post("/requests/:id/price-adjustment/respond", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const user = req.user!;
    const { approved } = req.body;

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (user.role !== "customer" || request.customerId !== user.id) {
      return res.status(403).json({ error: "غير مسموح" });
    }

    const [adj] = await db
      .select()
      .from(priceAdjustmentsTable)
      .where(and(eq(priceAdjustmentsTable.requestId, id), eq(priceAdjustmentsTable.status, "pending")))
      .orderBy(desc(priceAdjustmentsTable.createdAt))
      .limit(1);

    if (!adj) {
      return res.status(404).json({ error: "لا يوجد طلب تعديل معلق" });
    }

    const now = new Date();

    if (approved) {
      // Update request agreed price to new total
      const newTotal = parseFloat(adj.newPrice as string) + (adj.newSpareParts ? parseFloat(adj.newSpareParts as string) : 0);

      await db.update(serviceRequestsTable).set({
        agreedPrice: newTotal.toString(),
        status: "in_progress",
        updatedAt: now,
      }).where(eq(serviceRequestsTable.id, id));

      // Also update the selected offer prices to match new agreed price
      if (request.selectedTechnicianId) {
        await db.update(offersTable).set({
          price: adj.newPrice as string,
          spareParts: adj.newSpareParts ? adj.newSpareParts as string : null,
          updatedAt: now,
        }).where(and(
          eq(offersTable.requestId, id),
          eq(offersTable.status, "selected"),
        ));
      }

      await db.update(priceAdjustmentsTable).set({
        status: "approved",
        decisionDate: now,
      }).where(eq(priceAdjustmentsTable.id, adj.id));

      // Notify technician
      if (request.selectedTechnicianId) {
        await db.insert(notificationsTable).values({
          userId: request.selectedTechnicianId,
          title: "تم قبول تعديل السعر",
          body: `وافق العميل على السعر الجديد للطلب #${id}: ${newTotal} جنيه`,
          type: "status_change" as const,
          relatedId: id,
        });
      }

      // Notify admins
      await notifyAdmins(
        "تعديل سعر مقبول",
        `تم قبول تعديل السعر للطلب #${id}. السعر الجديد: ${newTotal} جنيه`,
        id
      );

      // Audit
      await db.insert(auditTrailTable).values({
        requestId: id,
        changedBy: user.id,
        fieldName: "price_adjustment_approved",
        oldValue: adj.oldPrice?.toString() || "0",
        newValue: newTotal.toString(),
      });
    } else {
      // Reject — keep original pricing, move back to in_progress
      await db.update(serviceRequestsTable).set({
        status: "in_progress",
        updatedAt: now,
      }).where(eq(serviceRequestsTable.id, id));

      await db.update(priceAdjustmentsTable).set({
        status: "rejected",
        decisionDate: now,
      }).where(eq(priceAdjustmentsTable.id, adj.id));

      // Notify technician
      if (request.selectedTechnicianId) {
        await db.insert(notificationsTable).values({
          userId: request.selectedTechnicianId,
          title: "تم رفض تعديل السعر",
          body: `رفض العميل السعر الجديد للطلب #${id}. يستمر العمل بالسعر الأصلي.`,
          type: "status_change" as const,
          relatedId: id,
        });
      }

      // Audit
      await db.insert(auditTrailTable).values({
        requestId: id,
        changedBy: user.id,
        fieldName: "price_adjustment_rejected",
        oldValue: adj.oldPrice?.toString() || "0",
        newValue: adj.newPrice?.toString() || "0",
      });
    }

    return res.json({ success: true, approved });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:id/request-completion ────────────────────────────────
router.post("/requests/:id/request-completion", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const user = req.user!;

    if (user.role !== "technician") {
      return res.status(403).json({ error: "الفنيون فقط يمكنهم طلب التأكيد" });
    }

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
    if (request.selectedTechnicianId !== user.id) return res.status(403).json({ error: "أنت لست الفني المختار" });

    // Block if price adjustment is pending
    if (request.status === "price_change_requested") {
      return res.status(400).json({ error: "يوجد طلب تعديل سعر قيد مراجعة العميل. يرجى انتظار رده أولاً." });
    }

    if (!["technician_selected", "in_progress"].includes(request.status)) {
      return res.status(400).json({ error: "لا يمكن طلب التأكيد في هذه المرحلة" });
    }

    await db.update(serviceRequestsTable)
      .set({ status: "waiting_approval", updatedAt: new Date() })
      .where(eq(serviceRequestsTable.id, id));

    // Notify customer
    await db.insert(notificationsTable).values({
      userId: request.customerId,
      title: "هل تم تنفيذ الخدمة؟",
      body: `أعلن الفني إتمام تنفيذ الطلب #${id}. يرجى تأكيد أو رفض الإنجاز.`,
      type: "status_change" as const,
      relatedId: id,
    });

    // Audit
    await db.insert(auditTrailTable).values({
      requestId: id,
      changedBy: user.id,
      fieldName: "completion_requested",
      oldValue: request.status,
      newValue: "waiting_approval",
    });

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:id/complete ─────────────────────────────────────────
router.post("/requests/:id/complete", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const user = req.user!;

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (user.role === "customer" && request.customerId !== user.id) {
      return res.status(403).json({ error: "غير مسموح" });
    }

    if (request.status !== "waiting_approval") {
      return res.status(400).json({ error: "لا يمكن تأكيد الإكمال إلا بعد إشعار الفني بالإتمام" });
    }

    // Find selected offer and deduct reserved points permanently (commission)
    const [selectedOffer] = await db
      .select()
      .from(offersTable)
      .where(and(eq(offersTable.requestId, id), eq(offersTable.status, "selected")))
      .limit(1);

    if (selectedOffer && selectedOffer.reservedPoints > 0) {
      const [profile] = await db
        .select()
        .from(technicianProfilesTable)
        .where(eq(technicianProfilesTable.userId, selectedOffer.technicianId))
        .limit(1);

      if (profile) {
        const newBalance = Math.max(0, profile.pointsBalance - selectedOffer.reservedPoints);
        const newReserved = Math.max(0, profile.reservedPoints - selectedOffer.reservedPoints);

        await db.update(technicianProfilesTable).set({
          pointsBalance: newBalance,
          reservedPoints: newReserved,
          updatedAt: new Date(),
        }).where(eq(technicianProfilesTable.id, profile.id));

        await db.insert(pointTransactionsTable).values({
          technicianId: profile.id,
          amount: selectedOffer.reservedPoints,
          type: "commission",
          description: `عمولة طلب #${id}`,
          balanceAfter: newBalance,
          requestId: id,
        });
      }
    }

    await db
      .update(serviceRequestsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(serviceRequestsTable.id, id));

    // Notify technician
    if (request.selectedTechnicianId) {
      await db.insert(notificationsTable).values({
        userId: request.selectedTechnicianId,
        title: "تم إكمال الطلب",
        body: `أكد العميل إتمام تنفيذ الطلب #${id} بنجاح`,
        type: "status_change" as const,
        relatedId: id,
      });
    }

    // Audit
    await db.insert(auditTrailTable).values({
      requestId: id,
      changedBy: user.id,
      fieldName: "completion_confirmed",
      oldValue: "waiting_approval",
      newValue: "completed",
    });

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
