import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useGetCmsSettings, getGetCmsSettingsQueryKey, useUpdateCmsSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Globe, BarChart2, AlignLeft } from "lucide-react";

type Tab = "general" | "stats" | "footer";

export default function AdminCms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useGetCmsSettings({ query: { queryKey: getGetCmsSettingsQueryKey() } });
  const updateMutation = useUpdateCmsSettings();
  const s = settings as any;
  const [tab, setTab] = useState<Tab>("general");

  const generalForm = useForm({
    defaultValues: {
      siteNameAr: "",
      heroTitleAr: "",
      heroSubtitleAr: "",
      aboutUsAr: "",
      termsConditions: "",
      privacyPolicy: "",
    },
  });

  const statsForm = useForm({
    defaultValues: {
      statsCustomers: "",
      statsTechnicians: "",
      statsRequests: "",
      statsGovernorates: "",
    },
  });

  const footerForm = useForm({
    defaultValues: {
      footerAboutUs: "",
      footerFaq: "",
      contactPhone: "",
      contactEmail: "",
      whatsappNumber: "",
      facebookUrl: "",
      instagramUrl: "",
      twitterUrl: "",
      youtubeUrl: "",
    },
  });

  useEffect(() => {
    if (s) {
      generalForm.reset({
        siteNameAr: s.siteNameAr || "",
        heroTitleAr: s.heroTitleAr || "",
        heroSubtitleAr: s.heroSubtitleAr || "",
        aboutUsAr: s.aboutUsAr || "",
        termsConditions: s.termsConditions || "",
        privacyPolicy: s.privacyPolicy || "",
      });
      statsForm.reset({
        statsCustomers: s.statsCustomers || "",
        statsTechnicians: s.statsTechnicians || "",
        statsRequests: s.statsRequests || "",
        statsGovernorates: s.statsGovernorates || "",
      });
      footerForm.reset({
        footerAboutUs: s.footerAboutUs || "",
        footerFaq: s.footerFaq || "",
        contactPhone: s.contactPhone || "",
        contactEmail: s.contactEmail || "",
        whatsappNumber: s.whatsappNumber || "",
        facebookUrl: s.facebookUrl || "",
        instagramUrl: s.instagramUrl || "",
        twitterUrl: s.twitterUrl || "",
        youtubeUrl: s.youtubeUrl || "",
      });
    }
  }, [s]);

  const save = (values: any) => {
    updateMutation.mutate(
      { data: values as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCmsSettingsQueryKey() });
          toast({ title: "تم حفظ الإعدادات بنجاح" });
        },
        onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
      }
    );
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "الإعدادات العامة", icon: Globe },
    { id: "stats", label: "قسم الإحصائيات", icon: BarChart2 },
    { id: "footer", label: "الفوتر والتواصل", icon: AlignLeft },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">إدارة المحتوى</h1>
        <p className="text-muted-foreground text-sm mt-1">تحكم في كل محتوى الموقع من هنا</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── General Settings ─────────────────────────────────── */}
      {tab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الإعدادات العامة والصفحة الرئيسية</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...generalForm}>
              <form onSubmit={generalForm.handleSubmit(save)} className="space-y-5">
                {[
                  { name: "siteNameAr", label: "اسم الموقع بالعربي" },
                  { name: "heroTitleAr", label: "عنوان الصفحة الرئيسية" },
                  { name: "heroSubtitleAr", label: "وصف الصفحة الرئيسية", textarea: true },
                  { name: "aboutUsAr", label: "عن المنصة", textarea: true },
                  { name: "termsConditions", label: "الشروط والأحكام", textarea: true },
                  { name: "privacyPolicy", label: "سياسة الخصوصية", textarea: true },
                ].map(({ name, label, textarea }: any) => (
                  <FormField key={name} control={generalForm.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        {textarea
                          ? <Textarea rows={4} data-testid={`input-${name}`} {...field} />
                          : <Input data-testid={`input-${name}`} {...field} />}
                      </FormControl>
                    </FormItem>
                  )} />
                ))}
                <Button type="submit" className="w-full font-bold" disabled={updateMutation.isPending} data-testid="button-save-general">
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات العامة"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* ── Statistics ───────────────────────────────────────── */}
      {tab === "stats" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">قسم الإحصائيات في الصفحة الرئيسية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-5 bg-secondary/50 p-3 rounded-lg">
              هذه الأرقام تظهر في قسم "فنشها بالأرقام" في الصفحة الرئيسية. يمكنك كتابة أي قيمة مثل "10,000+" أو "500+".
            </p>
            <Form {...statsForm}>
              <form onSubmit={statsForm.handleSubmit(save)} className="space-y-5">
                {[
                  { name: "statsCustomers", label: "عدد العملاء", placeholder: "10,000+" },
                  { name: "statsTechnicians", label: "عدد الفنيين", placeholder: "500+" },
                  { name: "statsRequests", label: "الطلبات المكتملة", placeholder: "50,000+" },
                  { name: "statsGovernorates", label: "المحافظات المغطاة", placeholder: "27" },
                ].map(({ name, label, placeholder }: any) => (
                  <FormField key={name} control={statsForm.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input placeholder={placeholder} data-testid={`input-${name}`} {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                ))}
                <Button type="submit" className="w-full font-bold" disabled={updateMutation.isPending} data-testid="button-save-stats">
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الإحصائيات"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* ── Footer & Contact ─────────────────────────────────── */}
      {tab === "footer" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نص الفوتر</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...footerForm}>
                <form onSubmit={footerForm.handleSubmit(save)} className="space-y-5">
                  {[
                    { name: "footerAboutUs", label: "نص عن فنشها في الفوتر", textarea: true },
                    { name: "footerFaq", label: "الأسئلة الشائعة (متاحة قريباً)", textarea: true },
                  ].map(({ name, label, textarea }: any) => (
                    <FormField key={name} control={footerForm.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          {textarea
                            ? <Textarea rows={3} data-testid={`input-${name}`} {...field} />
                            : <Input data-testid={`input-${name}`} {...field} />}
                        </FormControl>
                      </FormItem>
                    )} />
                  ))}

                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-4">معلومات التواصل</p>
                    <div className="space-y-4">
                      {[
                        { name: "contactPhone", label: "رقم الهاتف" },
                        { name: "contactEmail", label: "البريد الإلكتروني" },
                        { name: "whatsappNumber", label: "رقم واتساب" },
                      ].map(({ name, label }: any) => (
                        <FormField key={name} control={footerForm.control} name={name} render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl><Input data-testid={`input-${name}`} {...field} /></FormControl>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-4">روابط التواصل الاجتماعي</p>
                    <div className="space-y-4">
                      {[
                        { name: "facebookUrl", label: "رابط فيسبوك" },
                        { name: "instagramUrl", label: "رابط إنستغرام" },
                        { name: "twitterUrl", label: "رابط تويتر / X" },
                        { name: "youtubeUrl", label: "رابط يوتيوب" },
                      ].map(({ name, label }: any) => (
                        <FormField key={name} control={footerForm.control} name={name} render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl><Input placeholder="https://..." data-testid={`input-${name}`} {...field} /></FormControl>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full font-bold" disabled={updateMutation.isPending} data-testid="button-save-footer">
                    {updateMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الفوتر"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
