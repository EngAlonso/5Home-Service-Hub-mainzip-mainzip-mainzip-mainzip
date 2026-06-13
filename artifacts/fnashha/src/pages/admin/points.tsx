import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function apiCall(path: string, method: string, body?: any, token?: string) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "خطأ في الخادم");
  return data;
}

export default function AdminPoints() {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [techMobile, setTechMobile] = useState("");
  const [techId, setTechId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [deductLoading, setDeductLoading] = useState(false);

  const { data: allTechs } = useListUsers({ role: "technician" } as any);

  const { data: transactions = [], refetch: refetchTxns } = useQuery({
    queryKey: ["adminPointTransactions", techId],
    queryFn: () =>
      apiCall(`/points/transactions?technicianId=${techId}`, "GET", undefined, token || ""),
    enabled: !!techId,
    retry: false,
  });

  const techs = (allTechs as any)?.data || [];
  const txns = Array.isArray(transactions) ? transactions : [];

  const findTech = () => {
    const tech = techs.find((t: any) => t.mobile === techMobile);
    if (tech) setTechId(tech.id);
    else toast({ title: "الفني غير موجود", variant: "destructive" });
  };

  const selectedTech = techs.find((t: any) => t.id === techId);

  const handleAdd = async () => {
    if (!techId || !amount) {
      toast({ title: "أدخل البيانات المطلوبة", variant: "destructive" });
      return;
    }
    setAddLoading(true);
    try {
      await apiCall("/points/add", "POST", {
        technicianId: techId,
        amount: parseInt(amount),
        description,
      }, token || "");
      refetchTxns();
      toast({ title: "تم إضافة النقاط بنجاح", description: `تمت إضافة ${amount} نقطة للفني ${selectedTech?.fullName}` });
      setAmount("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "خطأ في إضافة النقاط", description: err.message, variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeduct = async () => {
    if (!techId || !amount) {
      toast({ title: "أدخل البيانات المطلوبة", variant: "destructive" });
      return;
    }
    setDeductLoading(true);
    try {
      await apiCall("/points/deduct", "POST", {
        technicianId: techId,
        amount: parseInt(amount),
        description,
      }, token || "");
      refetchTxns();
      toast({ title: "تم خصم النقاط بنجاح", description: `تم خصم ${amount} نقطة من الفني ${selectedTech?.fullName}` });
      setAmount("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "خطأ في خصم النقاط", description: err.message, variant: "destructive" });
    } finally {
      setDeductLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">إدارة النقاط</h1>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">إضافة / خصم نقاط</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="رقم هاتف الفني"
              value={techMobile}
              onChange={(e) => setTechMobile(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findTech()}
              data-testid="input-tech-mobile"
            />
            <Button variant="outline" onClick={findTech} data-testid="button-find-tech">بحث</Button>
          </div>

          {selectedTech && (
            <div className="bg-primary/5 rounded-lg p-3 text-sm">
              <p className="font-semibold">{selectedTech.fullName}</p>
              <p className="text-muted-foreground">{selectedTech.mobile}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">الكمية *</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="mt-1" data-testid="input-amount" />
            </div>
            <div>
              <label className="text-sm font-medium">السبب</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="سبب الإضافة/الخصم" className="mt-1" data-testid="input-description" />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAdd}
              disabled={addLoading || !techId}
              data-testid="button-add"
            >
              <TrendingUp className="w-4 h-4 ms-2" />
              {addLoading ? "جاري الإضافة..." : "إضافة نقاط"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeduct}
              disabled={deductLoading || !techId}
              data-testid="button-deduct"
            >
              <TrendingDown className="w-4 h-4 ms-2" />
              {deductLoading ? "جاري الخصم..." : "خصم نقاط"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-4 h-4" />
            {selectedTech ? `معاملات ${selectedTech.fullName}` : "آخر المعاملات"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {txns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {techId ? "لا توجد معاملات لهذا الفني" : "ابحث عن فني لعرض معاملاته"}
            </p>
          ) : (
            <div className="space-y-2">
              {txns.slice(0, 20).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm" data-testid={`txn-${t.id}`}>
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${t.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "credit" ? "+" : "-"}{t.amount}
                    </span>
                    <Badge variant="outline" className="text-xs">رصيد: {t.balanceAfter}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
