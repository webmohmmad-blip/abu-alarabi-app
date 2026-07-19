import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "./header";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] bg-background selection:bg-primary/20">
      {/* ── Fixed header (contains nav) ── */}
      <Header />

      <div className="pt-[72px]">
        {/* ── Teacher / hero banner ── */}
        <div
          className="relative overflow-hidden w-full"
          style={{ height: "150px", backgroundColor: "#110820" }}
        >
          {/* Teacher photo — left side (RTL) */}
          <img
            src="/teacher-sahouri.jpg"
            alt=""
            aria-hidden
            className="absolute left-0 top-0 h-full object-cover object-top select-none pointer-events-none"
            style={{ width: "220px" }}
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(17,8,32,0) 0%, rgba(17,8,32,0.6) 28%, rgba(17,8,32,0.95) 52%, #110820 70%)",
            }}
          />

          {/* Greeting text — right side */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12" dir="rtl">
            <p className="text-white/40 text-xs font-medium tracking-widest mb-1">منصة أبو العربي</p>
            <h2 className="text-white text-xl md:text-2xl font-black leading-snug">
              مرحباً{user?.fullName ? `، ${user.fullName.split(" ")[0]}` : ""}
            </h2>
            <p className="text-white/45 text-sm mt-1">مع الأستاذ محمد الساحوري — طريقك للتفوق</p>
          </div>
        </div>

        {/* ── Page content ── */}
        <main className="mx-auto max-w-7xl px-4 md:px-8 py-8 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
