import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListServices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, Trash2, Layers } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function apiCall(path: string, method: string, body?: any, token?: string) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === "DELETE" && res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "خطأ في الخادم");
  return data;
}

export default function AdminCommissionRanges() {
  const { toast } = useToast();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [serviceId, setServiceId] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: ranges = [], isLoading } = useQuery<any[]>({
    queryKey: ["commission-ranges"],
    queryFn: () => apiCall("/commission-ranges", "GET", undefined, token || ""),
    enabled: !!token,
  });

  const { data: services = [] } = useListServices();
  const serviceList = Array.isArray(services) ? services : [];

  const handleAdd = async () => {
    if (!minPrice || !maxPrice || !requiredPoints) {
      toast({ title: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (parseFloat(minPrice) >= parseFloat(maxPrice)) {
      toast({ title: "الحد الأدنى يجب أن يكون أقل من الحد الأقصى", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiCall("/commission-ranges", "POST", {
        serviceId: serviceId !== "all" ? parseInt(serviceId) : null,
        minPrice: parseFloat(minPrice),
        maxPrice: parseFloat(maxPrice),
        requiredPoints: parseInt(requiredPoints),
      }, token || "");
      qc.invalidateQueries({ queryKey: ["commission-ranges"] });
      toast({ title: "تم إضافة النطاق بنجاح" });
      setShowForm(false);
      setMinPrice(""); setMaxPrice(""); setRequiredPoints(""); setServiceId("all");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiCall(`/commission-ranges/${id}`, "DELETE", undefined, token || "");
      qc.invalidateQueries({ queryKey: ["commission-ranges"] });
      toast({ title: "تم حذف النطاق" });
    } catch (err: any) {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">نطاقات العمولة</h1>
          <p className="text-sm text-muted-foreground">
            تحديد عدد النقاط المطلوبة حسب نطاق السعر — النقاط الكلية = نقاط النطاق + نقاط المنطقة الإضافية
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="button-add-range">
          <PlusCircle className="w-4 h-4 ms-2" />
          إضافة نطاق
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader><CardTitle className="text-base">نطاق جديد</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">الخدمة</label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="mt-1" data-testid="select-service">
                    <SelectValue placeholder="كل الخدمات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الخدمات</SelectItem>
                    {serviceList.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">النقاط المطلوبة *</label>
                <Input
                  type="number"
                  value={requiredPoints}
                  onChange={(e) => setRequiredPoints(e.target.value)}
                  placeholder="75"
                  className="mt-1"
                  data-testid="input-required-points"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الحد الأدنى للسعر (جنيه) *</label>
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                  data-testid="input-min-price"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الحد الأقصى للسعر (جنيه) *</label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="2000"
                  className="mt-1"
                  data-testid="input-max-price"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={saving} data-testid="button-save-range">
                {saving ? "جاري الحفظ..." : "إضافة"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading ? (
          [1,2,3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)
        ) : ranges.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد نطاقات عمولة محددة</p>
              <p className="text-xs mt-1">أضف نطاقات لتحديد النقاط المطلوبة عند تقديم العروض</p>
            </CardContent>
          </Card>
        ) : (
          ranges.map((r: any) => (
            <Card key={r.id} data-testid={`row-range-${r.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                  <Badge variant={r.service ? "default" : "secondary"} className="text-xs">
                    {r.service ? r.service.nameAr : "كل الخدمات"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {parseFloat(r.minPrice).toLocaleString("ar-EG")} — {parseFloat(r.maxPrice).toLocaleString("ar-EG")} جنيه
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xl font-black text-primary">{r.requiredPoints}</p>
                    <p className="text-xs text-muted-foreground">نقطة</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(r.id)}
                    data-testid={`button-delete-range-${r.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
