import { Link } from "wouter";
import { useListRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ClipboardList, ChevronLeft } from "lucide-react";
import { REQUEST_STATUS_MAP } from "@/lib/status";

export default function CustomerRequests() {
  const { data: requestsData, isLoading } = useListRequests();
  const requests = (requestsData as any)?.data || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">طلباتي</h1>
          <p className="text-muted-foreground text-sm mt-1">جميع طلبات الخدمة التي قدمتها</p>
        </div>
        <Link href="/customer/requests/new">
          <Button data-testid="button-new-request">
            <PlusCircle className="w-4 h-4 ms-2" />
            طلب جديد
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-semibold text-lg mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground text-sm mb-6">أنشئ طلبك الأول واستقبل عروض الفنيين</p>
            <Link href="/customer/requests/new">
              <Button>إنشاء طلب جديد</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => {
            const status = REQUEST_STATUS_MAP[r.status] || { label: r.status, color: "bg-gray-100 text-gray-600" };
            return (
              <Link href={`/customer/requests/${r.id}`} key={r.id}>
                <Card className="hover:shadow-md transition-all cursor-pointer" data-testid={`card-request-${r.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${status.color} border-0`}>{status.label}</Badge>
                          {r.offersCount > 0 && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              {r.offersCount} عرض
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm line-clamp-2">{r.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{r.address}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</p>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
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
