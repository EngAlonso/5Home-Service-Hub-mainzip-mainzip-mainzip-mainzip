import {
  useGetUser, getGetUserQueryKey,
  useGetTechnicianProfile, getGetTechnicianProfileQueryKey,
  useApproveTechnician, useRejectTechnician,
  getListPendingTechniciansQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Star, CheckCircle, XCircle, Wallet, ZoomIn } from "lucide-react";

const APPROVAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:  { label: "بانتظار المراجعة", color: "bg-amber-100 text-amber-800" },
  approved: { label: "موافق عليه",       color: "bg-green-100 text-green-800" },
  rejected: { label: "مرفوض",            color: "bg-red-100 text-red-800" },
};

const USER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:    { label: "نشط",              color: "bg-green-100 text-green-800" },
  pending:   { label: "بانتظار الموافقة", color: "bg-amber-100 text-amber-800" },
  suspended: { label: "موقوف",            color: "bg-yellow-100 text-yellow-800" },
  banned:    { label: "محظور",            color: "bg-red-100 text-red-800" },
  rejected:  { label: "مرفوض",           color: "bg-red-100 text-red-800" },
};

function ImageViewer({ src, label }: { src: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative group w-full h-32 rounded-xl overflow-hidden border bg-muted hover:border-primary/40 transition-colors"
        >
          <img src={src} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white" />
          </div>
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-2">
          <img src={src} alt={label} className="w-full rounded-lg object-contain max-h-[80vh]" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminTechnicianDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = parseInt(id);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: user } = useGetUser(userId, { query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) } });
  const { data: profile } = useGetTechnicianProfile(userId, { query: { enabled: !!userId, queryKey: getGetTechnicianProfileQueryKey(userId) } });

  const approveMutation = useApproveTechnician();
  const rejectMutation = useRejectTechnician();

  const u = user as any;
  const p = profile as any;
  const approvalInfo = APPROVAL_STATUS_MAP[p?.approvalStatus] || { label: "—", color: "bg-gray-100 text-gray-600" };
  const userStatusInfo = USER_STATUS_MAP[u?.status] || { label: u?.status, color: "bg-gray-100 text-gray-600" };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: getGetTechnicianProfileQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: getListPendingTechniciansQueryKey() });
  };

  const handleApprove = () => {
    approveMutation.mutate(
      { id: userId, data: {} as any },
      {
        onSuccess: () => { invalidate(); toast({ title: "✅ تم الموافقة على الفني وتفعيل حسابه" }); },
        onError: (err: any) => toast({ title: "خطأ", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({ title: "يرجى كتابة سبب الرفض", variant: "destructive" });
      return;
    }
    rejectMutation.mutate(
      { id: userId, data: { reason: rejectReason } as any },
      {
        onSuccess: () => { invalidate(); setShowRejectForm(false); toast({ title: "تم رفض الطلب" }); },
        onError: (err: any) => toast({ title: "خطأ", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  if (!u) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;

  const isPending = p?.approvalStatus === "pending";
  const hasImages = p?.personalPhoto || p?.nationalIdFront || p?.nationalIdBack;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{u.fullName}</h1>
          <p className="text-muted-foreground">{u.mobile}</p>
          {u.email && <p className="text-sm text-muted-foreground">{u.email}</p>}
        </div>
        {isPending && !showRejectForm && (
          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              data-testid="button-approve"
            >
              <CheckCircle className="w-4 h-4 ms-1" /> موافقة وتفعيل
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectForm(true)}
              data-testid="button-reject"
            >
              <XCircle className="w-4 h-4 ms-1" /> رفض
            </Button>
          </div>
        )}
      </div>

      {/* Reject Form */}
      {showRejectForm && (
        <Card className="border-destructive/40 bg-red-50">
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-destructive">سبب الرفض</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب رفض الطلب بوضوح..."
              rows={3}
              className="bg-white"
              data-testid="input-reject-reason"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? "جاري الرفض..." : "تأكيد الرفض"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">حالة حساب المستخدم</p>
            <Badge className={`${userStatusInfo.color} border-0`}>{userStatusInfo.label}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">حالة الموافقة</p>
            <Badge className={`${approvalInfo.color} border-0`}>{approvalInfo.label}</Badge>
          </CardContent>
        </Card>
        {p?.pointsBalance !== undefined && (
          <Card>
            <CardContent className="p-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <div>
                <p className="font-bold">{p.pointsBalance}</p>
                <p className="text-xs text-muted-foreground">نقاط</p>
              </div>
            </CardContent>
          </Card>
        )}
        {p?.averageRating > 0 && (
          <Card>
            <CardContent className="p-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              <div>
                <p className="font-bold">{p.averageRating?.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{p.reviewCount} تقييم</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Identity Images */}
      {hasImages && (
        <Card>
          <CardHeader><CardTitle className="text-base">صور التحقق من الهوية</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {p?.personalPhoto && (
                <ImageViewer src={p.personalPhoto} label="الصورة الشخصية" />
              )}
              {p?.nationalIdFront && (
                <ImageViewer src={p.nationalIdFront} label="البطاقة القومية (أمام)" />
              )}
              {p?.nationalIdBack && (
                <ImageViewer src={p.nationalIdBack} label="البطاقة القومية (خلف)" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Details */}
      {p && (
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات الفني</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">رقم البطاقة: </span><span className="font-medium">{p.nationalId}</span></div>
            {u.email && <div><span className="text-muted-foreground">البريد الإلكتروني: </span>{u.email}</div>}
            <div><span className="text-muted-foreground">تاريخ التسجيل: </span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-EG") : "—"}</div>

            {p.rejectionReason && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3">
                <p className="font-semibold text-sm">سبب الرفض:</p>
                <p className="mt-1">{p.rejectionReason}</p>
              </div>
            )}

            {p.services && p.services.length > 0 && (
              <div>
                <p className="font-medium mb-2">الخدمات:</p>
                <div className="flex flex-wrap gap-2">
                  {p.services.map((s: any) => s && <Badge key={s.id} variant="secondary">{s.nameAr}</Badge>)}
                </div>
              </div>
            )}

            {p.areas && p.areas.length > 0 && (
              <div>
                <p className="font-medium mb-2">المناطق:</p>
                <div className="flex flex-wrap gap-2">
                  {p.areas.map((a: any) => a && <Badge key={a.id} variant="outline">{a.nameAr}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
