import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  technicianProfilesTable,
  technicianServicesTable,
  technicianAreasTable,
  servicesTable,
  areasTable,
  ratingsTable,
} from "@workspace/db";
import { eq, like, and, or, sql, avg, count, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

function formatUser(user: any, profile?: any) {
  return {
    id: user.id,
    fullName: user.fullName,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    status: user.status,
    profileImage: user.profileImage,
    jobTitle: user.jobTitle,
    createdAt: user.createdAt,
    suspensionReason: user.suspensionReason,
    bannedUntil: user.bannedUntil,
    technicianProfile: profile || null,
  };
}

// GET /api/users
router.get("/users", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { role, status, search, page = "1", limit = "20" } = req.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let conditions: any[] = [];
    if (role) conditions.push(eq(usersTable.role, role));
    if (status) conditions.push(eq(usersTable.status, status));
    if (search) {
      conditions.push(or(like(usersTable.fullName, `%${search}%`), like(usersTable.mobile, `%${search}%`)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(usersTable).where(where);
    const users = await db.select().from(usersTable).where(where).limit(limitNum).offset(offset).orderBy(usersTable.createdAt);

    return res.json({ data: users.map((u) => formatUser(u)), total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// GET /api/users/:id
router.get("/users/:id", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (req.user!.role === "customer" && req.user!.id !== id) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    return res.json(formatUser(user));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// PATCH /api/users/:id (self-edit)
router.patch("/users/:id", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (req.user!.role !== "admin" && req.user!.role !== "super_admin" && req.user!.id !== id) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    const { fullName, email, profileImage, jobTitle } = req.body;
    const [user] = await db.update(usersTable).set({ fullName, email, profileImage, jobTitle, updatedAt: new Date() }).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    return res.json(formatUser(user));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// PATCH /api/users/:id/admin-edit (admin full edit)
router.patch("/users/:id/admin-edit", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { fullName, mobile, email, newPassword } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (fullName) updates.fullName = fullName;
    if (mobile) updates.mobile = mobile;
    if (email !== undefined) updates.email = email;
    if (newPassword && newPassword.trim().length >= 6) {
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    const [user] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    return res.json(formatUser(user));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/users/:id/ban
router.post("/users/:id/ban", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { type, days, reason } = req.body;
    const updates: Record<string, any> = {
      suspensionReason: reason || null,
      bannedByAdminId: req.user!.id,
      updatedAt: new Date(),
    };
    if (type === "permanent") {
      updates.status = "banned";
      updates.bannedUntil = null;
    } else {
      updates.status = "suspended";
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + (parseInt(days) || 1));
      updates.bannedUntil = bannedUntil;
    }
    await db.update(usersTable).set(updates as any).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/users/:id/unban
router.post("/users/:id/unban", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.update(usersTable).set({ status: "active", suspensionReason: null, bannedUntil: null, updatedAt: new Date() } as any).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/users/:id/suspend (legacy)
router.post("/users/:id/suspend", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { reason } = req.body;
    await db.update(usersTable).set({ status: "suspended", suspensionReason: reason, updatedAt: new Date() }).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/users/:id/activate
router.post("/users/:id/activate", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.update(usersTable).set({ status: "active", suspensionReason: null, bannedUntil: null, updatedAt: new Date() } as any).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// GET /api/technicians/pending
router.get("/technicians/pending", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const profiles = await db
      .select({ profile: technicianProfilesTable, user: usersTable })
      .from(technicianProfilesTable)
      .leftJoin(usersTable, eq(technicianProfilesTable.userId, usersTable.id))
      .where(eq(technicianProfilesTable.approvalStatus, "pending"));
    return res.json(profiles.map(({ profile, user }) => ({ ...profile, user: user ? formatUser(user) : null })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/technicians/:id/approve
router.post("/technicians/:id/approve", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [profile] = await db.update(technicianProfilesTable).set({ approvalStatus: "approved", updatedAt: new Date() }).where(eq(technicianProfilesTable.userId, id)).returning();
    if (!profile) return res.status(404).json({ error: "الفني غير موجود" });
    await db.update(usersTable).set({ status: "active", updatedAt: new Date() }).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/technicians/:id/reject
router.post("/technicians/:id/reject", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { reason } = req.body;
    await db.update(technicianProfilesTable).set({
      approvalStatus: "rejected",
      rejectionReason: reason || "لم يستوف الشروط",
      rejectedByAdminId: req.user!.id,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(technicianProfilesTable.userId, id));
    await db.update(usersTable).set({ status: "rejected", updatedAt: new Date() }).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// GET /api/technicians/approved
router.get("/technicians/approved", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const profiles = await db
      .select({ profile: technicianProfilesTable, user: usersTable })
      .from(technicianProfilesTable)
      .leftJoin(usersTable, eq(technicianProfilesTable.userId, usersTable.id))
      .where(eq(technicianProfilesTable.approvalStatus, "approved"))
      .orderBy(desc(technicianProfilesTable.updatedAt));
    return res.json(profiles.map(({ profile, user }) => ({ ...profile, user: user ? formatUser(user) : null })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// GET /api/technicians/rejected
router.get("/technicians/rejected", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const profiles = await db
      .select({ profile: technicianProfilesTable, user: usersTable })
      .from(technicianProfilesTable)
      .leftJoin(usersTable, eq(technicianProfilesTable.userId, usersTable.id))
      .where(eq(technicianProfilesTable.approvalStatus, "rejected"))
      .orderBy(desc(technicianProfilesTable.updatedAt));
    return res.json(profiles.map(({ profile, user }) => ({ ...profile, user: user ? formatUser(user) : null })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/technicians/:id/restore
router.post("/technicians/:id/restore", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.update(technicianProfilesTable).set({
      approvalStatus: "pending",
      rejectionReason: null,
      rejectedByAdminId: null,
      rejectedAt: null,
      updatedAt: new Date(),
    } as any).where(eq(technicianProfilesTable.userId, id));
    await db.update(usersTable).set({ status: "pending", updatedAt: new Date() }).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// DELETE /api/technicians/:id/permanent-delete
router.delete("/technicians/:id/permanent-delete", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    // Hard-delete: cascade will handle profile
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// GET /api/technicians/:id/profile
router.get("/technicians/:id/profile", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [profileRow] = await db.select().from(technicianProfilesTable).where(eq(technicianProfilesTable.userId, id)).limit(1);
    if (!profileRow) return res.status(404).json({ error: "الفني غير موجود" });

    const techServices = await db.select({ service: servicesTable }).from(technicianServicesTable).leftJoin(servicesTable, eq(technicianServicesTable.serviceId, servicesTable.id)).where(eq(technicianServicesTable.technicianId, profileRow.id));
    const techAreas = await db.select({ area: areasTable }).from(technicianAreasTable).leftJoin(areasTable, eq(technicianAreasTable.areaId, areasTable.id)).where(eq(technicianAreasTable.technicianId, profileRow.id));
    const ratingStats = await db.select({ avg: avg(ratingsTable.stars), count: count() }).from(ratingsTable).where(eq(ratingsTable.technicianId, id));

    return res.json({
      ...profileRow,
      services: techServices.map((r) => r.service).filter(Boolean),
      areas: techAreas.map((r) => r.area).filter(Boolean),
      averageRating: parseFloat(ratingStats[0]?.avg ?? "0"),
      reviewCount: ratingStats[0]?.count ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
