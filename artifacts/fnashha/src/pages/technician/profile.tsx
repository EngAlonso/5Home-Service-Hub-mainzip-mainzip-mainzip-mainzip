import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMe, getGetMeQueryKey, useUpdateUser, useGetTechnicianProfile, getGetTechnicianProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Star, Camera } from "lucide-react";
import { APPROVAL_STATUS_MAP } from "@/lib/status";

const schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")),
});

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export default function TechnicianProfile() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const photoRef = useRef<HTMLInputElement>(null);

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: profile } = useGetTechnicianProfile(currentUser?.id!, {
    query: { enabled: !!currentUser?.id, queryKey: getGetTechnicianProfileQueryKey(currentUser?.id!) },
  });

  const updateMutation = useUpdateUser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: currentUser?.fullName || "", email: "" },
  });

  useEffect(() => {
    if (me) {
      const u = me as any;
      form.reset({ fullName: u.fullName || "", email: u.email || "" });
    }
  }, [me]);

  const p = profile as any;
  const u = me as any;
  const approvalStatus = APPROVAL_STATUS_MAP[p?.approvalStatus] || { label: "غير معروف", color: "bg-gray-100" };

  const onSubmit = (values: z.infer<typeof schema>) => {
    updateMutation.mutate(
      { id: currentUser!.id, data: values as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "تم حفظ التغييرات" });
        },
        onError: () => toast({ title: "خطأ", variant: "destructive" }),
      }
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحجم الأقصى 5 ميجابايت", variant: "destructive" });
      return;
    }
    try {
      const b64 = await toBase64(file);
      updateMutation.mutate(
        { id: currentUser!.id, data: { profileImage: b64 } as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetTechnicianProfileQueryKey(currentUser?.id!) });
            toast({ title: "تم تحديث صورة الملف الشخصي" });
          },
          onError: () => toast({ title: "خطأ في تحديث الصورة", variant: "destructive" }),
        }
      );
    } catch {
      toast({ title: "خطأ في معالجة الصورة", variant: "destructive" });
    }
    if (photoRef.current) photoRef.current.value = "";
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">ملفي الشخصي</h1>

      {/* Status card */}
      {p && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {u?.profileImage ? (
                    <img
                      src={u.profileImage}
                      alt="صورة الملف الشخصي"
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow hover:bg-primary/90 transition-colors"
                    title="تغيير الصورة"
                    data-testid="button-change-photo"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
                <div>
                  <p className="font-bold text-lg">{currentUser?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{currentUser?.mobile}</p>
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="text-xs text-primary hover:underline"
                  >
                    تغيير الصورة
                  </button>
                </div>
              </div>
              <div className="text-left">
                <Badge className={`${approvalStatus.color} border-0 mb-1`}>{approvalStatus.label}</Badge>
                {p.averageRating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    {p.averageRating?.toFixed(1)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">{p.pointsBalance || 0}</p>
                <p className="text-xs text-muted-foreground">رصيد النقاط</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">{p.reviewCount || 0}</p>
                <p className="text-xs text-muted-foreground">تقييمات</p>
              </div>
            </div>

            {p.services && p.services.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">الخدمات</p>
                <div className="flex flex-wrap gap-2">
                  {p.services.map((s: any) => (
                    <Badge key={s?.id} variant="secondary" className="text-xs">{s?.nameAr}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      <Card>
        <CardHeader><CardTitle className="text-base">تعديل البيانات</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl><Input data-testid="input-fullname" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني (اختياري)</FormLabel>
                  <FormControl><Input type="email" data-testid="input-email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-save">
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
