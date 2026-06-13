import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard, Users, Wrench, ClipboardList, Settings2,
  MapPin, DollarSign, Coins, HeadphonesIcon, BarChart2,
  FileText, Users2, ScrollText, LogOut, Image
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: any;
  label: string;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "الرئيسي",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "لوحة التحكم" },
      { href: "/admin/analytics", icon: BarChart2, label: "التحليلات", permission: "analytics.view" },
    ],
  },
  {
    label: "المستخدمون",
    items: [
      { href: "/admin/users", icon: Users, label: "العملاء", permission: "users.view" },
      { href: "/admin/technicians", icon: Wrench, label: "الفنيون", permission: "technicians.view" },
    ],
  },
  {
    label: "الطلبات",
    items: [
      { href: "/admin/requests", icon: ClipboardList, label: "الطلبات", permission: "requests.view" },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { href: "/admin/services", icon: Settings2, label: "الخدمات", permission: "services.edit" },
      { href: "/admin/locations", icon: MapPin, label: "المناطق", permission: "locations.edit" },
      { href: "/admin/commissions", icon: DollarSign, label: "العمولات", permission: "commissions.view" },
      { href: "/admin/points", icon: Coins, label: "النقاط", permission: "points.view" },
    ],
  },
  {
    label: "الدعم والمحتوى",
    items: [
      { href: "/admin/support", icon: HeadphonesIcon, label: "تذاكر الدعم", permission: "support.view" },
      { href: "/admin/banners", icon: Image, label: "البانرات", permission: "cms.banners" },
      { href: "/admin/cms", icon: FileText, label: "إدارة المحتوى", permission: "cms.homepage" },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/admin/staff", icon: Users2, label: "الموظفون", permission: "admin.create" },
      { href: "/admin/logs", icon: ScrollText, label: "سجل الأنشطة", permission: "analytics.view" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, hasPermission, isSuperAdmin } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined as any);
    logout();
  };

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      <aside className="w-60 bg-sidebar border-l border-sidebar-border flex flex-col fixed h-full right-0 top-0 z-40 overflow-y-auto">
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-black text-sm text-sidebar-foreground leading-none">فنشها</p>
              <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
            </div>
          </div>
        </div>

        <div className="p-3 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Users2 className="w-4 h-4 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-xs text-sidebar-foreground truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? "مدير عام" : "مدير"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              ({ permission }) => !permission || hasPermission(permission)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">{group.label}</p>
                <ul className="space-y-0.5">
                  {visibleItems.map(({ href, icon: Icon, label }) => {
                    const isActive = location === href;
                    return (
                      <li key={href}>
                        <Link href={href}>
                          <div className={cn(
                            "flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )} data-testid={`nav-admin-${href.replace(/\//g, "-")}`}>
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {label}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex-1 mr-60 min-h-screen overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
