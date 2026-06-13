import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck, Megaphone, Star, Wrench, MessageSquare, Package, AlertCircle } from "lucide-react";
import {
  useListNotifications, getListNotificationsQueryKey,
  useMarkAllNotificationsRead, useMarkNotificationRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ReactNode> = {
  new_request:         <Package       className="w-4 h-4 text-blue-500" />,
  new_offer:           <Wrench        className="w-4 h-4 text-green-500" />,
  technician_selected: <Star          className="w-4 h-4 text-yellow-500" />,
  new_message:         <MessageSquare className="w-4 h-4 text-indigo-500" />,
  announcement:        <Megaphone     className="w-4 h-4 text-purple-500" />,
  status_change:       <AlertCircle   className="w-4 h-4 text-orange-500" />,
  price_adjustment:    <AlertCircle   className="w-4 h-4 text-orange-500" />,
  support_reply:       <MessageSquare className="w-4 h-4 text-cyan-500" />,
};

/** Returns the navigation path for a notification, given the current user role */
function getNotifPath(type: string, relatedId: number | null, role: string): string | null {
  if (!relatedId) return null;

  const isAdmin = role === "admin" || role === "super_admin";

  switch (type) {
    case "new_request":
      if (isAdmin) return `/admin/requests/${relatedId}`;
      if (role === "technician") return `/technician/requests/${relatedId}`;
      return null;

    case "technician_selected":
      if (isAdmin) return `/admin/requests/${relatedId}`;
      if (role === "technician") return `/technician/requests/${relatedId}`;
      if (role === "customer") return `/customer/requests/${relatedId}`;
      return null;

    case "status_change":
    case "price_adjustment":
      if (isAdmin) return `/admin/requests/${relatedId}`;
      if (role === "technician") return `/technician/requests/${relatedId}`;
      if (role === "customer") return `/customer/requests/${relatedId}`;
      return null;

    case "new_offer":
      if (isAdmin) return `/admin/requests/${relatedId}`;
      return `/customer/requests/${relatedId}`;

    case "new_message":
      if (role === "technician") return `/technician/chat/${relatedId}`;
      if (role === "customer")   return `/customer/chat/${relatedId}`;
      return null;

    case "support_reply":
      if (role === "technician") return `/technician/support`;
      if (role === "customer")   return `/customer/support`;
      return null;

    default:
      return null;
  }
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "الآن";
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const role = (currentUser as any)?.role ?? "";

  const { data: notifications = [] } = useListNotifications(
    {},
    { query: { refetchInterval: 20_000, queryKey: getListNotificationsQueryKey() } }
  );

  const markAllMutation = useMarkAllNotificationsRead();
  const markOneMutation  = useMarkNotificationRead();

  const notifs = notifications as any[];
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

  const handleMarkAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllMutation.mutate(undefined as any, { onSuccess: invalidate });
  };

  const handleClickNotif = (n: any) => {
    if (!n.isRead) {
      markOneMutation.mutate({ id: n.id } as any, { onSuccess: invalidate });
    }
    const path = getNotifPath(n.type, n.relatedId, role);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors"
        aria-label="الإشعارات"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5 text-sidebar-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-80 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">
              الإشعارات
              {unreadCount > 0 && (
                <span className="ms-1.5 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-bold">
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                قراءة الكل
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا توجد إشعارات
              </div>
            ) : (
              notifs.slice(0, 25).map((n) => {
                const path = getNotifPath(n.type, n.relatedId, role);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors",
                      !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50",
                      path ? "cursor-pointer" : "cursor-default",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      {TYPE_ICON[n.type] ?? <Bell className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm leading-snug",
                        !n.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                      )}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
                        {path && (
                          <span className="text-[10px] text-primary/70">اضغط للانتقال →</span>
                        )}
                      </div>
                    </div>

                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
