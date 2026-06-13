import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية", anchor: false },
  { href: "/#services", label: "الخدمات", anchor: true },
  { href: "/how-it-works", label: "تطلب إزاي", anchor: false },
  { href: "/register/technician", label: "انضم كفني", anchor: false },
  { href: "/contact", label: "اتصل بنا", anchor: false },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        {/* Mobile row: flex justify-between — logo right, hamburger left */}
        <div className="flex items-center justify-between md:hidden px-4 py-3">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, overflow: "hidden", border: "1.5px solid rgba(245,197,24,0.5)", boxShadow: "0 2px 8px rgba(245,197,24,0.18)", flexShrink: 0 }}>
              <img src="/assets/logo.png" alt="فنشها" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <span className="text-xl font-bold text-foreground">فنشها</span>
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="القائمة"
            style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              border: "1.5px solid rgba(245,197,24,0.5)",
              boxShadow: "0 2px 8px rgba(245,197,24,0.18)",
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", lineHeight: 0,
              transition: "background 0.18s, box-shadow 0.18s",
            }}
          >
            {open ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>

        {/* Desktop row: 3-column grid — logo | centered nav | auth buttons */}
        <div className="hidden md:grid container mx-auto px-4 py-3" style={{ gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none", justifySelf: "start" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, overflow: "hidden", border: "1.5px solid rgba(245,197,24,0.5)", boxShadow: "0 2px 8px rgba(245,197,24,0.18)", flexShrink: 0 }}>
              <img src="/assets/logo.png" alt="فنشها" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <span className="text-xl font-bold text-foreground">فنشها</span>
          </Link>

          <nav className="flex items-center gap-0">
            {NAV_LINKS.map((link) =>
              link.anchor ? (
                <a key={link.href} href={link.href}>
                  <Button variant="ghost" className="font-semibold text-sm px-3">{link.label}</Button>
                </a>
              ) : (
                <Link key={link.href} href={link.href}>
                  <Button variant="ghost" className="font-semibold text-sm px-3">{link.label}</Button>
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-2" style={{ justifySelf: "end" }}>
            <Link href="/login" data-testid="link-login" style={{
              display: "inline-flex", alignItems: "center", height: 38,
              padding: "0 18px", borderRadius: 10, fontSize: 14,
              fontWeight: 700, fontFamily: "'Cairo', sans-serif",
              color: "#1a1a1a", textDecoration: "none", whiteSpace: "nowrap",
              border: "1.5px solid #d4d4c8", background: "transparent",
              transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F5C518"; (e.currentTarget as HTMLElement).style.background = "#fef9e7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#d4d4c8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              تسجيل الدخول
            </Link>
            <Link href="/register" data-testid="link-register" style={{
              display: "inline-flex", alignItems: "center", height: 38,
              padding: "0 20px", borderRadius: 10, fontSize: 14,
              fontWeight: 800, fontFamily: "'Cairo', sans-serif",
              color: "#1a1a1a", textDecoration: "none", whiteSpace: "nowrap",
              background: "#F5C518", border: "1.5px solid #F5C518",
              boxShadow: "0 2px 8px rgba(245,197,24,0.25)",
              transition: "background 0.18s, box-shadow 0.18s, transform 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#e0b000"; (e.currentTarget as HTMLElement).style.borderColor = "#e0b000"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(245,197,24,0.45)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F5C518"; (e.currentTarget as HTMLElement).style.borderColor = "#F5C518"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(245,197,24,0.25)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              إنشاء حساب
            </Link>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="md:hidden bg-white border-b border-border shadow-lg"
          dir="rtl"
          style={{ position: "sticky", top: 61, zIndex: 40 }}
        >
          <nav className="container mx-auto px-4 py-3 flex flex-col">
            {NAV_LINKS.map((link) =>
              link.anchor ? (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start font-semibold text-sm py-3">{link.label}</Button>
                </a>
              ) : (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start font-semibold text-sm py-3">{link.label}</Button>
                </Link>
              )
            )}
            <div className="border-t border-border mt-2 pt-2 flex flex-col gap-1">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-semibold">تسجيل الدخول</Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button className="w-full font-semibold">إنشاء حساب</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
