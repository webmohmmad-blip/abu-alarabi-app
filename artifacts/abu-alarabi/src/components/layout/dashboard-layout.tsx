import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "./header";
import { StudentTopNavigation } from "./student-top-navigation";

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
      {/* ── Fixed top bar ── */}
      <Header />

      <div className="pt-[72px]">
        {/* ── W3Schools-style nav strip ── */}
        <StudentTopNavigation />

        {/* ── Teacher / hero banner ── */}
        <div
          className="relative overflow-hidden w-full"
          style={{ height: "160px", backgroundColor: "#110820" }}
        >
          {/* Teacher photo — fades in from the left (RTL: photo on left side) */}
          <img
            src="/teacher-sahouri.jpg"
            alt=""
            aria-hidden
            className="absolute left-0 top-0 h-full object-cover object-top select-none pointer-events-none"
            style={{ width: "240px" }}
          />

          {/* Gradient: photo fades into dark background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(17,8,32,0) 0%, rgba(17,8,32,0.55) 30%, rgba(17,8,32,0.92) 55%, #110820 75%)",
            }}
          />

          {/* Text — right side in RTL */}
          <div
            className="absolute inset-0 flex flex-col justify-center px-8 md:px-12"
            dir="rtl"
          >
            <p className="text-white/45 text-xs font-medium tracking-widest uppercase mb-1">
              منصة أبو العربي
            </p>
            <h2 className="text-white text-xl md:text-2xl font-black leading-snug">
              مرحباً{user?.fullName ? `، ${user.fullName.split(" ")[0]}` : ""}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              مع الأستاذ محمد الساحوري — طريقك للتفوق
            </p>
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
