import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useRegisterTechnician, useListServices, useListGovernorates, useListAreas } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Camera, Upload, CheckCircle2 } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  mobile: z.string().min(8, "رقم الهاتف غير صحيح"),
  nationalId: z.string().min(14, "رقم البطاقة يجب أن يكون 14 رقماً"),
  password: z.string().min(6, "كلمة المرور قصيرة جداً"),
  confirmPassword: z.string(),
  primaryGovernorateId: z.string().min(1, "اختر المحافظة"),
  primaryAreaId: z.string().min(1, "اختر المنطقة"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "كلمتا المرور غير متطابقتان",
  path: ["confirmPassword"],
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageUploadField({
  label,
  value,
  onChange,
  required,
  testId,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    onChange(b64);
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        data-testid={testId}
        className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer overflow-hidden
          ${value ? "border-primary/40 bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"}`}
      >
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">اضغط لرفع صورة</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export default function RegisterTechnician() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegisterTechnician();
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [registered, setRegistered] = useState(false);

  const [personalPhoto, setPersonalPhoto] = useState<string | null>(null);
  const [nationalIdFront, setNationalIdFront] = useState<string | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<string | null>(null);

  const { data: services = [] } = useListServices();
  const { data: governorates = [] } = useListGovernorates();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "", mobile: "", nationalId: "", password: "", confirmPassword: "",
      primaryGovernorateId: "", primaryAreaId: "",
    },
  });

  const selectedGovId = form.watch("primaryGovernorateId");
  const { data: areas = [] } = useListAreas({ governorateId: selectedGovId ? parseInt(selectedGovId) : undefined } as any);

  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    if (selectedServiceIds.length === 0) {
      toast({ title: "اختر خدمة واحدة على الأقل", variant: "destructive" });
      return;
    }
    if (!nationalIdFront || !nationalIdBack) {
      toast({ title: "صور البطاقة القومية مطلوبة", description: "يرجى رفع صورة الوجه الأمامي والخلفي للبطاقة القومية", variant: "destructive" });
      return;
    }

    const data = {
      fullName: values.fullName,
      mobile: values.mobile,
      nationalId: values.nationalId,
      password: values.password,
      personalPhoto: personalPhoto || undefined,
      nationalIdFront,
      nationalIdBack,
      serviceIds: selectedServiceIds,
      areaIds: selectedAreaIds.length > 0 ? selectedAreaIds : [parseInt(values.primaryAreaId)],
      primaryAreaId: parseInt(values.primaryAreaId),
    };

    registerMutation.mutate(
      { data: data as any },
      {
        onSuccess: () => {
          setRegistered(true);
        },
        onError: (err: any) => {
          toast({ title: "خطأ في التسجيل", description: err?.data?.error || "حدث خطأ، حاول مرة أخرى", variant: "destructive" });
        },
      }
    );
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">تم تقديم طلبك بنجاح!</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              سيتم مراجعة بياناتك وصورك من قبل فريق الإدارة.<br />
              سيتم إشعارك عند الموافقة على حسابك.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-right">
            <p className="font-semibold mb-1">ملاحظة مهمة:</p>
            <p>لن تتمكن من تسجيل الدخول حتى تتم الموافقة على حسابك من قبل الإدارة.</p>
          </div>
          <Button className="w-full font-bold" onClick={() => navigate("/login")}>
            العودة لتسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div style={{ width: 88, height: 88, borderRadius: 22, overflow: "hidden", border: "2px solid rgba(245,197,24,0.55)", boxShadow: "0 4px 20px rgba(245,197,24,0.22), 0 1px 6px rgba(0,0,0,0.07)", margin: "0 auto 14px", display: "block" }}>
            <img src="/assets/logo.png" alt="فنشها" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <h1 className="text-2xl font-black text-foreground">تسجيل فني جديد</h1>
          <p className="text-muted-foreground text-sm mt-1">سيتم مراجعة طلبك من قبل الإدارة قبل تفعيل الحساب</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الكامل</FormLabel>
                      <FormControl><Input placeholder="محمد أحمد" data-testid="input-fullname" {...field} /></FormControl>
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
                </div>

                <FormField control={form.control} name="nationalId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم البطاقة القومية</FormLabel>
                    <FormControl><Input placeholder="14 رقم" data-testid="input-national-id" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" data-testid="input-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>تأكيد المرور</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" data-testid="input-confirm-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Image Uploads */}
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    الصور المطلوبة للتحقق
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <ImageUploadField
                      label="صورة شخصية"
                      value={personalPhoto}
                      onChange={setPersonalPhoto}
                      testId="upload-personal-photo"
                    />
                    <ImageUploadField
                      label="البطاقة (أمام)"
                      value={nationalIdFront}
                      onChange={setNationalIdFront}
                      required
                      testId="upload-national-id-front"
                    />
                    <ImageUploadField
                      label="البطاقة (خلف)"
                      value={nationalIdBack}
                      onChange={setNationalIdBack}
                      required
                      testId="upload-national-id-back"
                    />
                  </div>
                  {(!nationalIdFront || !nationalIdBack) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * صورتا البطاقة القومية (أمام وخلف) مطلوبتان للتحقق من هويتك
                    </p>
                  )}
                </div>

                {/* Services */}
                <div>
                  <p className="text-sm font-semibold mb-2">الخدمات المقدمة <span className="text-destructive">*</span></p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-xl p-3">
                    {(services as any[]).filter((s: any) => s.isActive).map((service: any) => (
                      <label key={service.id} className="flex items-center gap-2 cursor-pointer text-sm" data-testid={`checkbox-service-${service.id}`}>
                        <Checkbox
                          checked={selectedServiceIds.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        {service.nameAr}
                      </label>
                    ))}
                    {(services as any[]).filter((s: any) => s.isActive).length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-2 text-center py-2">لا توجد خدمات متاحة</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="primaryGovernorateId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المحافظة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-governorate"><SelectValue placeholder="اختر" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(governorates as any[]).map((g: any) => (
                            <SelectItem key={g.id} value={g.id.toString()}>{g.nameAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="primaryAreaId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المنطقة الرئيسية</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGovId}>
                        <FormControl>
                          <SelectTrigger data-testid="select-area"><SelectValue placeholder="اختر" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(areas as any[]).map((a: any) => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.nameAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button
                  type="submit"
                  className="w-full font-bold py-5"
                  disabled={registerMutation.isPending}
                  data-testid="button-submit"
                >
                  {registerMutation.isPending ? "جاري إرسال الطلب..." : "تقديم طلب التسجيل"}
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
