import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetRequest, getGetRequestQueryKey,
  useListOffers, getListOffersQueryKey,
  useSelectOffer,
  useCancelRequest,
  useCompleteRequest,
  useCreateRating,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { REQUEST_STATUS_MAP, OFFER_STATUS_MAP } from "@/lib/status";
import {
  Star, MessageCircle, CheckCircle, XCircle, MapPin, Phone, Clock,
  Images, Volume2, X, AlertCircle, DollarSign, TrendingUp, History, Clock3,
} from "lucide-react";

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

function PriceRow({ label, old: oldVal, next: newVal, highlight = false }: { label: string; old?: string | number | null; next?: string | number | null; highlight?: boolean }) {
  const oldNum = parseFloat(String(oldVal || 0)) || 0;
  const newNum = parseFloat(String(newVal || 0)) || 0;
  return (
    <div className={`grid grid-cols-3 gap-2 text-sm py-2 ${highlight ? "font-bold border-t mt-1 pt-3" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-center">{oldNum > 0 ? `${oldNum} جنيه` : "—"}</span>
      <span className={`text-center ${newNum !== oldNum && newNum > 0 ? "text-orange-700 font-bold" : ""}`}>
        {newNum > 0 ? `${newNum} جنيه` : "—"}
      </span>
    </div>
  );
}

export default function CustomerRequestDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, token } = useAuth();
  const reqId = parseInt(id);

  const { data: request, isLoading } = useGetRequest(reqId, {
    query: { enabled: !!reqId, refetchInterval: 20_000, queryKey: getGetRequestQueryKey(reqId) },
  });
  const { data: offers = [] } = useListOffers(
    reqId,
    { query: { enabled: !!reqId, refetchInterval: 20_000, queryKey: getListOffersQueryKey(reqId) } }
  );

  const selectMutation    = useSelectOffer();
  const cancelMutation    = useCancelRequest();
  const completeMutation  = useCompleteRequest();
  const ratingMutation    = useCreateRating();

  const [ratingStars, setRatingStars] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [priceAdj, setPriceAdj] = useState<any | null>(null);
  const [adjHistory, setAdjHistory] = useState<any[]>([]);
  const [respondingAdj, setRespondingAdj] = useState(false);
  const [adjLoadError, setAdjLoadError] = useState(false);

  const req = request as any;

  // Load pending price adjustment
  useEffect(() => {
    if (req?.status === "price_change_requested") {
      setAdjLoadError(false);
      apiCall(`/requests/${reqId}/price-adjustment`, "GET", undefined, token || "")
        .then((data) => { setPriceAdj(data); setAdjLoadError(false); })
        .catch(() => { setPriceAdj(null); setAdjLoadError(true); });
    } else {
      setPriceAdj(null);
      setAdjLoadError(false);
    }
  }, [req?.status, reqId, token]);

  // Load adjustment history whenever request data loads
  useEffect(() => {
    if (req?.id) {
      apiCall(`/requests/${reqId}/price-adjustments`, "GET", undefined, token || "")
        .then((data) => setAdjHistory(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [req?.id, req?.status, reqId, token]);

  if (isLoading) return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {[1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
    </div>
  );
  if (!request) return <div className="p-6 text-center text-muted-foreground">الطلب غير موجود</div>;

  const statusInfo = REQUEST_STATUS_MAP[req.status] || { label: req.status, color: "bg-gray-100 text-gray-600" };
  const canCancel = ["pending", "offers_received"].includes(req.status);
  const canChat = ["technician_selected", "in_progress", "price_change_requested", "waiting_approval"].includes(req.status);
  const canComplete = req.status === "waiting_approval";
  const isCustomer = currentUser?.role === "customer";
  const isMyRequest = req.customerId === currentUser?.id;
  const isDone = ["completed", "cancelled_by_customer", "cancelled_by_technician", "cancelled_by_admin"].includes(req.status);

  const handleSelectOffer = (offerId: number) => {
    selectMutation.mutate(
      { requestId: reqId, offerId, data: {} as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(reqId) });
          queryClient.invalidateQueries({ queryKey: getListOffersQueryKey(reqId) });
          toast({ title: "تم اختيار الفني", description: "يمكنك الآن التواصل مع الفني" });
        },
        onError: (err: any) => toast({ title: "خطأ", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  const handleCancel = () => {
    cancelMutation.mutate(
      { id: reqId, data: { reason: "إلغاء من قبل العميل" } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(reqId) });
          toast({ title: "تم إلغاء الطلب" });
        },
        onError: (err: any) => toast({ title: "خطأ", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  const handleComplete = () => {
    completeMutation.mutate(
      { id: reqId, data: {} as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(reqId) });
          toast({ title: "تم تأكيد الإنجاز" });
          setShowRating(true);
        },
        onError: (err: any) => toast({ title: "خطأ", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  const handleRespondPriceAdj = async (approved: boolean) => {
    setRespondingAdj(true);
    try {
      await apiCall(`/requests/${reqId}/price-adjustment/respond`, "POST", { approved }, token || "");
      queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(reqId) });
      toast({ title: approved ? "تم قبول تعديل السعر ✓" : "تم رفض التعديل — يستمر بالسعر الأصلي" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setRespondingAdj(false);
    }
  };

  const handleSubmitRating = () => {
    ratingMutation.mutate(
      { data: { requestId: reqId, technicianId: req.selectedTechnicianId, stars: ratingStars, review: ratingReview } as any },
      {
        onSuccess: () => { toast({ title: "شكراً على تقييمك!" }); setShowRating(false); },
        onError: () => { toast({ title: "خطأ في إرسال التقييم", variant: "destructive" }); },
      }
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">تفاصيل الطلب #{req.id}</h1>
          <Badge className={`mt-2 ${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canChat && (
            <Link href={`/customer/chat/${reqId}`}>
              <Button size="sm">
                <MessageCircle className="w-4 h-4 ms-2" />
                المحادثة
              </Button>
            </Link>
          )}
          {canComplete && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleComplete} disabled={completeMutation.isPending}>
              <CheckCircle className="w-4 h-4 ms-2" />
              {completeMutation.isPending ? "جاري..." : "نعم، تم التنفيذ"}
            </Button>
          )}
          {canComplete && (
            <Button size="sm" variant="destructive" onClick={() => {
              // Reject completion — revert to in_progress
              apiCall(`/requests/${reqId}/cancel`, "POST", { reason: "لم يتم التنفيذ بشكل صحيح" }, token || "")
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(reqId) });
                  toast({ title: "تم إلغاء تأكيد الإنجاز", description: "تواصل مع الدعم إذا احتجت مساعدة" });
                })
                .catch(() => toast({ title: "خطأ", variant: "destructive" }));
            }}>
              <XCircle className="w-4 h-4 ms-2" />
              لا، لم يتم
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
              <XCircle className="w-4 h-4 ms-2" />
              إلغاء الطلب
            </Button>
          )}
        </div>
      </div>

      {/* Status notices */}
      {req.status === "in_progress" && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>الفني يعمل على طلبك. ستتمكن من تأكيد الإنجاز بعد أن يُبلّغك الفني بانتهاء العمل.</span>
        </div>
      )}
      {req.status === "waiting_approval" && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">أعلن الفني إتمام تنفيذ الطلب. هل تم تنفيذ الخدمة بنجاح؟ اضغط "نعم، تم التنفيذ" للتأكيد.</span>
        </div>
      )}

      {/* Price change comparison card */}
      {req.status === "price_change_requested" && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <DollarSign className="w-4 h-4" />
              طلب تعديل السعر — مقارنة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adjLoadError ? (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                تعذر تحميل تفاصيل التعديل. يرجى إعادة المحاولة.
                <Button size="sm" variant="outline" onClick={() => {
                  setAdjLoadError(false);
                  apiCall(`/requests/${reqId}/price-adjustment`, "GET", undefined, token || "")
                    .then(setPriceAdj).catch(() => setAdjLoadError(true));
                }}>
                  إعادة
                </Button>
              </div>
            ) : !priceAdj ? (
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                جاري تحميل تفاصيل التعديل...
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 border border-orange-200">
                  {/* Table header */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground mb-2 pb-2 border-b">
                    <span>البيان</span>
                    <span className="text-center">السعر الأصلي</span>
                    <span className="text-center text-orange-700">السعر الجديد</span>
                  </div>
                  <PriceRow
                    label="سعر الخدمة"
                    old={priceAdj.oldPrice}
                    next={priceAdj.newPrice}
                  />
                  {(parseFloat(priceAdj.oldSpareParts || "0") > 0 || parseFloat(priceAdj.newSpareParts || "0") > 0) && (
                    <PriceRow
                      label="قطع الغيار"
                      old={priceAdj.oldSpareParts}
                      next={priceAdj.newSpareParts}
                    />
                  )}
                  <PriceRow
                    label="الإجمالي"
                    old={(parseFloat(priceAdj.oldPrice || "0") + parseFloat(priceAdj.oldSpareParts || "0")) || null}
                    next={parseFloat(priceAdj.newPrice || "0") + parseFloat(priceAdj.newSpareParts || "0")}
                    highlight
                  />
                </div>

                {priceAdj.newDescription && (
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-muted-foreground mb-1">سبب التعديل:</p>
                    <p className="text-sm">{priceAdj.newDescription}</p>
                  </div>
                )}

                {priceAdj.supportingImage && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">صورة مرفقة:</p>
                    <button onClick={() => setLightboxImg(priceAdj.supportingImage)} className="block">
                      <img src={priceAdj.supportingImage} alt="" className="rounded-lg border border-orange-200 max-h-40 object-contain" />
                    </button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  طُلب في: {new Date(priceAdj.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {priceAdj.technicianName && ` • الفني: ${priceAdj.technicianName}`}
                </p>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => handleRespondPriceAdj(true)}
                    disabled={respondingAdj}
                    data-testid="button-accept-price"
                  >
                    <CheckCircle className="w-4 h-4 ms-1" />
                    قبول التعديل
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => handleRespondPriceAdj(false)}
                    disabled={respondingAdj}
                    data-testid="button-reject-price"
                  >
                    <XCircle className="w-4 h-4 ms-1" />
                    رفض التعديل
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Request Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">بيانات الطلب</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span>{req.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>{req.mobile}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>{new Date(req.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          <div className="pt-2 border-t">
            <p className="text-muted-foreground mb-1">الوصف:</p>
            <p>{req.description}</p>
          </div>
          {req.agreedPrice && (
            <div className="pt-2 border-t flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary text-lg">السعر المتفق عليه: {parseFloat(req.agreedPrice)} جنيه</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images */}
      {req.images && req.images.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Images className="w-4 h-4" />صور المشكلة ({req.images.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {req.images.map((src: string, i: number) => (
                <button key={i} onClick={() => setLightboxImg(src)} className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio */}
      {req.audioUrl && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Volume2 className="w-4 h-4" />تسجيل صوتي</CardTitle></CardHeader>
          <CardContent>
            <audio controls src={req.audioUrl} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Offers */}
      {(offers as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">العروض المقدمة ({(offers as any[]).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(offers as any[]).map((offer: any) => {
                const offerStatus = OFFER_STATUS_MAP[offer.status] || { label: offer.status, color: "bg-gray-100" };
                const tech = offer.technician;
                const laborPrice = parseFloat(offer.price) || 0;
                const sparePartsPrice = parseFloat(offer.spareParts) || 0;
                const totalPrice = laborPrice + sparePartsPrice;
                const isSelected = offer.status === "selected";

                return (
                  <div
                    key={offer.id}
                    className={`border rounded-xl p-4 ${isSelected ? "border-green-500 bg-green-50" : offer.status === "rejected" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0">
                        {tech?.profileImage ? (
                          <img src={tech.profileImage} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <span className="text-base font-bold text-primary">{tech?.fullName?.[0] || "?"}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{tech?.fullName}</p>
                          {isSelected && <Badge className="bg-green-600 text-white text-xs border-0">✓ تم الاختيار</Badge>}
                        </div>
                        {tech?.averageRating > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            <span>{tech.averageRating.toFixed(1)}</span>
                            <span>({tech.reviewCount} تقييم)</span>
                          </div>
                        )}
                      </div>
                      <Badge className={`text-xs ${offerStatus.color} border-0 flex-shrink-0`}>{offerStatus.label}</Badge>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <div className={`grid ${sparePartsPrice > 0 ? "grid-cols-3" : "grid-cols-2"} gap-2 text-center`}>
                        <div>
                          <p className="text-xs text-muted-foreground">الخدمة</p>
                          <p className="font-bold text-primary">{laborPrice} <span className="text-xs font-normal">ج</span></p>
                        </div>
                        {sparePartsPrice > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">قطع الغيار</p>
                            <p className="font-bold text-orange-600">{sparePartsPrice} <span className="text-xs font-normal">ج</span></p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">الإجمالي</p>
                          <p className="text-lg font-black">{totalPrice} <span className="text-xs font-normal">ج</span></p>
                        </div>
                      </div>
                    </div>

                    {offer.notes && <p className="text-sm text-muted-foreground mb-3">{offer.notes}</p>}

                    {offer.status === "pending" && req.status === "offers_received" && isCustomer && isMyRequest && (
                      <Button
                        className="w-full font-semibold"
                        size="sm"
                        onClick={() => handleSelectOffer(offer.id)}
                        disabled={selectMutation.isPending}
                        data-testid={`button-select-offer-${offer.id}`}
                      >
                        اختيار هذا الفني
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price adjustment history */}
      {adjHistory.filter((a) => a.status !== "pending").length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" />سجل تعديلات السعر</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {adjHistory.filter((a) => a.status !== "pending").map((adj: any) => {
              const oldTotal = parseFloat(adj.oldPrice || "0") + parseFloat(adj.oldSpareParts || "0");
              const newTotal = parseFloat(adj.newPrice || "0") + parseFloat(adj.newSpareParts || "0");
              const isApproved = adj.status === "approved";
              return (
                <div key={adj.id} className={`rounded-xl border p-4 ${isApproved ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{adj.technicianName || "الفني"}</p>
                    <Badge className={`text-xs ${isApproved ? "bg-green-600" : "bg-red-600"} text-white border-0`}>
                      {isApproved ? "مقبول ✓" : "مرفوض ✗"}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>السعر الأصلي: <strong>{oldTotal || "—"}</strong></span>
                      <span>←</span>
                      <span>السعر الجديد: <strong className={isApproved ? "text-green-700" : "text-muted-foreground line-through"}>{newTotal}</strong> جنيه</span>
                    </div>
                    {adj.newDescription && <p className="text-xs text-muted-foreground mt-1">السبب: {adj.newDescription}</p>}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />طُلب: {new Date(adj.createdAt).toLocaleDateString("ar-EG")}</span>
                    {adj.decisionDate && <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" />قُرر: {new Date(adj.decisionDate).toLocaleDateString("ar-EG")}</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Rating dialog — required after completion */}
      <Dialog open={showRating} onOpenChange={() => { /* intentionally not closable */ }}>
        <DialogContent className="max-w-sm" dir="rtl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>قيّم الفني</DialogTitle>
            <DialogDescription>يرجى تقييم الفني قبل إغلاق الطلب</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRatingStars(s)}>
                  <Star className={`w-10 h-10 ${s <= ratingStars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"} transition-colors`} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="أضف تعليقك (اختياري)..."
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full font-bold"
              onClick={handleSubmitRating}
              disabled={ratingMutation.isPending}
            >
              {ratingMutation.isPending ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 left-4 text-white"><X className="w-6 h-6" /></button>
          <img src={lightboxImg} alt="" className="max-w-full max-h-full rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
