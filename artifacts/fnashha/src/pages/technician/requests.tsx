import { Link } from "wouter";
import {
  useListRequests, getListRequestsQueryKey,
  useListNotifications, getListNotificationsQueryKey,
  useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Search, Zap } from "lucide-react";
import { REQUEST_STATUS_MAP } from "@/lib/status";

export default function TechnicianRequests() {
  const queryClient = useQueryClient();

  // Fetch pending + offers_received requests (both are still open for bidding)
  const { data: pendingData, isLoading: loadingPending } = useListRequests(
    { status: "pending" } as any,
    { query: { refetchInterval: 20_000, queryKey: getListRequestsQueryKey({ status: "pending" } as any) } }
  );
  const { data: offersData, isLoading: loadingOffers } = useListRequests(
    { status: "offers_received" } as any,
    { query: { refetchInterval: 20_000, queryKey: getListRequestsQueryKey({ status: "offers_received" } as any) } }
  );

  // Unread new_request notifications to show "NEW" badges
  const { data: notifications = [] } = useListNotifications(
    {},
    { query: { refetchInterval: 20_000, queryKey: getListNotificationsQueryKey() } }
  );
  const markAllMutation = useMarkAllNotificationsRead();

  const notifs = notifications as any[];
  const newRequestIds = new Set(
    notifs
      .filter((n) => !n.isRead && n.type === "new_request")
      .map((n) => n.relatedId)
  );

  const pendingRequests  = (pendingData as any)?.data  || [];
  const offersRequests   = (offersData  as any)?.data  || [];

  // Merge and deduplicate by id, preserving order (pending first)
  const seen = new Set<number>();
  const requests: any[] = [];
  for (const r of [...pendingRequests, ...offersRequests]) {
    if (!seen.has(r.id)) { seen.add(r.id); requests.push(r); }
  }

  const isLoading = loadingPending || loadingOffers;

  // Mark new_request notifications as read when this page is visited
  useEffect(() => {
    const hasUnread = notifs.some((n) => !n.isRead && n.type === "new_request");
    if (hasUnread) {
      markAllMutation.mutate(undefined as any, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">الطلبات المتاحة</h1>
        <p className="text-muted-foreground text-sm mt-1">طلبات في نطاق خدمتك — قدّم عرضك الآن</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">لا توجد طلبات متاحة الآن</p>
            <p className="text-sm mt-1">سيتم إشعارك عند وصول طلبات جديدة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((r: any) => {
            const status = REQUEST_STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100" };
            const isNew = newRequestIds.has(r.id);
            return (
              <Link href={`/technician/requests/${r.id}`} key={r.id}>
                <Card
                  className={`hover:shadow-md cursor-pointer transition-all hover:border-primary/40 ${isNew ? "border-primary/60 ring-1 ring-primary/30" : ""}`}
                  data-testid={`card-request-${r.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`text-xs ${status.color} border-0`}>{status.label}</Badge>
                          {isNew && (
                            <Badge className="text-xs bg-destructive text-destructive-foreground border-0 flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              جديد
                            </Badge>
                          )}
                          {r.offersCount > 0 && (
                            <span className="text-xs text-muted-foreground">{r.offersCount} عرض مقدم</span>
                          )}
                        </div>
                        <p className="font-medium text-sm line-clamp-2 mb-2">{r.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {r.address}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
