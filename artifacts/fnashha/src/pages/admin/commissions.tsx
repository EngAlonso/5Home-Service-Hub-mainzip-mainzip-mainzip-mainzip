import { useState } from "react";
import {
  useListCommissions, getListCommissionsQueryKey,
  useCreateCommission,
  useListServices,
  useListAreas,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, DollarSign } from "lucide-react";

export default function AdminCommissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [serviceId, setServiceId] = useState("all");
  const [areaId, setAreaId] = useState("all");
  const [type, setType] = useState("fixed");
  const [value, setValue] = useState("");

  const { data: commissions = [], isLoading } = useListCommissions({ query: { queryKey: getListCommissionsQueryKey() } });
  const { data: services = [] } = useListServices();
  const { data: areas = [] } = useListAreas(undefined as any);
  const createMutation = useCreateCommission();

  const handleCreate = () => {
    if (!value) { toast({ title: "القيمة مطلوبة", variant: "destructive" }); return; }
    createMutation.mutate(
      { data: { serviceId: serviceId && serviceId !== "all" ? parseInt(serviceId) : undefined, areaId: areaId && areaId !== "all" ? parseInt(areaId) : undefined, type, value: parseFloat(value) } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommissionsQueryKey() });
          toast({ title: "تم إضافة العمولة" });
          setShowForm(false); setValue(""); setServiceId(""); setAreaId("");
        },
      }
    );
  };

  const commList = Array.isArray(commissions) ? commissions : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">إدارة العمولات</h1>
          <p className="text-muted-foreground text-sm">قواعد احتساب عمولة تقديم العروض</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="button-add-commission">
          <PlusCircle className="w-4 h-4 ms-2" />
          إضافة عمولة
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader><CardTitle className="text-base">عمولة جديدة</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">الخدمة (اختياري)</label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="mt-1" data-testid="select-service">
                  <SelectValue placeholder="كل الخدمات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الخدمات</SelectItem>
                  {(services as any[]).map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">نوع العمولة</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1" data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">ثابتة (نقاط)</SelectItem>
                  <SelectItem value="percentage">نسبة مئوية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">القيمة *</label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "fixed" ? "50 نقطة" : "10%"} className="mt-1" data-testid="input-value" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-save">إضافة</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading ? (
          [1,2,3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)
        ) : commList.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد عمولات محددة</p>
            </CardContent>
          </Card>
        ) : commList.map((c: any) => (
          <Card key={c.id} data-testid={`row-commission-${c.id}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {c.service ? c.service.nameAr : "كل الخدمات"}
                  {c.area ? ` — ${c.area.nameAr}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.type === "fixed" ? `${c.value} نقطة ثابتة` : `${c.value}% من السعر`}
                </p>
              </div>
              <Badge variant="secondary">{c.type === "fixed" ? "ثابتة" : "نسبة مئوية"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
