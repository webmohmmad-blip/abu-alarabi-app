import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShieldCheck,
  Settings,
  ScrollText,
  Users2,
  Megaphone,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  BookText,
  MessageSquareWarning,
  PenTool,
  AlignLeft,
  Wallpaper,
  Layout,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";

const adminNavItems = [
  { name: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
  { name: "المستخدمون", href: "/admin/users", icon: Users },
  { name: "الدوسيات", href: "/admin/content", icon: BookOpen },
  { name: "الامتحانات", href: "/admin/exams", icon: PenTool },
  { name: "أوراق العمل", href: "/admin/worksheets", icon: BookText },
  { name: "الكويز الأسبوعي", href: "/admin/quiz", icon: MessageSquareWarning },
  { name: "لافتات الصفحة", href: "/admin/advertisements", icon: Wallpaper },
  { name: "الصفحة الرئيسية", href: "/admin/homepage-settings", icon: Layout },
  { name: "الصلاحيات", href: "/admin/roles", icon: ShieldCheck },
  { name: "الفئات الرئيسية", href: "/admin/groups", icon: Users2 },
  { name: "الإعدادات", href: "/admin/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const logout = useLogout();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, isAdmin, setLocation]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
        window.location.reload();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-[#0e0b1a] text-white" dir="rtl">
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-sidebar rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-40 w-64 bg-sidebar border-l border-white/10 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/20 group-hover:scale-105 transition-transform">
              <BookText className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-base">أبو العربي</div>
              <div className="text-xs text-amber-400 font-medium">لوحة الإدارة</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            العودة للمنصة
          </Link>
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold shrink-0">
              {user?.fullName?.charAt(0) ?? "أ"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role === "super_admin" ? "مدير عام" : "مدير"}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 md:mr-64">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
