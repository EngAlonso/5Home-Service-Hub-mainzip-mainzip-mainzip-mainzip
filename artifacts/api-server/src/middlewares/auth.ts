import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "fnashha-secret-key-2024";

// ─── SUPER ADMIN OVERRIDE ────────────────────────────────────────────────────
// The user with this mobile number is always treated as super_admin regardless
// of what is stored in the database. This override is applied at every point
// where the authenticated user's identity is established.
export const SUPER_ADMIN_MOBILE = "01200229946";

function applySuperAdminOverride(user: AuthUser): AuthUser {
  if (user.mobile === SUPER_ADMIN_MOBILE) {
    return { ...user, role: "super_admin" };
  }
  return user;
}
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  role: string;
  mobile: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(payload: AuthUser): string {
  // Always encode the correct role in the token — super admin override applied here too
  return jwt.sign(applySuperAdminOverride(payload), JWT_SECRET, { expiresIn: "30d" });
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Apply override on every request — ensures super admin access even for
    // tokens that were issued before this override existed
    req.user = applySuperAdminOverride(payload);
    next();
  } catch {
    res.status(401).json({ error: "رمز الجلسة غير صالح" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "غير مصرح" });
      return;
    }
    // super_admin always passes any role check
    if (req.user.role === "super_admin" || roles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ error: "ليس لديك صلاحية" });
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = applySuperAdminOverride(payload);
    } catch {}
  }
  next();
}

export async function logActivity(
  _adminId: number,
  _action: string,
  _details?: string,
  _ipAddress?: string
): Promise<void> {
  // Activity log table not yet implemented — no-op to avoid runtime errors
}
