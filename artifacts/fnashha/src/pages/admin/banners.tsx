import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";

type Banner = {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  location: "hero" | "below_services" | "before_footer";
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
};

type BannerForm = Omit<Banner, "id" | "createdAt">;

const LOCATION_LABELS: Record<string, string> = {
  hero: "البانر الرئيسي (أعلى الصفحة)",
  below_services: "بانر أسفل الخدمات",
  before_footer: "بانر قبل الفوتر",
};

const getToken = () => localStorage.getItem("fnashha_token") || "";

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
};

const EMPTY_FORM: BannerForm = {
  title: "",
  description: "",
  imageUrl: "",
  buttonText: "",
  buttonLink: "",
  location: "hero",
  displayOrder: 0,
  isActive: true,
};

export default function AdminBanners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: () => apiFetch("/api/banners"),
  });

  const createMutation = useMutation({
    mutationFn: (data: BannerForm) => apiFetch("/api/banners", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: "تم إضافة البانر بنجاح" });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BannerForm> }) =>
      apiFetch(`/api/banners/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: "تم تحديث البانر" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: "تم حذف البانر" });
      setDeleteDialogOpen(false);
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const filtered = locationFilter === "all"
    ? banners
    : banners.filter((b) => b.location === locationFilter);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm({
      title: b.title,
      description: b.description || "",
      imageUrl: b.imageUrl || "",
      buttonText: b.buttonText || "",
      buttonLink: b.buttonLink || "",
      location: b.location,
      displayOrder: b.displayOrder,
      isActive: b.isActive,
    });
    setEditingId(b.id);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleActive = (banner: Banner) => {
    updateMutation.mutate({ id: banner.id, data: { isActive: !banner.isActive } });
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">إدارة البانرات</h1>
          <p className="text-muted-foreground text-sm mt-1">إضافة وتعديل وتنظيم البانرات في الصفحة الرئيسية</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-banner">
          <Plus className="w-4 h-4 ml-2" />
          إضافة بانر
        </Button>
      </div>

      {/* Location filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: "all", label: "جميع البانرات" },
          { value: "hero", label: "البانر الرئيسي" },
          { value: "below_services", label: "أسفل الخدمات" },
          { value: "before_footer", label: "قبل الفوتر" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setLocationFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              locationFilter === value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">لا توجد بانرات</p>
          <p className="text-sm mt-1">أضف بانر جديد للبدء</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((banner) => (
            <Card key={banner.id} className={`border-2 ${banner.isActive ? "border-primary/20" : "border-border opacity-60"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-16 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-foreground">{banner.title}</h3>
                        {banner.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{banner.description}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{LOCATION_LABELS[banner.location]}</Badge>
                          <Badge variant="outline" className="text-xs">ترتيب: {banner.displayOrder}</Badge>
                          {banner.buttonText && <Badge variant="secondary" className="text-xs">زر: {banner.buttonText}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={banner.isActive}
                            onCheckedChange={() => toggleActive(banner)}
                            data-testid={`switch-banner-${banner.id}`}
                          />
                          <span className="text-xs text-muted-foreground">{banner.isActive ? "مفعّل" : "معطّل"}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openEdit(banner)} data-testid={`button-edit-banner-${banner.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete(banner.id)} data-testid={`button-delete-banner-${banner.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "تعديل البانر" : "إضافة بانر جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="mb-1.5 block">العنوان *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان البانر" data-testid="input-banner-title" />
            </div>
            <div>
              <Label className="mb-1.5 block">الوصف</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="وصف اختياري" data-testid="input-banner-description" />
            </div>
            <div>
              <Label className="mb-1.5 block">رابط الصورة</Label>
              <Input value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." data-testid="input-banner-image" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">نص الزر</Label>
                <Input value={form.buttonText || ""} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} placeholder="اضغط هنا" data-testid="input-banner-button-text" />
              </div>
              <div>
                <Label className="mb-1.5 block">رابط الزر</Label>
                <Input value={form.buttonLink || ""} onChange={(e) => setForm({ ...form, buttonLink: e.target.value })} placeholder="/register" data-testid="input-banner-button-link" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">الموقع</Label>
                <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v as BannerForm["location"] })}>
                  <SelectTrigger data-testid="select-banner-location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">البانر الرئيسي</SelectItem>
                    <SelectItem value="below_services">أسفل الخدمات</SelectItem>
                    <SelectItem value="before_footer">قبل الفوتر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">ترتيب العرض</Label>
                <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} data-testid="input-banner-order" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-banner-active" />
              <Label>مفعّل</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSubmit} disabled={isSaving} data-testid="button-save-banner">
                {isSaving ? "جاري الحفظ..." : editingId !== null ? "حفظ التعديلات" : "إضافة البانر"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm mt-2">هل أنت متأكد من حذف هذا البانر؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex gap-3 mt-4">
            <Button variant="destructive" className="flex-1" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
