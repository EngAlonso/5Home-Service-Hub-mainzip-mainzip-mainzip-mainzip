import { useEffect, useState } from "react";
import {
  useGetRequest, getGetRequestQueryKey, getListRequestsQueryKey,
  useUpdateRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { REQUEST_STATUS_MAP } from "@/lib/status";
import { MapPin, Phone, Clock, User, TrendingUp, ArrowUpDown } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const ADMIN_STATUSES = [
  { value: "pending", label: "بانتظار العروض" },
  { value: "in_progress", label: "جاري التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled_by_admin", label: "إلغاء من الإدارة" },
  { value: "disputed", label: "متنازع عليه" },
];

export default function AdminRequestDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reqId = parseInt(id);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [priceAdjustments, setPriceAdjustments] = useState<any[]>([]);

  const { data: request, isLoading } = useGetRequest(reqId, {
    query: { enabled: !!reqId, queryKey: getGetRequestQueryKey(reqId) },
  });

  const updateMutation = useUpdateRequest();

  // Fetch price adjustments
  useEffect(() => {
    if (!reqId) return;
    fetch(`${BASE_URL}/api/requests/${reqId}/price-adjustments`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPriceAdjustments(data); })
      .catch(() => {});
  }, [reqId]);

  if (isLoading) return <div className="p-6"><div className="h-40 bg-muted rounded-xl animate-pulse" /></div>;
  if (!request) return <div className="p-6 text-center text-muted-foreground">الطلب غير موجود</div>;

  const req = request as any;
  const statusInfo = REQUEST_STATUS_MAP[req.status] || { label: req.status, color: "bg-gray-100" };

  const handleUpdate = () => {
    updateMutation.mutate(
      { id: reqId, data: { status: newStatus || req.status, adminNote } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(reqId) });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          toast({ title: "تم التحديث" });
        },
        onError: (err: any) => toast({ title: "خطأ", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلب #{req.id}</h1>
          <Badge className={`mt-2 ${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
        </div>
      </div>

      {/* Request details */}
      <Card>
        <CardHeader><CardTitle className="text-base">بيانات الطلب</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {req.customer && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{req.customer.fullName} — {req.customer.mobile}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{req.mobile}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <span>{req.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{new Date(req.createdAt).toLocaleDateString("ar-EG")}</span>
          </div>
          <div className="pt-2 border-t">
            <p className="text-muted-foreground mb-1">الوصف:</p>
            <p>{req.description}</p>
          </div>
          {req.agreedPrice && (
            <div className="pt-2 border-t">
              <p className="font-semibold text-primary">السعر المتفق عليه: {req.agreedPrice} جنيه</p>
            </div>
          )}
          {req.adminNote && (
            <div className="pt-2 border-t">
              <p className="text-muted-foreground mb-1">ملاحظة الإدارة:</p>
              <p>{req.adminNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price adjustments section */}
      {priceAdjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              سجل تعديلات السعر ({priceAdjustments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priceAdjustments.map((adj: any, i: number) => {
              const originalTotal = (adj.originalLaborCost ?? 0) + (adj.originalSpareParts ?? 0);
              const newTotal = (adj.newLaborCost ?? 0) + (adj.newSpareParts ?? 0);
              const diff = newTotal - originalTotal;

              return (
                <div key={adj.id ?? i} className="rounded-lg border border-border p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(adj.createdAt).toLocaleString("ar-EG")}
                    </span>
                    <Badge
                      variant="outline"
                      className={diff > 0 ? "border-red-300 text-red-700 bg-red-50" : diff < 0 ? "border-green-300 text-green-700 bg-green-50" : ""}
                    >
                      {diff > 0 ? "+" : ""}{diff.toFixed(2)} جنيه
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-xs text-muted-foreground mb-1">السعر الأصلي</p>
                      <p className="font-semibold">{originalTotal.toFixed(2)} جنيه</p>
                      {adj.originalLaborCost != null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          خدمة: {adj.originalLaborCost} ج
                          {adj.originalSpareParts ? ` + قطع: ${adj.originalSpareParts} ج` : ""}
                        </p>
                      )}
                    </div>
                    <div className={`rounded p-2 ${diff > 0 ? "bg-red-50" : "bg-green-50"}`}>
                      <p className={`text-xs mb-1 ${diff > 0 ? "text-red-600" : "text-green-600"}`}>السعر الجديد</p>
                      <p className="font-semibold">{newTotal.toFixed(2)} جنيه</p>
                      {adj.newLaborCost != null && (
                        <p className={`text-xs mt-1 ${diff > 0 ? "text-red-500" : "text-green-500"}`}>
                          خدمة: {adj.newLaborCost} ج
                          {adj.newSpareParts ? ` + قطع: ${adj.newSpareParts} ج` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {adj.reason && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium">السبب:</span> {adj.reason}
                    </p>
                  )}
                  {adj.customerApprovalStatus && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">قرار العميل: </span>
                      <span className={
                        adj.customerApprovalStatus === "approved" ? "text-green-600 font-medium" :
                        adj.customerApprovalStatus === "rejected" ? "text-red-600 font-medium" :
                        "text-orange-600 font-medium"
                      }>
                        {adj.customerApprovalStatus === "approved" ? "✓ وافق" :
                         adj.customerApprovalStatus === "rejected" ? "✗ رفض" : "⏳ بانتظار"}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Technician info */}
      {req.selectedTechnician && (
        <Card>
          <CardHeader><CardTitle className="text-base">الفني المختار</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3 text-sm">
            {req.selectedTechnician.profileImage && (
              <img src={req.selectedTechnician.profileImage} className="w-10 h-10 rounded-full object-cover" alt="" />
            )}
            <div>
              <p className="font-medium">{req.selectedTechnician.fullName}</p>
              <p className="text-muted-foreground">{req.selectedTechnician.mobile}</p>
            </div>
            {req.agreedPrice && (
              <div className="mr-auto flex items-center gap-1 text-primary font-semibold">
                <TrendingUp className="w-4 h-4" />
                {req.agreedPrice} جنيه
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin controls */}
      <Card>
        <CardHeader><CardTitle className="text-base">تحديث الطلب</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">تغيير الحالة</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-1" data-testid="select-status">
                <SelectValue placeholder="اختر حالة جديدة" />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">ملاحظة الإدارة</label>
            <Textarea
              placeholder="ملاحظة داخلية..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="mt-1"
              rows={3}
              data-testid="textarea-admin-note"
            />
          </div>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-update">
            {updateMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
