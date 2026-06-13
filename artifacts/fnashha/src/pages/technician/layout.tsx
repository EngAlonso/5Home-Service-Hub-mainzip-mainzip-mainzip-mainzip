import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useLogout, useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { LayoutDashboard, Search, FileText, Wallet, User, HeadphonesIcon, LogOut, Wrench, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notification-bell";

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  // Unread counts for nav badges
  const { data: notifications = [] } = useListNotifications(
    {},
    { query: { refetchInterval: 20_000, queryKey: getListNotificationsQueryKey() } }
  );
  const notifs = notifications as any[];
  const newRequestCount  = notifs.filter((n) => !n.isRead && n.type === "new_request").length;
  const newOfferCount    = notifs.filter((n) => !n.isRead && (n.type === "technician_selected" || n.type === "status_change")).length;

  const handleLogout = () => {
    logoutMutation.mutate(undefined as any);
    logout();
  };

  const navItems = [
    { href: "/technician",           icon: LayoutDashboard, label: "لوحة التحكم" },
    { href: "/technician/requests",  icon: Search,          label: "الطلبات المتاحة", badge: newRequestCount },
    { href: "/technician/offers",    icon: FileText,        label: "عروضي",           badge: newOfferCount },
    { href: "/technician/completed", icon: CheckCircle2,    label: "المكتملة" },
    { href: "/technician/wallet",    icon: Wallet,          label: "المحفظة" },
    { href: "/technician/profile",   icon: User,            label: "الملف الشخصي" },
    { href: "/technician/support",   icon: HeadphonesIcon,  label: "الدعم" },
  ];

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      <aside className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col fixed h-full right-0 top-0 z-40">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow">
              <Wrench className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-black text-lg text-sidebar-foreground leading-none">فنشها</p>
              <p className="text-xs text-muted-foreground">بوابة الفني</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-muted-foreground">فني</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map(({ href, icon: Icon, label, badge }) => {
              const isActive = location === href;
              return (
                <li key={href}>
                  <Link href={href}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )} data-testid={`nav-${href.replace(/\//g, "-")}`}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge != null && badge > 0 && (
                        <span className="min-w-[20px] h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex-1 mr-64 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
