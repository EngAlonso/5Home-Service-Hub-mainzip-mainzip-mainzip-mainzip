import { Router } from "express";
import { db } from "@workspace/db";
import { bannersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/banners", async (req, res) => {
  try {
    const location = req.query.location as string | undefined;
    let rows;
    if (location) {
      rows = await db
        .select()
        .from(bannersTable)
        .where(eq(bannersTable.location, location as any))
        .orderBy(asc(bannersTable.displayOrder));
    } else {
      rows = await db.select().from(bannersTable).orderBy(asc(bannersTable.displayOrder));
    }
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/banners", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { title, description, imageUrl, buttonText, buttonLink, location, displayOrder, isActive } = req.body;
    if (!title) return res.status(400).json({ error: "العنوان مطلوب" });
    const [banner] = await db
      .insert(bannersTable)
      .values({ title, description, imageUrl, buttonText, buttonLink, location: location || "hero", displayOrder: displayOrder ?? 0, isActive: isActive ?? true })
      .returning();
    return res.status(201).json(banner);
  } catch {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/banners/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [banner] = await db
      .update(bannersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(bannersTable.id, id))
      .returning();
    if (!banner) return res.status(404).json({ error: "البانر غير موجود" });
    return res.json(banner);
  } catch {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/banners/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.delete(bannersTable).where(eq(bannersTable.id, id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
