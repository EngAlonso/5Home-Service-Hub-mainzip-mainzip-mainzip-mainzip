import { Router } from "express";
import { db } from "@workspace/db";
import {
  offersTable, serviceRequestsTable, usersTable,
  technicianProfilesTable, commissionRangesTable, areasTable, pointTransactionsTable,
  notificationsTable, ratingsTable, auditTrailTable, servicesTable,
} from "@workspace/db";
import { eq, and, avg, count, desc, ne, isNull, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

// ─── Helper: release reserved points and log the release ──────────────────────
async function releaseReservedForOffers(
  offers: Array<{ id: number; technicianId: number; reservedPoints: number; requestId?: number }>,
  reason = "استرداد نقاط محجوزة"
) {
  for (const offer of offers) {
    if (offer.reservedPoints <= 0) continue;

    const [profile] = await db
      .select({ id: technicianProfilesTable.id, reservedPoints: technicianProfilesTable.reservedPoints, pointsBalance: technicianProfilesTable.pointsBalance })
      .from(technicianProfilesTable)
      .where(eq(technicianProfilesTable.userId, offer.technicianId))
      .limit(1);
    if (!profile) continue;

    const newReserved = Math.max(0, profile.reservedPoints - offer.reservedPoints);
    await db.update(technicianProfilesTable)
      .set({ reservedPoints: newReserved, updatedAt: new Date() })
      .where(eq(technicianProfilesTable.id, profile.id));

    // Log the release transaction
    await db.insert(pointTransactionsTable).values({
      technicianId: profile.id,
      amount: offer.reservedPoints,
      type: "release",
      description: `${reason}${offer.requestId ? ` — طلب #${offer.requestId}` : ""}`,
      balanceAfter: profile.pointsBalance, // balance doesn't change on release, only reserved
      requestId: offer.requestId || null,
    });
  }
}

// ─── Helper: resolve commission range → total required points ─────────────────
// Priority: service-specific range → global range (service_id IS NULL).
// Only active ranges are considered.
// Commission types:
//   fixed      → commissionValue points (integer)
//   percentage → ceil((laborPrice × commissionValue) / 100) points
// Total = commission result + area.extraPoints.
// Returns null if no matching active range exists for the given price.
// Exported so price-adjustment approval in requests.ts can re-run the same logic.
export async function resolveCommissionRange(
  serviceId: number,
  laborPrice: number,
  areaId: number | null
): Promise<number | null> {
  // 1. Service-specific active range covering this labor price
  const [specific] = await db
    .select()
    .from(commissionRangesTable)
    .where(and(
      eq(commissionRangesTable.serviceId, serviceId),
      eq(commissionRangesTable.isActive, true),
      sql`${commissionRangesTable.minPrice} <= ${laborPrice}`,
      sql`${commissionRangesTable.maxPrice} >= ${laborPrice}`,
    ))
    .limit(1);

  // 2. Global active range (service_id IS NULL) covering this labor price
  const rangeRow = specific ?? await (async () => {
    const [global] = await db
      .select()
      .from(commissionRangesTable)
      .where(and(
        isNull(commissionRangesTable.serviceId),
        eq(commissionRangesTable.isActive, true),
        sql`${commissionRangesTable.minPrice} <= ${laborPrice}`,
        sql`${commissionRangesTable.maxPrice} >= ${laborPrice}`,
      ))
      .limit(1);
    return global ?? null;
  })();

  if (!rangeRow) return null;

  // 3. Calculate commission points based on type
  const commType = rangeRow.commissionType ?? "fixed";
  const commValue = parseFloat(rangeRow.commissionValue as string ?? "0") || rangeRow.requiredPoints;

  let commissionPoints: number;
  if (commType === "percentage") {
    commissionPoints = Math.ceil((laborPrice * commValue) / 100);
  } else {
    commissionPoints = Math.round(commValue) || rangeRow.requiredPoints;
  }

  // 4. Area extra points
  let areaExtra = 0;
  if (areaId) {
    const [area] = await db
      .select({ extraPoints: areasTable.extraPoints })
      .from(areasTable)
      .where(eq(areasTable.id, areaId))
      .limit(1);
    areaExtra = area?.extraPoints ?? 0;
  }

  return commissionPoints + areaExtra;
}

// ─── GET /api/offers/my ───────────────────────────────────────────────────────
// Returns all offers submitted by the logged-in technician
router.get("/offers/my", authenticate, async (req, res) => {
  try {
    if (req.user!.role !== "technician") {
      return res.status(403).json({ error: "الفنيون فقط يمكنهم الوصول لهذا المسار" });
    }

    const offers = await db
      .select()
      .from(offersTable)
      .where(eq(offersTable.technicianId, req.user!.id))
      .orderBy(desc(offersTable.createdAt));

    // Enrich each offer with service name from the request
    const enriched = await Promise.all(
      offers.map(async (offer) => {
        const [request] = await db
          .select({ id: serviceRequestsTable.id, status: serviceRequestsTable.status, serviceId: serviceRequestsTable.serviceId })
          .from(serviceRequestsTable)
          .where(eq(serviceRequestsTable.id, offer.requestId))
          .limit(1);

        const service = request
          ? await db
              .select({ id: servicesTable.id, name: servicesTable.name })
              .from(servicesTable)
              .where(eq(servicesTable.id, request.serviceId))
              .limit(1)
              .then((r) => r[0] ?? null)
          : null;

        return {
          ...offer,
          price: parseFloat(offer.price as string),
          spareParts: offer.spareParts ? parseFloat(offer.spareParts as string) : 0,
          requestStatus: request?.status ?? null,
          service: service ?? null,
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── GET /api/requests/:requestId/offers ──────────────────────────────────────
router.get("/requests/:requestId/offers", authenticate, async (req, res) => {
  try {
    const requestId = parseInt(req.params["requestId"] as string);
    const offers = await db
      .select()
      .from(offersTable)
      .where(eq(offersTable.requestId, requestId))
      .orderBy(offersTable.createdAt);

    const result = await Promise.all(
      offers.map(async (offer) => {
        const [tech] = await db
          .select({
            id: usersTable.id,
            fullName: usersTable.fullName,
            profileImage: usersTable.profileImage,
            mobile: usersTable.mobile,
          })
          .from(usersTable)
          .where(eq(usersTable.id, offer.technicianId))
          .limit(1);

        const ratingStats = await db
          .select({ avg: avg(ratingsTable.stars), count: count() })
          .from(ratingsTable)
          .where(eq(ratingsTable.technicianId, offer.technicianId));

        const laborPrice = parseFloat(offer.price as string);
        const sparePartsPrice = offer.spareParts ? parseFloat(offer.spareParts as string) : 0;

        return {
          ...offer,
          price: laborPrice,
          spareParts: sparePartsPrice,
          totalPrice: laborPrice + sparePartsPrice,
          technician: tech
            ? {
                ...tech,
                averageRating: parseFloat(ratingStats[0]?.avg ?? "0"),
                reviewCount: ratingStats[0]?.count ?? 0,
              }
            : null,
        };
      })
    );

    return res.json(result);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:requestId/offers ─────────────────────────────────────
router.post("/requests/:requestId/offers", authenticate, async (req, res) => {
  try {
    if (req.user!.role !== "technician") {
      return res.status(403).json({ error: "الفنيون فقط يمكنهم تقديم عروض" });
    }

    const [profile] = await db
      .select()
      .from(technicianProfilesTable)
      .where(eq(technicianProfilesTable.userId, req.user!.id))
      .limit(1);

    if (!profile) return res.status(404).json({ error: "الفني غير موجود" });
    if (profile.approvalStatus !== "approved") {
      return res.status(403).json({ error: "حسابك لم يتم الموافقة عليه بعد. لا يمكنك تقديم عروض حتى تتم مراجعة طلبك." });
    }

    const requestId = parseInt(req.params["requestId"] as string);
    const { price, spareParts, notes } = req.body;
    if (!price) return res.status(400).json({ error: "سعر الخدمة مطلوب" });

    const laborPrice = parseFloat(price);
    if (isNaN(laborPrice) || laborPrice <= 0) {
      return res.status(400).json({ error: "سعر الخدمة يجب أن يكون أكبر من صفر" });
    }

    // Prevent duplicate offer
    const existing = await db
      .select()
      .from(offersTable)
      .where(and(eq(offersTable.requestId, requestId), eq(offersTable.technicianId, req.user!.id)))
      .limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "لقد قدمت عرضاً لهذا الطلب مسبقاً" });

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, requestId)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (!["pending", "offers_received"].includes(request.status)) {
      return res.status(400).json({ error: "لا يمكن تقديم عرض على هذا الطلب بعد الآن" });
    }

    // Commission uses range-based rules: find matching price bracket then add area extra points.
    // Priority: service-specific range → global range (service_id IS NULL).
    const requiredPoints = await resolveCommissionRange(request.serviceId, laborPrice, request.areaId ?? null);

    if (requiredPoints === null) {
      req.log.warn(
        { serviceId: request.serviceId, laborPrice, requestId },
        "offer submission blocked: no commission range covers this price"
      );
      return res.status(400).json({
        error: "لا يوجد نطاق عمولة محدد لهذا السعر، يرجى التواصل مع الإدارة",
      });
    }

    // Available balance = total balance – already reserved
    const availableBalance = profile.pointsBalance - profile.reservedPoints;
    if (availableBalance < requiredPoints) {
      return res.status(400).json({
        error: "رصيد النقاط الحالي غير كافٍ لتقديم عرض على هذه الخدمة",
      });
    }

    // Reserve points immediately
    const newReserved = profile.reservedPoints + requiredPoints;
    await db
      .update(technicianProfilesTable)
      .set({ reservedPoints: newReserved, updatedAt: new Date() })
      .where(eq(technicianProfilesTable.id, profile.id));

    const [offer] = await db
      .insert(offersTable)
      .values({
        requestId,
        technicianId: req.user!.id,
        price: laborPrice.toString(),
        spareParts: spareParts ? parseFloat(spareParts).toString() : null,
        notes,
        status: "pending",
        reservedPoints: requiredPoints,
      })
      .returning();

    // Note: reserving points locks them but doesn't change the actual balance.
    // A "commission" transaction is written at completion when points are finally deducted.

    // Update request status to offers_received
    await db
      .update(serviceRequestsTable)
      .set({ status: "offers_received", updatedAt: new Date() })
      .where(eq(serviceRequestsTable.id, requestId));

    // Audit log
    await db.insert(auditTrailTable).values({
      requestId,
      changedBy: req.user!.id,
      fieldName: "offer_submitted",
      oldValue: "0",
      newValue: laborPrice.toString(),
    });

    // Notify customer
    await db.insert(notificationsTable).values({
      userId: request.customerId,
      title: "عرض سعر جديد",
      body: `قدّم فني عرض سعر جديد على طلبك بقيمة ${laborPrice} جنيه${spareParts ? ` + ${parseFloat(spareParts)} جنيه قطع غيار` : ""}`,
      type: "new_offer",
      relatedId: requestId,
    });

    return res.status(201).json(offer);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── PATCH /api/requests/:requestId/offers/:offerId ───────────────────────────
router.patch("/requests/:requestId/offers/:offerId", authenticate, async (req, res) => {
  try {
    const requestId = parseInt(req.params["requestId"] as string);
    const offerId = parseInt(req.params["offerId"] as string);
    const { price, spareParts, notes } = req.body;

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, requestId)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    if (!["pending", "offers_received"].includes(request.status)) {
      return res.status(403).json({ error: "لا يمكن تعديل العرض بعد اختيار الفني" });
    }

    const [offer] = await db
      .select()
      .from(offersTable)
      .where(and(eq(offersTable.id, offerId), eq(offersTable.technicianId, req.user!.id)))
      .limit(1);
    if (!offer) return res.status(404).json({ error: "العرض غير موجود" });

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (notes !== undefined) updates.notes = notes;
    if (spareParts !== undefined) updates.spareParts = spareParts ? parseFloat(spareParts).toString() : null;

    // If price changed, recalculate point reservation
    if (price !== undefined) {
      const newLaborPrice = parseFloat(price);
      if (isNaN(newLaborPrice) || newLaborPrice <= 0) {
        return res.status(400).json({ error: "سعر الخدمة يجب أن يكون أكبر من صفر" });
      }

      const newRequired = await resolveCommissionRange(request.serviceId, newLaborPrice, request.areaId ?? null);
      if (newRequired === null) {
        return res.status(400).json({ error: "لا يوجد نطاق عمولة محدد لهذا السعر" });
      }
      const oldRequired = offer.reservedPoints;
      const diff = newRequired - oldRequired;

      if (diff !== 0) {
        const [profile] = await db
          .select()
          .from(technicianProfilesTable)
          .where(eq(technicianProfilesTable.userId, req.user!.id))
          .limit(1);

        if (!profile) return res.status(404).json({ error: "الفني غير موجود" });

        if (diff > 0) {
          const available = profile.pointsBalance - profile.reservedPoints;
          if (available < diff) {
            return res.status(400).json({ error: `رصيد النقاط غير كافٍ لزيادة السعر. مطلوب ${diff} نقطة إضافية، المتاح: ${available}` });
          }
        }

        await db
          .update(technicianProfilesTable)
          .set({ reservedPoints: profile.reservedPoints + diff, updatedAt: new Date() })
          .where(eq(technicianProfilesTable.id, profile.id));

        // Reservation adjustment: only locked amount changes; actual balance unchanged.

        updates.reservedPoints = newRequired;
      }

      updates.price = newLaborPrice.toString();
    }

    const [updated] = await db
      .update(offersTable)
      .set(updates as any)
      .where(eq(offersTable.id, offerId))
      .returning();

    return res.json(updated);
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── POST /api/requests/:requestId/offers/:offerId/select ─────────────────────
router.post("/requests/:requestId/offers/:offerId/select", authenticate, async (req, res) => {
  try {
    if (req.user!.role !== "customer") return res.status(403).json({ error: "العملاء فقط يمكنهم اختيار الفني" });

    const requestId = parseInt(req.params["requestId"] as string);
    const offerId = parseInt(req.params["offerId"] as string);

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, requestId)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
    if (request.customerId !== req.user!.id) return res.status(403).json({ error: "غير مسموح" });

    const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId)).limit(1);
    if (!offer) return res.status(404).json({ error: "العرض غير موجود" });
    if (offer.requestId !== requestId) return res.status(400).json({ error: "هذا العرض لا ينتمي لهذا الطلب" });

    // Get all other pending offers to reject + release their reserved points
    const pendingOthers = await db
      .select({
        id: offersTable.id,
        technicianId: offersTable.technicianId,
        reservedPoints: offersTable.reservedPoints,
        requestId: offersTable.requestId,
      })
      .from(offersTable)
      .where(and(
        eq(offersTable.requestId, requestId),
        eq(offersTable.status, "pending"),
        ne(offersTable.id, offerId),
      ));

    // Reject other offers
    if (pendingOthers.length > 0) {
      await db
        .update(offersTable)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(and(
          eq(offersTable.requestId, requestId),
          eq(offersTable.status, "pending"),
          ne(offersTable.id, offerId),
        ));

      // Release their reserved points + log the release
      await releaseReservedForOffers(pendingOthers, "اختار العميل فنياً آخر — استرداد نقاط محجوزة");
    }

    // Select the winning offer (do NOT deduct yet — deducted at completion)
    await db.update(offersTable)
      .set({ status: "selected", updatedAt: new Date() })
      .where(eq(offersTable.id, offerId));

    const totalAgreedPrice = parseFloat(offer.price as string) + (offer.spareParts ? parseFloat(offer.spareParts as string) : 0);

    await db.update(serviceRequestsTable).set({
      status: "technician_selected",
      selectedTechnicianId: offer.technicianId,
      agreedPrice: totalAgreedPrice.toString(),
      updatedAt: new Date(),
    }).where(eq(serviceRequestsTable.id, requestId));

    // Audit log
    await db.insert(auditTrailTable).values({
      requestId,
      changedBy: req.user!.id,
      fieldName: "technician_selected",
      oldValue: "offers_received",
      newValue: String(offer.technicianId),
    });

    // Notify selected technician
    await db.insert(notificationsTable).values({
      userId: offer.technicianId,
      title: "🎉 تم اختيارك!",
      body: "تم قبول عرضك من قبل العميل. يرجى التواصل مع العميل لبدء تنفيذ الطلب",
      type: "technician_selected",
      relatedId: requestId,
    });

    // Notify rejected technicians
    if (pendingOthers.length > 0) {
      await db.insert(notificationsTable).values(
        pendingOthers.map((o) => ({
          userId: o.technicianId,
          title: "تم اختيار فني آخر",
          body: "للأسف، اختار العميل فنياً آخر لهذا الطلب. تم استرداد نقاطك المحجوزة.",
          type: "status_change" as const,
          relatedId: requestId,
        }))
      );
    }

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
