import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Phone, Lock, ArrowLeft } from "lucide-react";

const schema_validate = (mobile: string, password: string) => {
  const errors: { mobile?: string; password?: string } = {};
  if (!mobile || mobile.length < 8) errors.mobile = "رقم الهاتف غير صحيح";
  if (!password || password.length < 6) errors.password = "كلمة المرور قصيرة جداً";
  return errors;
};

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = schema_validate(mobile, password);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    loginMutation.mutate(
      { data: { mobile, password } as any },
      {
        onSuccess: (data: any) => {
          login(data.token, data.user, data.permissions || []);
          if (data.user.role === "customer") navigate("/customer");
          else if (data.user.role === "technician") navigate("/technician");
          else navigate("/admin");
        },
        onError: (err: any) => {
          toast({ title: "خطأ", description: err?.data?.error || "بيانات الدخول غير صحيحة", variant: "destructive" });
        },
      }
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .lp { font-family: 'Cairo', sans-serif !important; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-card { animation: fadeUp 0.5s ease forwards; }
        .lp-inp {
          width: 100%;
          padding: 13px 44px 13px 44px;
          border: 1.5px solid #e8e8e0;
          border-radius: 14px;
          background: #fafaf6;
          font-size: 15px;
          font-family: 'Cairo', sans-serif;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          text-align: right;
        }
        .lp-inp:focus {
          border-color: #F5C518;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.15);
        }
        .lp-inp::placeholder { color: #bbb; }
        .lp-inp-err { border-color: #e53e3e !important; }
        .lp-inp-wrap { position: relative; }
        .lp-icon-r {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%); color: #bbb; pointer-events: none;
        }
        .lp-icon-l {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #bbb;
          cursor: pointer; background: none; border: none; padding: 0;
          transition: color 0.15s;
        }
        .lp-icon-l:hover { color: #888; }
        .lp-btn {
          width: 100%;
          padding: 14px;
          background: #F5C518;
          color: #1a1a1a;
          font-family: 'Cairo', sans-serif;
          font-size: 16px;
          font-weight: 800;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .lp-btn:hover:not(:disabled) {
          background: #e0b000;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(245, 197, 24, 0.38);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .lp-footer-link {
          color: #888; text-decoration: none; font-size: 13px;
          transition: color 0.15s;
        }
        .lp-footer-link:hover { color: #c49a00; }
        .lp-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 18px 0;
        }
        .lp-divider-line { flex: 1; height: 1px; background: #ebebeb; }
        .lp-divider-text { font-size: 12px; color: #ccc; flex-shrink: 0; }
      `}</style>

      <div
        className="lp"
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "#f5f5f0",
          display: "flex",
          flexDirection: "column",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* ── HEADER ── */}
        <header style={{
          padding: "14px 28px",
          background: "#fff",
          borderBottom: "1px solid #ebebeb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Language */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#f5f5f0", borderRadius: 10,
            padding: "6px 12px", fontSize: 13, color: "#666",
            cursor: "default", border: "1px solid #ebebeb",
          }}>
            <span>🌐</span>
            <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 600 }}>العربية</span>
          </div>

          {/* Logo row */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "flex-end",
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.1, fontFamily: "'Cairo', sans-serif" }}>
                فنشها
              </span>
              <span style={{ fontSize: 11, color: "#aaa", lineHeight: 1.2 }}>صيانة بيتك بضغطة زر</span>
            </div>
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              overflow: "hidden", border: "2px solid #F5C518",
              boxShadow: "0 2px 10px rgba(245,197,24,0.25)",
              flexShrink: 0,
            }}>
              <img src="/assets/logo.png" alt="فنشها" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Link>
        </header>

        {/* ── MAIN ── */}
        <main style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}>
          <div
            className="lp-card"
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#fff",
              borderRadius: 24,
              padding: "40px 36px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.09), 0 2px 12px rgba(0,0,0,0.05)",
              border: "1px solid #f0f0e8",
            }}
          >
            {/* Logo block */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 80, height: 80,
                borderRadius: 22,
                overflow: "hidden",
                margin: "0 auto 14px",
                border: "2.5px solid #F5C518",
                boxShadow: "0 4px 20px rgba(245,197,24,0.3)",
              }}>
                <img
                  src="/assets/logo.png"
                  alt="فنشها"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <h1 style={{
                margin: "0 0 4px",
                fontSize: 26,
                fontWeight: 900,
                color: "#1a1a1a",
                fontFamily: "'Cairo', sans-serif",
              }}>فنشها</h1>
              <p style={{ margin: 0, fontSize: 13, color: "#aaa", fontFamily: "'Cairo', sans-serif" }}>
                صيانة بيتك بضغطة زر
              </p>
            </div>

            {/* Welcome */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2 style={{
                margin: "0 0 6px",
                fontSize: 20,
                fontWeight: 900,
                color: "#1a1a1a",
                fontFamily: "'Cairo', sans-serif",
              }}>
                مرحباً بعودتك 👋
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.6, fontFamily: "'Cairo', sans-serif" }}>
                سجل دخولك لمتابعة طلباتك وإدارة حسابك
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Phone */}
              <div>
                <label style={{
                  display: "block", marginBottom: 7,
                  fontSize: 13, fontWeight: 700, color: "#444",
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  رقم الهاتف
                </label>
                <div className="lp-inp-wrap">
                  <Phone size={16} className="lp-icon-r" />
                  <input
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={mobile}
                    onChange={(e) => { setMobile(e.target.value); setErrors((p) => ({ ...p, mobile: undefined })); }}
                    data-testid="input-mobile"
                    className={`lp-inp${errors.mobile ? " lp-inp-err" : ""}`}
                    style={{ direction: "ltr" }}
                    autoComplete="tel"
                  />
                </div>
                {errors.mobile && (
                  <p style={{ margin: "5px 0 0", fontSize: 11, color: "#e53e3e", fontFamily: "'Cairo', sans-serif" }}>
                    {errors.mobile}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: "block", marginBottom: 7,
                  fontSize: 13, fontWeight: 700, color: "#444",
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  كلمة المرور
                </label>
                <div className="lp-inp-wrap">
                  <Lock size={16} className="lp-icon-r" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                    data-testid="input-password"
                    className={`lp-inp${errors.password ? " lp-inp-err" : ""}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lp-icon-l"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ margin: "5px 0 0", fontSize: 11, color: "#e53e3e", fontFamily: "'Cairo', sans-serif" }}>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: "left" }}>
                <Link
                  href="/forgot-password"
                  style={{ fontSize: 13, color: "#c49a00", fontWeight: 600, textDecoration: "none", fontFamily: "'Cairo', sans-serif" }}
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="lp-btn"
                disabled={loginMutation.isPending}
                data-testid="button-submit"
              >
                <ArrowLeft size={18} />
                {loginMutation.isPending ? "جاري الدخول..." : "تسجيل الدخول"}
              </button>
            </form>

            {/* Divider + Register */}
            <div className="lp-divider">
              <div className="lp-divider-line" />
              <span className="lp-divider-text">أو</span>
              <div className="lp-divider-line" />
            </div>

            <p style={{
              margin: 0, textAlign: "center",
              fontSize: 13, color: "#888",
              fontFamily: "'Cairo', sans-serif",
            }}>
              ليس لديك حساب؟{" "}
              <Link
                href="/register"
                style={{ color: "#c49a00", fontWeight: 800, textDecoration: "none" }}
              >
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer style={{
          padding: "14px 24px",
          background: "#fff",
          borderTop: "1px solid #ebebeb",
          textAlign: "center",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            flexWrap: "wrap", gap: "6px 8px", marginBottom: 8,
          }}>
            {([
              ["الشروط والأحكام", "/terms"],
              ["سياسة الخصوصية", "/privacy"],
              ["الأسئلة الشائعة", "/faq"],
              ["اتصل بنا", "/contact"],
            ] as [string, string][]).map(([label, href], i, arr) => (
              <span key={href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link href={href} className="lp-footer-link">{label}</Link>
                {i < arr.length - 1 && <span style={{ color: "#ddd" }}>|</span>}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#bbb", fontFamily: "'Cairo', sans-serif" }}>
            جميع الحقوق محفوظة © 2024{" "}
            <Link href="/" style={{ color: "#c49a00", textDecoration: "none", fontWeight: 700 }}>
              فنشها
            </Link>
          </p>
        </footer>
      </div>
    </>
  );
}
