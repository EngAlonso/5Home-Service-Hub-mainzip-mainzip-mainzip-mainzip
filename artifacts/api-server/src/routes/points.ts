import { Router } from "express";
import { db } from "@workspace/db";
import { technicianProfilesTable, pointTransactionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/points/balance — returns total, reserved, and available
router.get("/points/balance", authenticate, async (req, res) => {
  try {
    const [profile] = await db
      .select()
      .from(technicianProfilesTable)
      .where(eq(technicianProfilesTable.userId, req.user!.id))
      .limit(1);
    if (!profile) return res.status(404).json({ error: "الفني غير موجود" });

    const available = Math.max(0, profile.pointsBalance - profile.reservedPoints);

    return res.json({
      technicianId: req.user!.id,
      balance: profile.pointsBalance,       // total
      reservedPoints: profile.reservedPoints, // locked
      available,                              // usable
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/points/transactions", authenticate, async (req, res) => {
  try {
    const { technicianId, page = "1" } = req.query as any;
    const pageNum = parseInt(page);
    const limit = 50;
    const offset = (pageNum - 1) * limit;

    const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";

    // Admin with no technicianId param → return empty list (no profile to look up)
    if (isAdmin && !technicianId) {
      return res.json([]);
    }

    let profileId: number;
    if (technicianId && isAdmin) {
      const [p] = await db.select().from(technicianProfilesTable).where(eq(technicianProfilesTable.userId, parseInt(technicianId))).limit(1);
      if (!p) return res.status(404).json({ error: "الفني غير موجود" });
      profileId = p.id;
    } else {
      const [p] = await db.select().from(technicianProfilesTable).where(eq(technicianProfilesTable.userId, req.user!.id)).limit(1);
      if (!p) return res.status(404).json({ error: "الفني غير موجود" });
      profileId = p.id;
    }

    const txns = await db
      .select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.technicianId, profileId))
      .orderBy(desc(pointTransactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json(txns);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/points/add", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { technicianId, amount, description } = req.body;
    if (!technicianId || !amount) return res.status(400).json({ error: "البيانات مطلوبة" });

    const [profile] = await db
      .select()
      .from(technicianProfilesTable)
      .where(eq(technicianProfilesTable.userId, technicianId))
      .limit(1);
    if (!profile) return res.status(404).json({ error: "الفني غير موجود" });

    const newBalance = profile.pointsBalance + parseInt(amount);
    await db.update(technicianProfilesTable).set({ pointsBalance: newBalance, updatedAt: new Date() }).where(eq(technicianProfilesTable.id, profile.id));

    await db.insert(pointTransactionsTable).values({
      technicianId: profile.id,
      amount: parseInt(amount),
      type: "credit",
      description: description || "إضافة نقاط من الإدارة",
      balanceAfter: newBalance,
      adminId: req.user!.id,
    });

    return res.json({ technicianId, balance: newBalance, available: Math.max(0, newBalance - profile.reservedPoints) });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/points/deduct", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { technicianId, amount, description } = req.body;
    if (!technicianId || !amount) return res.status(400).json({ error: "البيانات مطلوبة" });

    const [profile] = await db
      .select()
      .from(technicianProfilesTable)
      .where(eq(technicianProfilesTable.userId, technicianId))
      .limit(1);
    if (!profile) return res.status(404).json({ error: "الفني غير موجود" });

    const newBalance = Math.max(0, profile.pointsBalance - parseInt(amount));
    await db.update(technicianProfilesTable).set({ pointsBalance: newBalance, updatedAt: new Date() }).where(eq(technicianProfilesTable.id, profile.id));

    await db.insert(pointTransactionsTable).values({
      technicianId: profile.id,
      amount: parseInt(amount),
      type: "debit",
      description: description || "خصم نقاط من الإدارة",
      balanceAfter: newBalance,
      adminId: req.user!.id,
    });

    return res.json({ technicianId, balance: newBalance, available: Math.max(0, newBalance - profile.reservedPoints) });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
