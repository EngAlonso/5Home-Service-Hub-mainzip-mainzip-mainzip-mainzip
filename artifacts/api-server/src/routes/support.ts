import { Router } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, ticketRepliesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/support/tickets", authenticate, async (req, res) => {
  try {
    const { status, page = "1" } = req.query as any;
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * 20;

    let rows = await db
      .select({ ticket: supportTicketsTable, user: usersTable })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(20)
      .offset(offset);

    const user = req.user!;
    if (user.role !== "admin" && user.role !== "super_admin") {
      rows = rows.filter((r) => r.ticket.userId === user.id);
    }
    if (status) rows = rows.filter((r) => r.ticket.status === status);

    return res.json(rows.map(({ ticket, user: u }) => ({
      ...ticket,
      user: u ? { id: u.id, fullName: u.fullName, mobile: u.mobile } : null,
    })));
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/support/tickets", authenticate, async (req, res) => {
  try {
    const { subject, message, images } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "الموضوع والرسالة مطلوبان" });
    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({ userId: req.user!.id, subject, message, images: images || [], status: "open" })
      .returning();
    return res.status(201).json(ticket);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/support/tickets/:id", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id)).limit(1);
    if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

    const replies = await db
      .select({ reply: ticketRepliesTable, sender: usersTable })
      .from(ticketRepliesTable)
      .leftJoin(usersTable, eq(ticketRepliesTable.senderId, usersTable.id))
      .where(eq(ticketRepliesTable.ticketId, id))
      .orderBy(ticketRepliesTable.createdAt);

    return res.json({
      ...ticket,
      replies: replies.map(({ reply, sender }) => ({
        ...reply,
        sender: sender ? { id: sender.id, fullName: sender.fullName } : null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/support/tickets/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { status, priority } = req.body;
    const [ticket] = await db
      .update(supportTicketsTable)
      .set({ status, priority, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id))
      .returning();
    return res.json(ticket);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/support/tickets/:id/reply", authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "الرد فارغ" });

    const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id)).limit(1);
    if (!ticket) return res.status(404).json({ error: "التذكرة غير موجودة" });

    const [reply] = await db
      .insert(ticketRepliesTable)
      .values({ ticketId: id, senderId: req.user!.id, message })
      .returning();

    // Update ticket status
    await db.update(supportTicketsTable).set({ status: "in_progress", updatedAt: new Date() }).where(eq(supportTicketsTable.id, id));

    // Notify
    const notifyUserId = req.user!.id === ticket.userId ? undefined : ticket.userId;
    if (notifyUserId) {
      await db.insert(notificationsTable).values({
        userId: notifyUserId,
        title: "رد على تذكرتك",
        body: message.substring(0, 100),
        type: "support_reply",
        relatedId: id,
      });
    }

    return res.status(201).json(reply);
  } catch (err) {
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
