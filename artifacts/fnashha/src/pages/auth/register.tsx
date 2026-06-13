import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { User, Wrench, ChevronLeft, Shield, Star, Headphones } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .rp { font-family: 'Cairo', sans-serif !important; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rp-logo   { animation: fadeUp 0.45s ease forwards; }
        .rp-title  { animation: fadeUp 0.45s ease 0.08s both; }
        .rp-cards  { animation: fadeUp 0.45s ease 0.16s both; }
        .rp-bottom { animation: fadeUp 0.45s ease 0.24s both; }
        .rp-trust  { animation: fadeUp 0.45s ease 0.3s both; }

        .rp-card {
          background: #fff;
          border: 1.5px solid #ebebeb;
          border-radius: 22px;
          padding: 36px 28px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          text-decoration: none;
          color: inherit;
        }
        .rp-card:hover {
          border-color: #F5C518;
          box-shadow: 0 8px 32px rgba(245,197,24,0.18), 0 2px 12px rgba(0,0,0,0.06);
          transform: translateY(-3px);
        }

        .rp-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #fef9e7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          transition: background 0.2s;
        }
        .rp-card:hover .rp-icon-wrap {
          background: #fdf3c0;
        }

        .rp-btn {
          width: 100%;
          padding: 13px 16px;
          background: #F5C518;
          color: #1a1a1a;
          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 800;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
          text-decoration: none;
        }
        .rp-btn:hover {
          background: #e0b000;
          box-shadow: 0 6px 20px rgba(245,197,24,0.35);
          transform: translateY(-1px);
        }

        .rp-trust-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #888;
          font-size: 13px;
          font-family: 'Cairo', sans-serif;
        }

        .rp-lang {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1.5px solid #ebebeb;
          border-radius: 10px;
          padding: 6px 12px;
          font-size: 13px;
          font-family: 'Cairo', sans-serif;
          color: #555;
          font-weight: 600;
          cursor: default;
        }

        @media (max-width: 640px) {
          .rp-cards-grid { grid-template-columns: 1fr !important; }
          .rp-trust-row  { display: none !important; }
          .rp-page-pad   { padding: 24px 16px !important; }
          .rp-card       { padding: 24px 20px 20px !important; flex-direction: row !important; text-align: right !important; gap: 16px; }
          .rp-icon-wrap  { width: 60px !important; height: 60px !important; flex-shrink: 0; margin-bottom: 0 !important; }
          .rp-card-body  { flex: 1; }
          .rp-btn        { margin-top: 14px !important; }
        }
      `}</style>

      <div
        className="rp"
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg, #fffef7 0%, #fefce8 40%, #fffef7 100%)",
          display: "flex",
          flexDirection: "column",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle corner accents */}
        <div style={{ position: "absolute", top: -80, left: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(245,197,24,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(245,197,24,0.07)", pointerEvents: "none" }} />

        {/* ── TOP BAR ── */}
        <div className="rp-page-pad" style={{ padding: "18px 32px" }}>
          <div className="rp-lang">
            <span>🌐</span>
            <span>العربية</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* ── MAIN ── */}
        <main
          className="rp-page-pad"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 24px 40px",
          }}
        >
          {/* Logo */}
          <div className="rp-logo" style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 110,
              height: 110,
              borderRadius: 24,
              overflow: "hidden",
              border: "2px solid rgba(245,197,24,0.55)",
              boxShadow: "0 4px 20px rgba(245,197,24,0.22), 0 1px 6px rgba(0,0,0,0.07)",
              display: "inline-block",
            }}>
              <img
                src="/assets/logo.png"
                alt="فنشها"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#aaa", fontFamily: "'Cairo', sans-serif" }}>
              صيانة بيتك بضغطة زر
            </p>
          </div>

          {/* Title */}
          <div className="rp-title" style={{ textAlign: "center", marginBottom: 36 }}>
            <h1 style={{
              margin: "0 0 8px",
              fontSize: "clamp(26px, 5vw, 36px)",
              fontWeight: 900,
              color: "#1a1a1a",
              fontFamily: "'Cairo', sans-serif",
              lineHeight: 1.2,
            }}>
              مرحباً بك في فنشها
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "#888", fontFamily: "'Cairo', sans-serif" }}>
              اختر نوع الحساب للمتابعة
            </p>
          </div>

          {/* Cards grid */}
          <div
            className="rp-cards rp-cards-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              width: "100%",
              maxWidth: 680,
              marginBottom: 32,
            }}
          >
            {/* Customer card */}
            <Link href="/register/customer" className="rp-card" data-testid="card-register-customer">
              <div className="rp-icon-wrap">
                <User size={34} color="#C9A227" strokeWidth={1.8} />
              </div>
              <div className="rp-card-body" style={{ width: "100%" }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#1a1a1a", fontFamily: "'Cairo', sans-serif" }}>
                  عميل
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.7, fontFamily: "'Cairo', sans-serif" }}>
                  أبحث عن خدمات منزلية موثوقة وسريعة
                </p>
                <div className="rp-btn">
                  <ChevronLeft size={17} />
                  متابعة كعميل
                </div>
              </div>
            </Link>

            {/* Technician card */}
            <Link href="/register/technician" className="rp-card" data-testid="card-register-technician">
              <div className="rp-icon-wrap">
                <Wrench size={34} color="#C9A227" strokeWidth={1.8} />
              </div>
              <div className="rp-card-body" style={{ width: "100%" }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#1a1a1a", fontFamily: "'Cairo', sans-serif" }}>
                  فني
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.7, fontFamily: "'Cairo', sans-serif" }}>
                  أقدم خدماتي وأصل إلى عملاء أكثر
                </p>
                <div className="rp-btn">
                  <ChevronLeft size={17} />
                  متابعة كفني
                </div>
              </div>
            </Link>
          </div>

          {/* Already have account */}
          <div className="rp-bottom" style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#888", fontFamily: "'Cairo', sans-serif" }}>
              لديك حساب بالفعل؟{" "}
              <Link
                href="/login"
                style={{ color: "#C9A227", fontWeight: 800, textDecoration: "none", fontFamily: "'Cairo', sans-serif" }}
              >
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </main>

        {/* ── TRUST BADGES (desktop only) ── */}
        <div
          className="rp-trust rp-trust-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: "18px 32px",
            borderTop: "1px solid #f0f0e8",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          <div className="rp-trust-item">
            <Shield size={16} color="#C9A227" />
            <span>فنيون موثوقون</span>
          </div>
          <div className="rp-trust-item">
            <Star size={16} color="#C9A227" />
            <span>خدمات بجودة عالية</span>
          </div>
          <div className="rp-trust-item">
            <Headphones size={16} color="#C9A227" />
            <span>دعم على مدار الساعة</span>
          </div>
        </div>
      </div>
    </>
  );
}
