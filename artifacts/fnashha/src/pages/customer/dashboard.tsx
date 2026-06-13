import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useListRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, PlusCircle, CheckCircle, Clock, MessageCircle } from "lucide-react";
import { REQUEST_STATUS_MAP } from "@/lib/status";

export default function CustomerDashboard() {
  const { currentUser } = useAuth();
  const { data: requestsData, isLoading } = useListRequests();
  const requests = (requestsData as any)?.data || [];

  const active = requests.filter((r: any) => !["completed", "cancelled_by_customer", "cancelled_by_technician", "cancelled_by_admin"].includes(r.status));
  const completed = requests.filter((r: any) => r.status === "completed");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">أهلاً، {currentUser?.fullName}</h1>
        <p className="text-muted-foreground mt-1">مرحباً بك في فنشها. هنا ملخص حسابك.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{requests.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{active.length}</p>
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
              <p className="text-2xl font-black text-foreground">{completed.length}</p>
              <p className="text-sm text-muted-foreground">طلبات مكتملة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick action */}
      <Link href="/customer/requests/new">
        <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors cursor-pointer mb-8 bg-primary/3">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <PlusCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">إنشاء طلب جديد</p>
              <p className="text-sm text-muted-foreground">احصل على عروض من أفضل الفنيين</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            آخر الطلبات
            <Link href="/customer/requests">
              <Button variant="ghost" size="sm">عرض الكل</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات بعد</p>
              <Link href="/customer/requests/new">
                <Button className="mt-4" size="sm">أنشئ أول طلب</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((r: any) => {
                const status = REQUEST_STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <Link href={`/customer/requests/${r.id}`} key={r.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border" data-testid={`row-request-${r.id}`}>
                      <div>
                        <p className="font-medium text-sm">{r.description?.substring(0, 50)}...</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</p>
                      </div>
                      <Badge className={`text-xs ${status.color} border-0`}>{status.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
