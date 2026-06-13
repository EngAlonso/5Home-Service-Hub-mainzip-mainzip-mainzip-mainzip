import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, serviceRequestsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";

const router = Router();

// GET /api/requests/:requestId/messages
router.get("/requests/:requestId/messages", authenticate, async (req, res) => {
  try {
    const requestId = parseInt(req.params["requestId"] as string);
    const messages = await db
      .select({ message: messagesTable, sender: usersTable })
      .from(messagesTable)
      .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.requestId, requestId))
      .orderBy(asc(messagesTable.createdAt));

    return res.json(messages.map(({ message, sender }) => ({
      ...message,
      sender: sender ? { id: sender.id, fullName: sender.fullName, profileImage: sender.profileImage } : null,
    })));
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// POST /api/requests/:requestId/messages
router.post("/requests/:requestId/messages", authenticate, async (req, res) => {
  try {
    const requestId = parseInt(req.params["requestId"] as string);
    const { content, type, imageUrl } = req.body;

    if (!content) return res.status(400).json({ error: "الرسالة فارغة" });

    const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, requestId)).limit(1);
    if (!request) return res.status(404).json({ error: "الطلب غير موجود" });

    // Check chat is open
    const closedStatuses = ["completed", "cancelled_by_customer", "cancelled_by_technician", "cancelled_by_admin", "disputed"];
    if (closedStatuses.includes(request.status)) {
      return res.status(400).json({ error: "المحادثة مغلقة" });
    }

    const [message] = await db
      .insert(messagesTable)
      .values({ requestId, senderId: req.user!.id, content, type: type || "text", imageUrl })
      .returning();

    // Notify the other party
    const recipientId =
      req.user!.id === request.customerId ? request.selectedTechnicianId : request.customerId;

    if (recipientId) {
      await db.insert(notificationsTable).values({
        userId: recipientId,
        title: "رسالة جديدة",
        body: content.substring(0, 100),
        type: "new_message",
        relatedId: requestId,
      });
    }

    const [sender] = await db
      .select({ id: usersTable.id, fullName: usersTable.fullName, profileImage: usersTable.profileImage })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);

    return res.status(201).json({ ...message, sender });
  } catch (err) {
    req.log.error({ err });
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
