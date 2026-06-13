import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef } from "react";
import { useGetMe, getGetMeQueryKey, useUpdateUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Camera } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
});

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export default function CustomerProfile() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMutation = useUpdateUser();
  const photoRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "" },
  });

  useEffect(() => {
    if (me) {
      const user = me as any;
      form.reset({ fullName: user.fullName || "", email: user.email || "" });
    }
  }, [me]);

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

  const user = me as any;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">الملف الشخصي</h1>

      <Card>
        <CardContent className="pt-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="صورة الملف الشخصي"
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                title="تغيير الصورة"
                data-testid="button-change-photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <p className="font-bold text-lg">{user?.fullName}</p>
            <p className="text-muted-foreground text-sm">{user?.mobile}</p>
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="text-xs text-primary hover:underline mt-1"
            >
              تغيير الصورة
            </button>
          </div>

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
                  <FormControl><Input type="email" placeholder="example@mail.com" data-testid="input-email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full font-bold" disabled={updateMutation.isPending} data-testid="button-save">
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
