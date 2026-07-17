import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-[100dvh] flex bg-background/50 selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 md:mr-72 transition-all duration-300">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
