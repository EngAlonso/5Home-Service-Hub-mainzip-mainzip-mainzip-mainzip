import { Link } from "wouter";
import { useGetAnalyticsOverview, getGetAnalyticsOverviewQueryKey, useListPendingTechnicians, getListPendingTechniciansQueryKey, useListRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Wrench, ClipboardList, CheckCircle, Clock, AlertTriangle, TrendingUp, UserCheck } from "lucide-react";

export default function AdminDashboard() {
  const { data: overview } = useGetAnalyticsOverview({
    query: { queryKey: getGetAnalyticsOverviewQueryKey() },
  });
  const { data: pendingTechs = [] } = useListPendingTechnicians({
    query: { queryKey: getListPendingTechniciansQueryKey() },
  });
  const { data: requestsData } = useListRequests({ status: "disputed" } as any);
  const disputedRequests = (requestsData as any)?.data || [];

  const ov = overview as any;

  const stats = [
    { label: "إجمالي العملاء", value: ov?.totalCustomers ?? "—", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "الفنيون النشطون", value: ov?.activeTechnicians ?? "—", icon: Wrench, color: "text-green-600", bg: "bg-green-50" },
    { label: "في انتظار الموافقة", value: ov?.pendingApprovals ?? "—", icon: UserCheck, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "إجمالي الطلبات", value: ov?.totalRequests ?? "—", icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "طلبات مفتوحة", value: ov?.openRequests ?? "—", icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "طلبات مكتملة", value: ov?.completedRequests ?? "—", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "طلبات ملغاة", value: ov?.cancelledRequests ?? "—", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "متنازع عليها", value: ov?.disputedRequests ?? "—", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على المنصة</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending technicians */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              فنيون بانتظار الموافقة
              <Link href="/admin/technicians">
                <Button variant="ghost" size="sm">عرض الكل</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(pendingTechs as any[]).length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">لا يوجد طلبات معلقة</p>
            ) : (
              <div className="space-y-3">
                {(pendingTechs as any[]).slice(0, 5).map((t: any) => (
                  <Link href={`/admin/technicians/${t.userId}`} key={t.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer border border-border" data-testid={`pending-tech-${t.id}`}>
                      <div>
                        <p className="font-medium text-sm">{t.user?.fullName}</p>
                        <p className="text-xs text-muted-foreground">{t.user?.mobile}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">في الانتظار</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disputed requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              طلبات متنازع عليها
              <Link href="/admin/requests">
                <Button variant="ghost" size="sm">عرض الكل</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {disputedRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">لا توجد نزاعات</p>
            ) : (
              <div className="space-y-3">
                {disputedRequests.slice(0, 5).map((r: any) => (
                  <Link href={`/admin/requests/${r.id}`} key={r.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer border border-border" data-testid={`disputed-req-${r.id}`}>
                      <div>
                        <p className="font-medium text-sm">طلب #{r.id}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-800 border-0 text-xs">متنازع عليه</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
