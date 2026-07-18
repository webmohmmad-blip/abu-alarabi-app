import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "./header";
import { StudentTopNavigation } from "./student-top-navigation";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
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

  if (!isAuthenticated) {
    return null; // useEffect will redirect
  }

  return (
    <div className="min-h-[100dvh] bg-background selection:bg-primary/20">
      {/* Fixed top bar */}
      <Header />

      {/* Push below 72px fixed header */}
      <div className="pt-[72px]">
        {/* Sticky horizontal nav */}
        <StudentTopNavigation />

        {/* Page content — full width, no sidebar */}
        <main className="mx-auto max-w-7xl px-4 md:px-8 py-8 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
