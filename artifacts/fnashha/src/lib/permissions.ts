export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "users",
    label: "العملاء",
    permissions: [
      { key: "users.view", label: "عرض" },
      { key: "users.edit", label: "تعديل" },
      { key: "users.ban", label: "حظر / إيقاف" },
    ],
  },
  {
    group: "technicians",
    label: "الفنيون",
    permissions: [
      { key: "technicians.view", label: "عرض" },
      { key: "technicians.approve", label: "موافقة" },
      { key: "technicians.reject", label: "رفض" },
      { key: "technicians.suspend", label: "إيقاف" },
    ],
  },
  {
    group: "requests",
    label: "الطلبات",
    permissions: [
      { key: "requests.view", label: "عرض" },
      { key: "requests.edit", label: "تعديل" },
      { key: "requests.change_status", label: "تغيير الحالة" },
    ],
  },
  {
    group: "chats",
    label: "المحادثات",
    permissions: [
      { key: "chats.view", label: "مشاهدة المحادثات" },
    ],
  },
  {
    group: "commissions",
    label: "نطاقات العمولة",
    permissions: [
      { key: "commissions.view", label: "عرض نطاقات العمولة" },
    ],
  },
  {
    group: "points",
    label: "النقاط",
    permissions: [
      { key: "points.view", label: "عرض" },
      { key: "points.add", label: "إضافة" },
      { key: "points.deduct", label: "خصم" },
    ],
  },
  {
    group: "services",
    label: "الخدمات",
    permissions: [
      { key: "services.add", label: "إضافة" },
      { key: "services.edit", label: "تعديل" },
      { key: "services.delete", label: "حذف" },
    ],
  },
  {
    group: "locations",
    label: "المناطق",
    permissions: [
      { key: "locations.add", label: "إضافة" },
      { key: "locations.edit", label: "تعديل" },
      { key: "locations.delete", label: "حذف" },
    ],
  },
  {
    group: "cms",
    label: "إدارة المحتوى",
    permissions: [
      { key: "cms.homepage", label: "الصفحة الرئيسية" },
      { key: "cms.banners", label: "البانرات" },
      { key: "cms.footer", label: "الفوتر" },
    ],
  },
  {
    group: "support",
    label: "الدعم الفني",
    permissions: [
      { key: "support.view", label: "عرض التذاكر" },
      { key: "support.reply", label: "الرد" },
      { key: "support.close", label: "إغلاق التذاكر" },
    ],
  },
  {
    group: "analytics",
    label: "التحليلات",
    permissions: [
      { key: "analytics.view", label: "عرض التقارير" },
      { key: "analytics.export", label: "تصدير التقارير" },
    ],
  },
  {
    group: "admin",
    label: "إدارة الموظفين",
    permissions: [
      { key: "admin.create", label: "إنشاء مديرين" },
      { key: "admin.edit", label: "تعديل المديرين" },
      { key: "admin.delete", label: "حذف المديرين" },
      { key: "admin.permissions", label: "إدارة الصلاحيات" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

export function getPermissionLabel(key: string): string {
  for (const group of PERMISSION_GROUPS) {
    const found = group.permissions.find((p) => p.key === key);
    if (found) return `${group.label} — ${found.label}`;
  }
  return key;
}
