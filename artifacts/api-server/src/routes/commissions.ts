import { Router } from "express";
import { db } from "@workspace/db";
import { commissionsTable, servicesTable, areasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/commissions", authenticate, requireRole("admin", "super_admin"), async (_req, res) => {
  try {
    const rows = await db
      .select({ commission: commissionsTable, service: servicesTable, area: areasTable })
      .from(commissionsTable)
      .leftJoin(servicesTable, eq(commissionsTable.serviceId, servicesTable.id))
      .leftJoin(areasTable, eq(commissionsTable.areaId, areasTable.id));

    return res.json(rows.map(({ commission, service, area }) => ({ ...commission, service, area })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/commissions", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { serviceId, areaId, type, value } = req.body;
    if (!type || !value) return res.status(400).json({ error: "البيانات مطلوبة" });

    const [commission] = await db
      .insert(commissionsTable)
      .values({ serviceId: serviceId || null, areaId: areaId || null, type, value: value.toString() })
      .returning();
    return res.status(201).json(commission);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/commissions/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { type, value } = req.body;
    const [commission] = await db
      .update(commissionsTable)
      .set({ type, value: value?.toString(), updatedAt: new Date() })
      .where(eq(commissionsTable.id, id))
      .returning();
    if (!commission) return res.status(404).json({ error: "العمولة غير موجودة" });
    return res.json(commission);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
