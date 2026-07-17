import { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <Header />
      <main className="flex-1 flex flex-col relative w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
