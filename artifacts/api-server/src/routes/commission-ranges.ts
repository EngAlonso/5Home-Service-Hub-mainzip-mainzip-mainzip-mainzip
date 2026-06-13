import { Router } from "express";
import { db } from "@workspace/db";
import { commissionRangesTable, servicesTable } from "@workspace/db";
import { eq, isNull, asc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/commission-ranges — list all, enriched with service name
router.get("/commission-ranges", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const rows = await db
      .select({ range: commissionRangesTable, service: servicesTable })
      .from(commissionRangesTable)
      .leftJoin(servicesTable, eq(commissionRangesTable.serviceId, servicesTable.id))
      .orderBy(asc(commissionRangesTable.serviceId), asc(commissionRangesTable.minPrice));

    return res.json(rows.map(({ range, service }) => ({ ...range, service })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/commission-ranges — create a new range
router.post("/commission-ranges", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { serviceId, minPrice, maxPrice, requiredPoints } = req.body;
    if (minPrice === undefined || maxPrice === undefined || requiredPoints === undefined) {
      return res.status(400).json({ error: "الحد الأدنى والأقصى للسعر وعدد النقاط مطلوبة" });
    }
    if (parseFloat(minPrice) >= parseFloat(maxPrice)) {
      return res.status(400).json({ error: "الحد الأدنى يجب أن يكون أقل من الحد الأقصى" });
    }

    const [range] = await db
      .insert(commissionRangesTable)
      .values({
        serviceId: serviceId ? parseInt(serviceId) : null,
        minPrice: parseFloat(minPrice).toFixed(2),
        maxPrice: parseFloat(maxPrice).toFixed(2),
        requiredPoints: parseInt(requiredPoints),
      })
      .returning();

    return res.status(201).json(range);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// PATCH /api/commission-ranges/:id — update a range
router.patch("/commission-ranges/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { serviceId, minPrice, maxPrice, requiredPoints } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (serviceId !== undefined) updates.serviceId = serviceId ? parseInt(serviceId) : null;
    if (minPrice !== undefined) updates.minPrice = parseFloat(minPrice).toFixed(2);
    if (maxPrice !== undefined) updates.maxPrice = parseFloat(maxPrice).toFixed(2);
    if (requiredPoints !== undefined) updates.requiredPoints = parseInt(requiredPoints);

    const [range] = await db
      .update(commissionRangesTable)
      .set(updates)
      .where(eq(commissionRangesTable.id, id))
      .returning();

    if (!range) return res.status(404).json({ error: "النطاق غير موجود" });
    return res.json(range);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// DELETE /api/commission-ranges/:id
router.delete("/commission-ranges/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.delete(commissionRangesTable).where(eq(commissionRangesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
