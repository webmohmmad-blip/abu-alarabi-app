import { Link, useLocation } from "wouter";
import { UserCircle, LogOut, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useState, useEffect } from "react";

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
        window.location.reload();
      },
    });
  };

  const isHome = location === "/";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isHome && !scrolled
          ? "bg-transparent border-transparent"
          : "bg-foreground/95 backdrop-blur-md border-b border-white/10"
      }`}
    >
      <div className="container mx-auto flex h-18 items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm"
            style={{ background: "linear-gradient(135deg, #5A2D82 0%, #3a1a59 100%)" }}
          >
            ع
          </div>
          <span className="text-lg font-bold text-white tracking-tight">أبو العربي</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: "/", label: "الرئيسية" },
            { href: "/dossiers", label: "الدوسيات" },
            { href: "/worksheets", label: "أوراق العمل" },
            { href: "/exams", label: "الامتحانات" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location === item.href
                  ? "text-white bg-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-black text-white">
                  {user?.fullName?.charAt(0) || <UserCircle className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium text-white/80 truncate max-w-[100px]">
                  {user?.fullName}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                ابدأ الآن
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
