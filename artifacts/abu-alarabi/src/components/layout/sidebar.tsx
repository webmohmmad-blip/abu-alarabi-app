import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookText, 
  FileText, 
  PenTool, 
  Target, 
  CalendarDays, 
  Focus, 
  StickyNote, 
  LineChart, 
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const logout = useLogout();

  const navItems = [
    { name: "لوحتي", href: "/dashboard", icon: LayoutDashboard },
    { name: "الدوسيات", href: "/dossiers", icon: BookText },
    { name: "أوراق العمل", href: "/worksheets", icon: FileText },
    { name: "الامتحانات", href: "/exams", icon: PenTool },
    { name: "الفيديوهات", href: "/videos", icon: Video },
    { name: "الكويز الأسبوعي", href: "/quiz", icon: Target },
    { name: "خطتي الدراسية", href: "/study-plan", icon: CalendarDays },
    { name: "غرفة الدراسة", href: "/study-room", icon: Focus },
    { name: "ملاحظاتي", href: "/notes", icon: StickyNote },
    { name: "إحصائياتي", href: "/statistics", icon: LineChart },
  ];

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
        window.location.reload();
      }
    });
  };

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-0 right-0 p-4 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-sidebar text-sidebar-foreground rounded-lg shadow-md"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-72 bg-sidebar text-sidebar-foreground border-l border-white/10
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <BookText className="h-7 w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-wide">أبو العربي</span>
              <span className="text-xs text-sidebar-foreground/60">منصة التفوق</span>
            </div>
          </Link>
        </div>

        <div className="p-4 shrink-0 flex items-center gap-3 bg-white/5 mx-4 mt-4 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.fullName?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold truncate">{user?.fullName}</span>
            <span className="text-xs text-sidebar-foreground/60">{user?.role === 'student' ? 'طالب توجيهي' : 'مستخدم'}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 mt-2 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20" 
                    : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground font-medium"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0 space-y-1">
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-amber-400 hover:bg-amber-500/10 font-medium group"
              onClick={() => setIsOpen(false)}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>لوحة الإدارة</span>
            </Link>
          )}
          <Link 
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              location === '/settings' 
                ? "bg-primary text-primary-foreground font-bold" 
                : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground font-medium"
            }`}
            onClick={() => setIsOpen(false)}
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            <span>الإعدادات</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-destructive/90 hover:bg-destructive/10 hover:text-destructive font-medium group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
