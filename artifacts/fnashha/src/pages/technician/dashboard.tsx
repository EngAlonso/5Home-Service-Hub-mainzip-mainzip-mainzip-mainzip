import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useListRequests, useGetPointsBalance, getGetPointsBalanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Star, CheckCircle, FileText, Search } from "lucide-react";
import { REQUEST_STATUS_MAP } from "@/lib/status";

export default function TechnicianDashboard() {
  const { currentUser } = useAuth();
  const { data: requestsData } = useListRequests();
  const requests = (requestsData as any)?.data || [];

  const { data: balanceData } = useGetPointsBalance({
    query: { queryKey: getGetPointsBalanceQueryKey() },
  });
  const balance = (balanceData as any)?.balance || 0;

  const activeRequests = requests.filter((r: any) =>
    ["technician_selected", "in_progress"].includes(r.status)
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">أهلاً، {currentUser?.fullName}</h1>
        <p className="text-muted-foreground mt-1">هنا ملخص نشاطك على فنشها</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{balance}</p>
              <p className="text-sm text-muted-foreground">رصيد النقاط</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{activeRequests.length}</p>
              <p className="text-sm text-muted-foreground">طلبات نشطة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">
                {requests.filter((r: any) => r.status === "completed").length}
              </p>
              <p className="text-sm text-muted-foreground">طلبات مكتملة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Link href="/technician/requests">
        <Card className="border-2 border-dashed border-primary/30 hover:border-primary cursor-pointer mb-6 bg-primary/3 transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">الطلبات المتاحة</p>
              <p className="text-sm text-muted-foreground">تصفح الطلبات في نطاق خدمتك وقدّم عرضك</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Active requests */}
      {activeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الطلبات النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRequests.map((r: any) => {
                const status = REQUEST_STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100" };
                return (
                  <Link href={`/technician/requests/${r.id}`} key={r.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 border border-border cursor-pointer" data-testid={`row-request-${r.id}`}>
                      <div>
                        <p className="font-medium text-sm">{r.description?.substring(0, 60)}...</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.address}</p>
                      </div>
                      <Badge className={`text-xs ${status.color} border-0`}>{status.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
