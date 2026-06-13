import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useListServices, useGetCmsSettings } from "@workspace/api-client-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Wrench, Star, Shield, ChevronLeft, Phone, Zap, CheckCircle,
  ClipboardList, MessageSquare, UserCheck, Users, Briefcase,
  ThumbsUp, MapPin, Mail, Facebook, Instagram, Twitter, Youtube,
  Droplets, Wind, Hammer, Paintbrush, Truck, Sparkles, Leaf,
  Camera, Grid3X3, Home, Flame, Wifi
} from "lucide-react";

type ServiceIconName = string;
const SERVICE_ICON_MAP: Record<ServiceIconName, React.ElementType> = {
  "كهرباء": Zap,
  "سباكة": Droplets,
  "تكييف": Wind,
  "نجارة": Hammer,
  "دهانات": Paintbrush,
  "بلاط وسيراميك": Grid3X3,
  "حدادة": Wrench,
  "نقل عفش": Truck,
  "تنظيف": Sparkles,
  "حدائق": Leaf,
  "كاميرات مراقبة": Camera,
  "إنترنت": Wifi,
  "ستائر": Home,
  "غاز": Flame,
};

function ServiceIcon({ name, size = 36 }: { name: string; size?: number }) {
  const Icon = SERVICE_ICON_MAP[name] || Wrench;
  return <Icon style={{ width: size, height: size }} />;
}

type Banner = {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  location: string;
  displayOrder: number;
  isActive: boolean;
};

function useBanners(location: string) {
  return useQuery<Banner[]>({
    queryKey: ["banners", location],
    queryFn: async () => {
      const res = await fetch(`/api/banners?location=${location}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}

function BannerStrip({ banner }: { banner: Banner }) {
  if (!banner.isActive) return null;
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary/70 text-primary-foreground p-8 md:p-12"
      style={banner.imageUrl ? { backgroundImage: `url(${banner.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
    >
      {banner.imageUrl && <div className="absolute inset-0 bg-black/50 rounded-2xl" />}
      <div className="relative z-10">
        <h3 className="text-2xl md:text-3xl font-black mb-3">{banner.title}</h3>
        {banner.description && <p className="text-primary-foreground/90 text-lg mb-6 max-w-xl">{banner.description}</p>}
        {banner.buttonText && (
          <a href={banner.buttonLink || "#"}>
            <Button size="lg" variant="secondary" className="font-bold">
              {banner.buttonText}
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

function ServicesSection({ activeServices }: { activeServices: any[] }) {
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);

  const initialCount = isMobile ? 6 : 10;
  const hasMore = activeServices.length > initialCount;
  const displayed = showAll ? activeServices : activeServices.slice(0, initialCount);

  return (
    <section id="services" className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black text-foreground mb-3">خدماتنا</h2>
          <p className="text-muted-foreground text-lg">نغطي جميع احتياجاتك المنزلية باحترافية عالية</p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-5">
          {displayed.map((service: any) => {
            const size = service.iconSize ?? 100;
            const shape = service.iconShape ?? "square";
            const iconPx = Math.round(56 * (size / 100));
            const borderRadius = shape === "circle" ? "50%" : "16px";

            return (
              <Link href="/register/customer" key={service.id}>
                <div
                  className="group cursor-pointer flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-200"
                  data-testid={`card-service-${service.id}`}
                >
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.nameAr}
                      style={{ width: iconPx, height: iconPx, borderRadius, objectFit: "contain" }}
                    />
                  ) : service.icon ? (
                    <span style={{ fontSize: Math.round(40 * (size / 100)), lineHeight: 1 }}>
                      {service.icon}
                    </span>
                  ) : (
                    <div
                      className="flex items-center justify-center text-primary group-hover:text-primary/80 transition-colors"
                      style={{ width: iconPx, height: iconPx }}
                    >
                      <ServiceIcon name={service.nameAr} size={Math.round(40 * (size / 100))} />
                    </div>
                  )}
                  <span className="font-semibold text-xs md:text-sm text-center leading-snug text-foreground group-hover:text-primary transition-colors">
                    {service.nameAr}
                  </span>
                </div>
              </Link>
            );
          })}

          {activeServices.length === 0 &&
            Array.from({ length: isMobile ? 6 : 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-2xl animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-muted" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
        </div>

        {(hasMore || showAll) && (
          <div className="text-center mt-8">
            <Button
              size="lg"
              variant="outline"
              className="font-bold"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "عرض أقل" : "عرض كل الخدمات"}
              <ChevronLeft className={`w-4 h-4 mr-2 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const { data: services = [] } = useListServices();
  const { data: cms } = useGetCmsSettings();
  const s = cms as any;

  const { data: heroBanners = [] } = useBanners("hero");
  const { data: belowServicesBanners = [] } = useBanners("below_services");
  const { data: beforeFooterBanners = [] } = useBanners("before_footer");

  const activeServices = Array.isArray(services) ? services.filter((sv: any) => sv.isActive) : [];

  const stats = [
    {
      icon: Users,
      label: "عميل سعيد",
      value: s?.statsCustomers || "10,000+",
    },
    {
      icon: Wrench,
      label: "فني محترف",
      value: s?.statsTechnicians || "500+",
    },
    {
      icon: CheckCircle,
      label: "طلب مكتمل",
      value: s?.statsRequests || "50,000+",
    },
    {
      icon: MapPin,
      label: "محافظة مغطاة",
      value: s?.statsGovernorates || "27",
    },
  ];

  const howItWorks = [
    {
      icon: ClipboardList,
      step: "01",
      title: "أنشئ طلبك",
      desc: "اختر الخدمة واكتب تفاصيل المشكلة وأضف الصور أو التسجيل الصوتي.",
    },
    {
      icon: MessageSquare,
      step: "02",
      title: "استقبل عروض الفنيين",
      desc: "سيصلك عروض أسعار من أفضل الفنيين في منطقتك.",
    },
    {
      icon: UserCheck,
      step: "03",
      title: "اختر الفني المناسب",
      desc: "قارن الأسعار والتقييمات واختر أفضل فني.",
    },
    {
      icon: ThumbsUp,
      step: "04",
      title: "نفذ الخدمة وقيّم الفني",
      desc: "بعد انتهاء العمل قيّم تجربتك وساعد العملاء الآخرين.",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-primary/20 via-background to-background py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(43_80%_57%/0.15),transparent_60%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            منصة الخدمات المنزلية الأولى في مصر
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6 leading-tight">
            {s?.heroTitleAr || "احصل على خدمة"}
            <span className="text-primary"> احترافية</span>
            {" "}مع فنشها
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {s?.heroSubtitleAr || "احصل على عروض أسعار من أفضل الفنيين في منطقتك. اختر الأنسب لك واستمتع بخدمة احترافية مضمونة."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register/customer">
              <Button size="lg" className="text-lg px-8 py-6 font-bold shadow-lg" data-testid="button-register-customer">
                أنا عميل — ابدأ الآن
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
            <Link href="/register/technician">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold" data-testid="button-register-technician">
                أنا فني — انضم إلينا
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-14">
            {[
              { icon: Shield, text: "مدفوعات آمنة" },
              { icon: Star, text: "فنيون معتمدون" },
              { icon: CheckCircle, text: "ضمان الجودة" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-5 h-5 text-primary" />
                <span className="font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hero Banners ───────────────────────────────────────── */}
      {heroBanners.filter((b) => b.isActive).length > 0 && (
        <section className="container mx-auto px-4 -mt-6 mb-4 space-y-4">
          {heroBanners.filter((b) => b.isActive).map((b) => (
            <BannerStrip key={b.id} banner={b} />
          ))}
        </section>
      )}

      {/* ── Services ───────────────────────────────────────────── */}
      <ServicesSection activeServices={activeServices} />

      {/* ── Below-Services Banners ─────────────────────────────── */}
      {belowServicesBanners.filter((b) => b.isActive).length > 0 && (
        <section className="container mx-auto px-4 py-8 space-y-4">
          {belowServicesBanners.filter((b) => b.isActive).map((b) => (
            <BannerStrip key={b.id} banner={b} />
          ))}
        </section>
      )}

      {/* ── How It Works ───────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-foreground mb-3">كيف يعمل؟</h2>
            <p className="text-muted-foreground text-lg">أربع خطوات بسيطة للحصول على أفضل خدمة</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-300">
                    <Icon className="w-9 h-9 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-lg">
                    {step}
                  </div>
                </div>
                <h3 className="text-xl font-black mb-3 text-foreground">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Statistics ─────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-bl from-foreground to-foreground/90">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-background mb-3">فنشها بالأرقام</h2>
            <p className="text-background/60 text-lg">نفخر بثقة عملائنا وفنيينا في كل مصر</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <p className="text-4xl font-black text-primary mb-2">{value}</p>
                <p className="text-background/70 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-black mb-4">جاهز للبدء؟</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            انضم إلى آلاف العملاء والفنيين على فنشها وابدأ تجربتك الاحترافية اليوم
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register/customer">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 font-bold" data-testid="button-cta">
                سجّل كعميل مجاناً
              </Button>
            </Link>
            <Link href="/register/technician">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                انضم كفني
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Before-Footer Banners ──────────────────────────────── */}
      {beforeFooterBanners.filter((b) => b.isActive).length > 0 && (
        <section className="container mx-auto px-4 py-8 space-y-4">
          {beforeFooterBanners.filter((b) => b.isActive).map((b) => (
            <BannerStrip key={b.id} banner={b} />
          ))}
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-foreground text-background/70" dir="rtl">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-black text-background">فنشها</span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                {s?.footerAboutUs || "منصة فنشها هي الأولى من نوعها في مصر لربط العملاء بأفضل الفنيين المحترفين في جميع المجالات."}
              </p>
              <div className="flex gap-3">
                {s?.facebookUrl && (
                  <a href={s.facebookUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-primary flex items-center justify-center transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {s?.instagramUrl && (
                  <a href={s.instagramUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-primary flex items-center justify-center transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {s?.twitterUrl && (
                  <a href={s.twitterUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-primary flex items-center justify-center transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {s?.youtubeUrl && (
                  <a href={s.youtubeUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-primary flex items-center justify-center transition-colors">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-background font-bold mb-5 text-base">روابط سريعة</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">عن فنشها</a></li>
                <li><Link href="/register/customer" className="hover:text-primary transition-colors">ابدأ كعميل</Link></li>
                <li><Link href="/register/technician" className="hover:text-primary transition-colors">انضم كفني</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">الأسئلة الشائعة</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-background font-bold mb-5 text-base">قانوني</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">الشروط والأحكام</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">سياسة الاسترداد</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-background font-bold mb-5 text-base">تواصل معنا</h4>
              <ul className="space-y-3 text-sm">
                {s?.contactPhone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <a href={`tel:${s.contactPhone}`} className="hover:text-primary transition-colors">{s.contactPhone}</a>
                  </li>
                )}
                {s?.contactEmail && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                    <a href={`mailto:${s.contactEmail}`} className="hover:text-primary transition-colors">{s.contactEmail}</a>
                  </li>
                )}
                {s?.whatsappNumber && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <a href={`https://wa.me/${s.whatsappNumber}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                      واتساب: {s.whatsappNumber}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background/40">
            <p>© {new Date().getFullYear()} فنشها. جميع الحقوق محفوظة.</p>
            <p>صُنع بـ ❤️ في مصر</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
