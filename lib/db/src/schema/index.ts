import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { relations } from "drizzle-orm";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "technician",
  "admin",
  "super_admin",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "pending",
  "suspended",
  "banned",
  "rejected",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "offers_received",
  "technician_selected",
  "in_progress",
  "price_change_requested",
  "waiting_approval",
  "completed",
  "cancelled_by_customer",
  "cancelled_by_technician",
  "cancelled_by_admin",
  "disputed",
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "pending",
  "selected",
  "rejected",
  "withdrawn",
]);

export const messageTypeEnum = pgEnum("message_type", ["text", "image"]);

export const pointTransactionTypeEnum = pgEnum("point_transaction_type", [
  "credit",
  "debit",
  "commission",
  "release",
]);

export const commissionTypeEnum = pgEnum("commission_type", [
  "fixed",
  "percentage",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_request",
  "new_offer",
  "technician_selected",
  "new_message",
  "price_adjustment",
  "status_change",
  "support_reply",
  "announcement",
]);

// ─── USERS ───────────────────────────────────────────────────────────────────

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    mobile: varchar("mobile", { length: 20 }).notNull().unique(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    status: userStatusEnum("status").notNull().default("active"),
    profileImage: text("profile_image"),
    jobTitle: text("job_title"),
    suspensionReason: text("suspension_reason"),
    bannedUntil: timestamp("banned_until"),
    bannedByAdminId: integer("banned_by_admin_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("users_mobile_idx").on(t.mobile), index("users_role_idx").on(t.role)]
);

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  technicianProfile: one(technicianProfilesTable, {
    fields: [usersTable.id],
    references: [technicianProfilesTable.userId],
  }),
  requests: many(serviceRequestsTable),
  offers: many(offersTable),
  messages: many(messagesTable),
  notifications: many(notificationsTable),
  tickets: many(supportTicketsTable),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ─── TECHNICIAN PROFILES ─────────────────────────────────────────────────────

export const technicianProfilesTable = pgTable("technician_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  nationalId: varchar("national_id", { length: 20 }).notNull(),
  personalPhoto: text("personal_photo"),
  nationalIdFront: text("national_id_front"),
  nationalIdBack: text("national_id_back"),
  approvalStatus: approvalStatusEnum("approval_status")
    .notNull()
    .default("pending"),
  rejectionReason: text("rejection_reason"),
  rejectedByAdminId: integer("rejected_by_admin_id"),
  rejectedAt: timestamp("rejected_at"),
  pointsBalance: integer("points_balance").notNull().default(0),
  reservedPoints: integer("reserved_points").notNull().default(0),
  primaryAreaId: integer("primary_area_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const technicianProfilesRelations = relations(
  technicianProfilesTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [technicianProfilesTable.userId],
      references: [usersTable.id],
    }),
    primaryArea: one(areasTable, {
      fields: [technicianProfilesTable.primaryAreaId],
      references: [areasTable.id],
    }),
    technicianServices: many(technicianServicesTable),
    technicianAreas: many(technicianAreasTable),
    pointTransactions: many(pointTransactionsTable),
  })
);

export type TechnicianProfile = typeof technicianProfilesTable.$inferSelect;

// ─── SERVICES ────────────────────────────────────────────────────────────────

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  icon: text("icon"),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  iconSize: integer("icon_size").notNull().default(100),
  iconShape: text("icon_shape").notNull().default("square"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const servicesRelations = relations(servicesTable, ({ many }) => ({
  technicianServices: many(technicianServicesTable),
  serviceRequests: many(serviceRequestsTable),
  commissions: many(commissionsTable),
}));

export type Service = typeof servicesTable.$inferSelect;

// ─── GOVERNORATES ────────────────────────────────────────────────────────────

export const governoratesTable = pgTable("governorates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const governoratesRelations = relations(
  governoratesTable,
  ({ many }) => ({
    areas: many(areasTable),
  })
);

export type Governorate = typeof governoratesTable.$inferSelect;

// ─── AREAS ───────────────────────────────────────────────────────────────────

export const areasTable = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  governorateId: integer("governorate_id")
    .notNull()
    .references(() => governoratesTable.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const areasRelations = relations(areasTable, ({ one, many }) => ({
  governorate: one(governoratesTable, {
    fields: [areasTable.governorateId],
    references: [governoratesTable.id],
  }),
  technicianAreas: many(technicianAreasTable),
  serviceRequests: many(serviceRequestsTable),
  commissions: many(commissionsTable),
}));

export type Area = typeof areasTable.$inferSelect;

// ─── JUNCTION: TECHNICIAN ↔ SERVICES ─────────────────────────────────────────

export const technicianServicesTable = pgTable("technician_services", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id")
    .notNull()
    .references(() => technicianProfilesTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => servicesTable.id, { onDelete: "cascade" }),
});

export const technicianServicesRelations = relations(
  technicianServicesTable,
  ({ one }) => ({
    technician: one(technicianProfilesTable, {
      fields: [technicianServicesTable.technicianId],
      references: [technicianProfilesTable.id],
    }),
    service: one(servicesTable, {
      fields: [technicianServicesTable.serviceId],
      references: [servicesTable.id],
    }),
  })
);

// ─── JUNCTION: TECHNICIAN ↔ AREAS ────────────────────────────────────────────

export const technicianAreasTable = pgTable("technician_areas", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id")
    .notNull()
    .references(() => technicianProfilesTable.id, { onDelete: "cascade" }),
  areaId: integer("area_id")
    .notNull()
    .references(() => areasTable.id, { onDelete: "cascade" }),
});

export const technicianAreasRelations = relations(
  technicianAreasTable,
  ({ one }) => ({
    technician: one(technicianProfilesTable, {
      fields: [technicianAreasTable.technicianId],
      references: [technicianProfilesTable.id],
    }),
    area: one(areasTable, {
      fields: [technicianAreasTable.areaId],
      references: [areasTable.id],
    }),
  })
);

// ─── SERVICE REQUESTS ────────────────────────────────────────────────────────

export const serviceRequestsTable = pgTable(
  "service_requests",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => usersTable.id),
    serviceId: integer("service_id")
      .notNull()
      .references(() => servicesTable.id),
    selectedTechnicianId: integer("selected_technician_id").references(
      () => usersTable.id
    ),
    status: requestStatusEnum("status").notNull().default("pending"),
    fullName: text("full_name").notNull(),
    mobile: varchar("mobile", { length: 20 }).notNull(),
    governorateId: integer("governorate_id")
      .notNull()
      .references(() => governoratesTable.id),
    areaId: integer("area_id")
      .notNull()
      .references(() => areasTable.id),
    address: text("address").notNull(),
    description: text("description").notNull(),
    images: text("images").array().notNull().default([]),
    audioUrl: text("audio_url"),
    agreedPrice: numeric("agreed_price", { precision: 10, scale: 2 }),
    adminNote: text("admin_note"),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("requests_customer_idx").on(t.customerId),
    index("requests_status_idx").on(t.status),
    index("requests_service_idx").on(t.serviceId),
    index("requests_area_idx").on(t.areaId),
  ]
);

export const serviceRequestsRelations = relations(
  serviceRequestsTable,
  ({ one, many }) => ({
    customer: one(usersTable, {
      fields: [serviceRequestsTable.customerId],
      references: [usersTable.id],
      relationName: "customerRequests",
    }),
    service: one(servicesTable, {
      fields: [serviceRequestsTable.serviceId],
      references: [servicesTable.id],
    }),
    selectedTechnician: one(usersTable, {
      fields: [serviceRequestsTable.selectedTechnicianId],
      references: [usersTable.id],
      relationName: "selectedRequests",
    }),
    governorate: one(governoratesTable, {
      fields: [serviceRequestsTable.governorateId],
      references: [governoratesTable.id],
    }),
    area: one(areasTable, {
      fields: [serviceRequestsTable.areaId],
      references: [areasTable.id],
    }),
    offers: many(offersTable),
    messages: many(messagesTable),
    ratings: many(ratingsTable),
    priceAdjustments: many(priceAdjustmentsTable),
    auditTrail: many(auditTrailTable),
  })
);

export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;

// ─── OFFERS ───────────────────────────────────────────────────────────────────

export const offersTable = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => serviceRequestsTable.id, { onDelete: "cascade" }),
    technicianId: integer("technician_id")
      .notNull()
      .references(() => usersTable.id),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    spareParts: numeric("spare_parts", { precision: 10, scale: 2 }),
    notes: text("notes"),
    status: offerStatusEnum("status").notNull().default("pending"),
    reservedPoints: integer("reserved_points").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("offers_request_idx").on(t.requestId),
    index("offers_technician_idx").on(t.technicianId),
  ]
);

export const offersRelations = relations(offersTable, ({ one }) => ({
  request: one(serviceRequestsTable, {
    fields: [offersTable.requestId],
    references: [serviceRequestsTable.id],
  }),
  technician: one(usersTable, {
    fields: [offersTable.technicianId],
    references: [usersTable.id],
  }),
}));

export type Offer = typeof offersTable.$inferSelect;

// ─── MESSAGES ────────────────────────────────────────────────────────────────

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => serviceRequestsTable.id, { onDelete: "cascade" }),
    senderId: integer("sender_id")
      .notNull()
      .references(() => usersTable.id),
    content: text("content").notNull(),
    type: messageTypeEnum("type").notNull().default("text"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_request_idx").on(t.requestId)]
);

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  request: one(serviceRequestsTable, {
    fields: [messagesTable.requestId],
    references: [serviceRequestsTable.id],
  }),
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id],
  }),
}));

export type Message = typeof messagesTable.$inferSelect;

// ─── RATINGS ─────────────────────────────────────────────────────────────────

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => serviceRequestsTable.id, { onDelete: "cascade" })
    .unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id),
  technicianId: integer("technician_id")
    .notNull()
    .references(() => usersTable.id),
  stars: integer("stars").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratingsRelations = relations(ratingsTable, ({ one }) => ({
  request: one(serviceRequestsTable, {
    fields: [ratingsTable.requestId],
    references: [serviceRequestsTable.id],
  }),
  customer: one(usersTable, {
    fields: [ratingsTable.customerId],
    references: [usersTable.id],
    relationName: "customerRatings",
  }),
  technician: one(usersTable, {
    fields: [ratingsTable.technicianId],
    references: [usersTable.id],
    relationName: "technicianRatings",
  }),
}));

export type Rating = typeof ratingsTable.$inferSelect;

// ─── POINT TRANSACTIONS ───────────────────────────────────────────────────────

export const pointTransactionsTable = pgTable(
  "point_transactions",
  {
    id: serial("id").primaryKey(),
    technicianId: integer("technician_id")
      .notNull()
      .references(() => technicianProfilesTable.id),
    amount: integer("amount").notNull(),
    type: pointTransactionTypeEnum("type").notNull(),
    description: text("description").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    requestId: integer("request_id").references(
      () => serviceRequestsTable.id
    ),
    adminId: integer("admin_id").references(() => usersTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("point_txn_technician_idx").on(t.technicianId)]
);

export const pointTransactionsRelations = relations(
  pointTransactionsTable,
  ({ one }) => ({
    technician: one(technicianProfilesTable, {
      fields: [pointTransactionsTable.technicianId],
      references: [technicianProfilesTable.id],
    }),
    request: one(serviceRequestsTable, {
      fields: [pointTransactionsTable.requestId],
      references: [serviceRequestsTable.id],
    }),
    admin: one(usersTable, {
      fields: [pointTransactionsTable.adminId],
      references: [usersTable.id],
    }),
  })
);

export type PointTransaction = typeof pointTransactionsTable.$inferSelect;

// ─── COMMISSIONS ─────────────────────────────────────────────────────────────

export const commissionsTable = pgTable("commissions", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => servicesTable.id, {
    onDelete: "cascade",
  }),
  areaId: integer("area_id").references(() => areasTable.id, {
    onDelete: "cascade",
  }),
  type: commissionTypeEnum("type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const commissionsRelations = relations(commissionsTable, ({ one }) => ({
  service: one(servicesTable, {
    fields: [commissionsTable.serviceId],
    references: [servicesTable.id],
  }),
  area: one(areasTable, {
    fields: [commissionsTable.areaId],
    references: [areasTable.id],
  }),
}));

export type Commission = typeof commissionsTable.$inferSelect;

// ─── PRICE ADJUSTMENTS ───────────────────────────────────────────────────────

export const priceAdjustmentsTable = pgTable("price_adjustments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => serviceRequestsTable.id, { onDelete: "cascade" }),
  technicianId: integer("technician_id"),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  oldSpareParts: numeric("old_spare_parts", { precision: 10, scale: 2 }),
  newPrice: numeric("new_price", { precision: 10, scale: 2 }).notNull(),
  newSpareParts: numeric("new_spare_parts", { precision: 10, scale: 2 }),
  newDescription: text("new_description"),
  supportingImage: text("supporting_image"),
  images: text("images").array().notNull().default([]),
  status: text("status").notNull().default("pending"),
  decisionDate: timestamp("decision_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const priceAdjustmentsRelations = relations(
  priceAdjustmentsTable,
  ({ one }) => ({
    request: one(serviceRequestsTable, {
      fields: [priceAdjustmentsTable.requestId],
      references: [serviceRequestsTable.id],
    }),
  })
);

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  images: text("images").array().notNull().default([]),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supportTicketsRelations = relations(
  supportTicketsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [supportTicketsTable.userId],
      references: [usersTable.id],
    }),
    replies: many(ticketRepliesTable),
  })
);

export type SupportTicket = typeof supportTicketsTable.$inferSelect;

// ─── TICKET REPLIES ───────────────────────────────────────────────────────────

export const ticketRepliesTable = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => supportTicketsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketRepliesRelations = relations(
  ticketRepliesTable,
  ({ one }) => ({
    ticket: one(supportTicketsTable, {
      fields: [ticketRepliesTable.ticketId],
      references: [supportTicketsTable.id],
    }),
    sender: one(usersTable, {
      fields: [ticketRepliesTable.senderId],
      references: [usersTable.id],
    }),
  })
);

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: notificationTypeEnum("type").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    relatedId: integer("related_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.isRead),
  ]
);

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [notificationsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export type Notification = typeof notificationsTable.$inferSelect;

// ─── CMS SETTINGS ────────────────────────────────────────────────────────────

export const cmsSettingsTable = pgTable("cms_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── BANNERS ─────────────────────────────────────────────────────────────────

export const bannerLocationEnum = pgEnum("banner_location", [
  "hero",
  "below_services",
  "before_footer",
]);

export const bannersTable = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  location: bannerLocationEnum("location").notNull().default("hero"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Banner = typeof bannersTable.$inferSelect;
export type InsertBanner = typeof bannersTable.$inferInsert;

// ─── ADMIN PERMISSIONS ───────────────────────────────────────────────────────

export const adminPermissionsTable = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  permissions: text("permissions").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

export const activityLogsTable = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => usersTable.id),
    action: text("action").notNull(),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_logs_admin_idx").on(t.adminId)]
);

export const activityLogsRelations = relations(activityLogsTable, ({ one }) => ({
  admin: one(usersTable, {
    fields: [activityLogsTable.adminId],
    references: [usersTable.id],
  }),
}));

// ─── AUDIT TRAIL ─────────────────────────────────────────────────────────────

export const auditTrailTable = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => serviceRequestsTable.id, { onDelete: "cascade" }),
  changedBy: integer("changed_by").references(() => usersTable.id),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditTrailRelations = relations(auditTrailTable, ({ one }) => ({
  request: one(serviceRequestsTable, {
    fields: [auditTrailTable.requestId],
    references: [serviceRequestsTable.id],
  }),
  changedByUser: one(usersTable, {
    fields: [auditTrailTable.changedBy],
    references: [usersTable.id],
  }),
}));
