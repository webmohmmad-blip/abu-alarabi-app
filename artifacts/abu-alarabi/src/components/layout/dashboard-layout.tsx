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
        {/* ── Page content ── */}
        <main className="mx-auto max-w-7xl px-4 md:px-8 py-8 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
