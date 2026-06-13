import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, technicianProfilesTable, serviceRequestsTable,
  pointTransactionsTable, servicesTable, ratingsTable, activityLogsTable,
  adminPermissionsTable,
} from "@workspace/db";
import { eq, sql, and, desc, gte, count, avg, sum } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/analytics/overview", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const [customers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "customer"));
    const [allTechs] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "technician"));
    const [pendingApprovals] = await db.select({ count: sql<number>`count(*)::int` }).from(technicianProfilesTable).where(eq(technicianProfilesTable.approvalStatus, "pending"));
    const [activeTechs] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.role, "technician"), eq(usersTable.status, "active")));
    const [suspendedTechs] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.role, "technician"), eq(usersTable.status, "suspended")));
    const [totalReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable);
    const [openReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(sql`status NOT IN ('completed','cancelled_by_customer','cancelled_by_technician','cancelled_by_admin')`);
    const [completedReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "completed"));
    const [cancelledReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(sql`status IN ('cancelled_by_customer','cancelled_by_technician','cancelled_by_admin')`);
    const [disputedReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "disputed"));

    return res.json({
      totalCustomers: customers.count,
      totalTechnicians: allTechs.count,
      pendingApprovals: pendingApprovals.count,
      activeTechnicians: activeTechs.count,
      suspendedTechnicians: suspendedTechs.count,
      totalRequests: totalReqs.count,
      openRequests: openReqs.count,
      completedRequests: completedReqs.count,
      cancelledRequests: cancelledReqs.count,
      disputedRequests: disputedReqs.count,
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/analytics/financial", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { period = "month" } = req.query as any;

    const [commissionTotals] = await db
      .select({ total: sql<number>`COALESCE(sum(amount)::numeric, 0)::float` })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.type, "commission"));

    const [addedTotals] = await db
      .select({ total: sql<number>`COALESCE(sum(amount)::numeric, 0)::int` })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.type, "credit"));

    const [deductedTotals] = await db
      .select({ total: sql<number>`COALESCE(sum(amount)::numeric, 0)::int` })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.type, "debit"));

    // Revenue chart based on period
    const truncFn = period === "day" ? "hour" : period === "week" ? "day" : period === "year" ? "month" : "day";
    const revenueByPeriod = await db.execute(
      sql`SELECT date_trunc(${truncFn}, created_at) as label, COALESCE(sum(amount)::numeric, 0)::float as value
          FROM point_transactions WHERE type = 'commission'
          GROUP BY date_trunc(${truncFn}, created_at) ORDER BY label ASC LIMIT 30`
    );

    return res.json({
      totalCommission: commissionTotals.total || 0,
      totalPointsAdded: addedTotals.total || 0,
      totalPointsDeducted: deductedTotals.total || 0,
      revenue: commissionTotals.total || 0,
      revenueByPeriod: (revenueByPeriod.rows as any[]).map((r) => ({
        label: new Date(r.label).toLocaleDateString("ar-EG"),
        value: parseFloat(r.value) || 0,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/analytics/requests-chart", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { period = "month" } = req.query as any;
    const truncFn = period === "day" ? "hour" : period === "week" ? "day" : period === "year" ? "month" : "day";

    const result = await db.execute(
      sql`SELECT date_trunc(${truncFn}, created_at) as label, count(*)::int as value
          FROM service_requests GROUP BY date_trunc(${truncFn}, created_at) ORDER BY label ASC LIMIT 30`
    );

    return res.json((result.rows as any[]).map((r) => ({
      label: new Date(r.label).toLocaleDateString("ar-EG"),
      value: parseInt(r.value) || 0,
    })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/analytics/top-technicians", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT u.id, u.full_name as "fullName", u.profile_image as "profileImage",
             COUNT(sr.id)::int as "completedJobs",
             COALESCE(AVG(r.stars), 0)::float as "averageRating",
             COALESCE(SUM(pt.amount), 0)::float as "totalEarned"
      FROM users u
      LEFT JOIN service_requests sr ON sr.selected_technician_id = u.id AND sr.status = 'completed'
      LEFT JOIN ratings r ON r.technician_id = u.id
      LEFT JOIN technician_profiles tp ON tp.user_id = u.id
      LEFT JOIN point_transactions pt ON pt.technician_id = tp.id AND pt.type = 'commission'
      WHERE u.role = 'technician'
      GROUP BY u.id, u.full_name, u.profile_image
      ORDER BY "completedJobs" DESC LIMIT 10
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/analytics/top-services", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT s.id, s.name_ar as "nameAr",
             COUNT(sr.id)::int as "requestCount",
             COUNT(CASE WHEN sr.status = 'completed' THEN 1 END)::int as "completedCount"
      FROM services s
      LEFT JOIN service_requests sr ON sr.service_id = s.id
      GROUP BY s.id, s.name_ar
      ORDER BY "requestCount" DESC LIMIT 10
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/admin/quick-stats", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const [pendingApprovals] = await db.select({ count: sql<number>`count(*)::int` }).from(technicianProfilesTable).where(eq(technicianProfilesTable.approvalStatus, "pending"));
    const [openRequests] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(sql`status IN ('pending','offers_received','technician_selected','in_progress')`);
    const [disputedRequests] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "disputed"));
    const [newComplaints] = await db.select({ count: sql<number>`count(*)::int` }).from(activityLogsTable).where(sql`created_at > NOW() - INTERVAL '24 hours'`);
    const [lowBalance] = await db.select({ count: sql<number>`count(*)::int` }).from(technicianProfilesTable).where(sql`points_balance < 50`);
    const [staleReqs] = await db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable).where(sql`status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'`);

    return res.json({
      pendingApprovals: pendingApprovals.count,
      newComplaints: newComplaints.count,
      openRequests: openRequests.count,
      disputedRequests: disputedRequests.count,
      lowBalanceTechnicians: lowBalance.count,
      staleRequests: staleReqs.count,
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/admin/activity-logs", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1" } = req.query as any;
    const offset = (parseInt(page) - 1) * 50;
    const rows = await db
      .select({ log: activityLogsTable, admin: usersTable })
      .from(activityLogsTable)
      .leftJoin(usersTable, eq(activityLogsTable.adminId, usersTable.id))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(50)
      .offset(offset);

    return res.json(rows.map(({ log, admin }) => ({
      ...log,
      admin: admin ? { id: admin.id, fullName: admin.fullName } : null,
    })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/admin/staff", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const staff = await db
      .select({ user: usersTable, perms: adminPermissionsTable })
      .from(usersTable)
      .leftJoin(adminPermissionsTable, eq(adminPermissionsTable.adminId, usersTable.id))
      .where(sql`${usersTable.role} IN ('admin', 'super_admin')`);
    return res.json(staff.map(({ user: u, perms }) => ({
      id: u.id, fullName: u.fullName, mobile: u.mobile, email: u.email,
      role: u.role, status: u.status, jobTitle: u.jobTitle, createdAt: u.createdAt,
      permissions: u.role === "super_admin" ? ["*"] : (perms?.permissions || []),
    })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/admin/staff", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { fullName, mobile, email, password, jobTitle, permissions } = req.body;
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ fullName, mobile, email, passwordHash, role: "admin", status: "active", jobTitle })
      .returning();
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      await db.insert(adminPermissionsTable).values({ adminId: user.id, permissions });
    }
    return res.status(201).json({
      id: user.id, fullName: user.fullName, mobile: user.mobile, email: user.email,
      role: user.role, status: user.status, permissions: permissions || [],
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/admin/staff/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { fullName, mobile, email, jobTitle, password, permissions } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (fullName) updates.fullName = fullName;
    if (mobile) updates.mobile = mobile;
    if (email !== undefined) updates.email = email;
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (password && password.trim().length >= 6) {
      const bcrypt = await import("bcryptjs");
      updates.passwordHash = await bcrypt.default.hash(password, 10);
    }
    await db.update(usersTable).set(updates as any).where(eq(usersTable.id, id));
    if (permissions !== undefined) {
      const existing = await db.select().from(adminPermissionsTable).where(eq(adminPermissionsTable.adminId, id)).limit(1);
      if (existing.length > 0) {
        await db.update(adminPermissionsTable).set({ permissions, updatedAt: new Date() }).where(eq(adminPermissionsTable.adminId, id));
      } else {
        await db.insert(adminPermissionsTable).values({ adminId: id, permissions });
      }
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/admin/staff/:id/permissions", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { permissions } = req.body;
    const existing = await db.select().from(adminPermissionsTable).where(eq(adminPermissionsTable.adminId, id)).limit(1);
    if (existing.length > 0) {
      await db.update(adminPermissionsTable).set({ permissions, updatedAt: new Date() }).where(eq(adminPermissionsTable.adminId, id));
    } else {
      await db.insert(adminPermissionsTable).values({ adminId: id, permissions });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/admin/staff/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.delete(adminPermissionsTable).where(eq(adminPermissionsTable.adminId, id));
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
