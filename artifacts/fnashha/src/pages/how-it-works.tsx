import { Search, FileText, MessageSquare, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";

const STEPS = [
  {
    number: "01",
    icon: <Search size={32} color="#C9A227" strokeWidth={1.8} />,
    title: "اختر الخدمة",
    desc: "تصفح قائمة خدماتنا المتنوعة — كهرباء، سباكة، تكييف، نجارة، دهانات وأكثر. اختر الخدمة اللي محتاجها بضغطة واحدة.",
  },
  {
    number: "02",
    icon: <FileText size={32} color="#C9A227" strokeWidth={1.8} />,
    title: "اكتب تفاصيل الطلب",
    desc: "وصف المشكلة بكلامك العادي، أضف صور أو ملاحظات لو حبيت، وحدد الوقت المناسب ليك.",
  },
  {
    number: "03",
    icon: <MessageSquare size={32} color="#C9A227" strokeWidth={1.8} />,
    title: "استقبل عروض الفنيين",
    desc: "الفنيون المعتمدين في منطقتك هيشوفوا طلبك ويبعتولك عروض أسعار. قارن بينهم واختار الأنسب ليك.",
  },
  {
    number: "04",
    icon: <UserCheck size={32} color="#C9A227" strokeWidth={1.8} />,
    title: "اختر الفني المناسب",
    desc: "اختار الفني بناءً على السعر والتقييم والخبرة. الفني هييجي في الموعد ويخلص الشغل على أكمل وجه.",
  },
];

export default function HowItWorks() {
  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", minHeight: "100vh", background: "#fafaf7" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .hiw-step { animation: fadeUp 0.5s ease forwards; }
        .hiw-card {
          background: #fff;
          border: 1.5px solid #ebebeb;
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          position: relative;
        }
        .hiw-card:hover {
          border-color: rgba(245,197,24,0.5);
          box-shadow: 0 8px 28px rgba(245,197,24,0.15), 0 2px 10px rgba(0,0,0,0.05);
          transform: translateY(-3px);
        }
        .hiw-number {
          position: absolute;
          top: -14px;
          right: 24px;
          background: #F5C518;
          color: #1a1a1a;
          font-weight: 900;
          font-size: 13px;
          padding: 3px 10px;
          border-radius: 20px;
          font-family: 'Cairo', sans-serif;
        }
        .hiw-icon-wrap {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: #fef9e7;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .cta-btn {
          background: #F5C518; color: #1a1a1a;
          font-weight: 800; font-family: 'Cairo', sans-serif;
          font-size: 15px; padding: 13px 36px;
          border: none; border-radius: 14px; cursor: pointer;
          text-decoration: none; display: inline-block;
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .cta-btn:hover {
          background: #e0b000;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(245,197,24,0.38);
        }
        .connector {
          display: flex; align-items: center; justify-content: center;
          color: #ddd; font-size: 24px; padding: 0 4px; flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .hiw-grid { grid-template-columns: 1fr !important; }
          .connector { display: none !important; }
        }
      `}</style>

      <SiteHeader />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "52px 24px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fef9e7", border: "1.5px solid rgba(245,197,24,0.35)", borderRadius: 24, padding: "6px 18px", marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#c49a00", fontFamily: "'Cairo', sans-serif" }}>بسيط وسريع</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900, color: "#1a1a1a", margin: "0 0 12px", fontFamily: "'Cairo', sans-serif" }}>
            تطلب إزاي؟
          </h1>
          <p style={{ fontSize: 16, color: "#888", margin: 0, fontFamily: "'Cairo', sans-serif", lineHeight: 1.7 }}>
            4 خطوات بسيطة وفنيك في الطريق
          </p>
        </div>

        <div className="hiw-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr", gap: 0, alignItems: "center", marginBottom: 64 }}>
          {STEPS.map((step, i) => (
            <div key={step.number} style={{ display: "contents" }}>
              <div className="hiw-step hiw-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="hiw-number">{step.number}</div>
                <div className="hiw-icon-wrap">{step.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: "#1a1a1a", margin: "0 0 10px", fontFamily: "'Cairo', sans-serif" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.8, margin: 0, fontFamily: "'Cairo', sans-serif" }}>
                  {step.desc}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="connector">→</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", background: "#fff", border: "1.5px solid #f0f0e8", borderRadius: 22, padding: "44px 32px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 70, height: 70, borderRadius: 18, overflow: "hidden", border: "2px solid rgba(245,197,24,0.5)", boxShadow: "0 4px 16px rgba(245,197,24,0.2)", margin: "0 auto 20px" }}>
            <img src="/assets/logo.png" alt="فنشها" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1a1a1a", margin: "0 0 10px", fontFamily: "'Cairo', sans-serif" }}>
            جاهز تطلب فنيك؟
          </h2>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px", fontFamily: "'Cairo', sans-serif" }}>
            سجّل الآن وابدأ باستقبال عروض من فنيين معتمدين في منطقتك
          </p>
          <Link href="/register/customer" className="cta-btn">
            ابدأ الآن
          </Link>
        </div>
      </main>

      <footer style={{ padding: "16px 32px", borderTop: "1px solid #ebebeb", background: "#fff", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "6px 8px", marginBottom: 8 }}>
          {([["الرئيسية", "/"], ["الشروط والأحكام", "/terms"], ["سياسة الخصوصية", "/privacy"], ["الأسئلة الشائعة", "/faq"], ["اتصل بنا", "/contact"]] as [string, string][]).map(([label, href], i, arr) => (
            <span key={href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href={href} style={{ color: "#888", textDecoration: "none", fontSize: 13, fontFamily: "'Cairo', sans-serif" }}>{label}</Link>
              {i < arr.length - 1 && <span style={{ color: "#ddd" }}>|</span>}
            </span>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#bbb", fontFamily: "'Cairo', sans-serif" }}>
          جميع الحقوق محفوظة © 2024{" "}
          <Link href="/" style={{ color: "#c49a00", textDecoration: "none", fontWeight: 700 }}>فنشها</Link>
        </p>
      </footer>
    </div>
  );
}
