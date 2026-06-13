import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useRegisterCustomer } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wrench, User } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  mobile: z.string().min(8, "رقم الهاتف غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "كلمتا المرور غير متطابقتان",
  path: ["confirmPassword"],
});

export default function RegisterCustomer() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegisterCustomer();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", mobile: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const { confirmPassword: _, ...data } = values;
    registerMutation.mutate(
      { data: data as any },
      {
        onSuccess: (res: any) => {
          login(res.token, res.user);
          navigate("/customer");
        },
        onError: (err: any) => {
          toast({ title: "خطأ في التسجيل", description: err?.data?.error || "حدث خطأ", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div style={{ width: 88, height: 88, borderRadius: 22, overflow: "hidden", border: "2px solid rgba(245,197,24,0.55)", boxShadow: "0 4px 20px rgba(245,197,24,0.22), 0 1px 6px rgba(0,0,0,0.07)", margin: "0 auto 16px", display: "block" }}>
            <img src="/assets/logo.png" alt="فنشها" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <h1 className="text-2xl font-black text-foreground">تسجيل عميل جديد</h1>
          <p className="text-muted-foreground mt-1">أنشئ حسابك وابدأ باستقبال العروض</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl><Input placeholder="أحمد محمد" data-testid="input-fullname" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl><Input placeholder="01xxxxxxxxx" data-testid="input-mobile" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" data-testid="input-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" data-testid="input-confirm-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full font-bold py-5" disabled={registerMutation.isPending} data-testid="button-submit">
                  {registerMutation.isPending ? "جاري التسجيل..." : "إنشاء الحساب"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              لديك حساب؟ <Link href="/login" className="text-primary font-semibold">دخول</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
