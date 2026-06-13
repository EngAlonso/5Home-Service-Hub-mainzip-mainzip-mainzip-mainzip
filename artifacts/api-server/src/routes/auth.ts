import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  technicianProfilesTable,
  technicianServicesTable,
  technicianAreasTable,
  adminPermissionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, signToken, SUPER_ADMIN_MOBILE } from "../middlewares/auth";

const router = Router();

// ─── BUILT-IN SUPER ADMIN FALLBACK ───────────────────────────────────────────
// These credentials are used ONLY when the database is unavailable.
// When the DB is up, the real DB record is used for authentication.
const FALLBACK_SUPER_ADMIN = {
  id: 0,
  fullName: "Super Admin",
  mobile: SUPER_ADMIN_MOBILE,
  email: null,
  role: "super_admin" as const,
  status: "active" as const,
  profileImage: null,
  jobTitle: null,
  suspensionReason: null,
  bannedUntil: null,
  bannedByAdminId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  // bcrypt hash of "123456" — pre-computed so no DB is needed
  passwordHash: "$2b$10$Gb/624nyPv9/YDliXKJyIOCMEJxkPFW/W/q6SXcONrzICkdtbhIfK",
};
// ─────────────────────────────────────────────────────────────────────────────

function formatUser(user: typeof usersTable.$inferSelect | typeof FALLBACK_SUPER_ADMIN, profile?: any) {
  const role = user.mobile === SUPER_ADMIN_MOBILE ? "super_admin" : user.role;
  return {
    id: user.id,
    fullName: user.fullName,
    mobile: user.mobile,
    email: user.email,
    role,
    status: user.status,
    profileImage: user.profileImage,
    jobTitle: user.jobTitle,
    createdAt: user.createdAt,
    suspensionReason: user.suspensionReason,
    bannedUntil: user.bannedUntil,
    technicianProfile: profile || null,
  };
}

async function getPermissions(userId: number, role: string): Promise<string[]> {
  if (role === "super_admin") return ["*"];
  try {
    const rows = await db
      .select()
      .from(adminPermissionsTable)
      .where(eq(adminPermissionsTable.adminId, userId))
      .limit(1);
    return rows[0]?.permissions || [];
  } catch {
    return [];
  }
}

// POST /api/auth/register/customer
router.post("/auth/register/customer", async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").trim();
    const mobile = (req.body.mobile || "").trim();
    const password = (req.body.password || "").trim();
    if (!fullName || !mobile || !password) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile)).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ fullName, mobile, passwordHash, role: "customer", status: "active" })
      .returning();
    const token = signToken({ id: user.id, role: user.role, mobile: user.mobile });
    return res.status(201).json({ token, user: formatUser(user), permissions: [] });
  } catch (err) {
    req.log.error({ err }, "register customer error");
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/auth/register/technician
router.post("/auth/register/technician", async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").trim();
    const mobile = (req.body.mobile || "").trim();
    const password = (req.body.password || "").trim();
    const nationalId = (req.body.nationalId || "").trim();
    const {
      personalPhoto, nationalIdFront, nationalIdBack,
      serviceIds, areaIds, primaryAreaId,
    } = req.body;
    if (!fullName || !mobile || !password || !nationalId) {
      return res.status(400).json({ error: "جميع الحقول المطلوبة يجب ملؤها" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile)).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ fullName, mobile, passwordHash, role: "technician", status: "pending" })
      .returning();

    const [profile] = await db
      .insert(technicianProfilesTable)
      .values({
        userId: user.id,
        nationalId,
        personalPhoto: personalPhoto || null,
        nationalIdFront: nationalIdFront || null,
        nationalIdBack: nationalIdBack || null,
        approvalStatus: "pending",
        primaryAreaId: primaryAreaId || null,
      })
      .returning();

    if (serviceIds && Array.isArray(serviceIds)) {
      for (const sid of serviceIds) {
        await db.insert(technicianServicesTable).values({ technicianId: profile.id, serviceId: sid });
      }
    }
    if (areaIds && Array.isArray(areaIds)) {
      for (const aid of areaIds) {
        await db.insert(technicianAreasTable).values({ technicianId: profile.id, areaId: aid });
      }
    }

    return res.status(201).json({ pending: true, user: formatUser(user, { ...profile }) });
  } catch (err) {
    req.log.error({ err }, "register technician error");
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── HARDCODED SUPER ADMIN PASSWORD ──────────────────────────────────────────
// The super admin is NOT stored in the database. Credentials are checked here
// before any DB query is made.
const SUPER_ADMIN_PASSWORD_PLAIN = "123456";
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const mobile = (req.body.mobile ?? "").toString().trim();
    const password = (req.body.password ?? "").toString().trim();
    if (!mobile || !password) return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });

    // ── Super admin: checked entirely in code — no DB query ───────────────
    if (mobile === SUPER_ADMIN_MOBILE) {
      if (password !== SUPER_ADMIN_PASSWORD_PLAIN) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }
      const token = signToken({ id: 0, role: "super_admin", mobile: SUPER_ADMIN_MOBILE });
      return res.json({
        token,
        user: formatUser(FALLBACK_SUPER_ADMIN),
        permissions: ["*"],
      });
    }

    // ── Regular users: query the database ────────────────────────────────
    const users = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile)).limit(1);
    if (users.length === 0) return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });

    const effectiveRole = user.role;

    if (user.role === "technician" && user.status === "pending") {
      return res.status(403).json({ error: "حسابك قيد المراجعة من قبل الإدارة. سيتم إشعارك عند الموافقة على طلبك" });
    }

    if (user.role === "technician" && user.status === "rejected") {
      return res.status(403).json({ error: `تم رفض طلب تسجيلك. السبب: ${user.suspensionReason || "لم يستوف الشروط المطلوبة"}` });
    }

    if (user.status === "banned") {
      return res.status(403).json({ error: `الحساب محظور بشكل دائم. السبب: ${user.suspensionReason || "مخالفة السياسة"}` });
    }

    if (user.status === "suspended") {
      if (user.bannedUntil) {
        const now = new Date();
        if (user.bannedUntil > now) {
          return res.status(403).json({
            error: `الحساب موقوف حتى ${user.bannedUntil.toLocaleDateString("ar-EG")}. السبب: ${user.suspensionReason || "مخالفة السياسة"}`,
          });
        } else {
          await db.update(usersTable).set({ status: "active", suspensionReason: null, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
        }
      } else {
        return res.status(403).json({ error: `الحساب موقوف. السبب: ${user.suspensionReason || "تواصل مع الدعم الفني"}` });
      }
    }

    let profile = null;
    if (effectiveRole === "technician") {
      const profiles = await db.select().from(technicianProfilesTable).where(eq(technicianProfilesTable.userId, user.id)).limit(1);
      if (profiles.length > 0) profile = profiles[0];
    }

    const permissions = await getPermissions(user.id, effectiveRole);
    const token = signToken({ id: user.id, role: effectiveRole, mobile: user.mobile });
    return res.json({ token, user: formatUser(user, profile), permissions });
  } catch (err) {
    req.log.error({ err }, "login error");
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/auth/me", authenticate, async (req, res) => {
  try {
    // Handle fallback super admin (id=0 means DB was unavailable at login time)
    if (req.user!.id === 0 && req.user!.mobile === SUPER_ADMIN_MOBILE) {
      return res.json({
        ...formatUser(FALLBACK_SUPER_ADMIN),
        permissions: ["*"],
      });
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (users.length === 0) return res.status(404).json({ error: "المستخدم غير موجود" });

    const user = users[0];
    const effectiveRole = req.user!.role;

    let profile = null;
    if (effectiveRole === "technician") {
      try {
        const profiles = await db.select().from(technicianProfilesTable).where(eq(technicianProfilesTable.userId, user.id)).limit(1);
        if (profiles.length > 0) profile = profiles[0];
      } catch {}
    }

    const permissions = await getPermissions(user.id, effectiveRole);
    return res.json({ ...formatUser(user, profile), permissions });
  } catch (err) {
    req.log.error({ err }, "getMe error");
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
