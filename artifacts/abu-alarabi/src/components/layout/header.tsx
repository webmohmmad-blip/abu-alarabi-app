import { Link, useLocation } from "wouter";
import { BookOpen, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
        window.location.reload();
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 text-sidebar-foreground">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-wide">أبو العربي</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <Link href="/dossiers" className="hover:text-primary transition-colors">الدوسيات</Link>
            <Link href="/worksheets" className="hover:text-primary transition-colors">أوراق العمل</Link>
            <Link href="/exams" className="hover:text-primary transition-colors">الامتحانات</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="hidden sm:flex items-center gap-2 hover:bg-white/10 py-2 px-3 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                  {user?.fullName?.charAt(0) || <UserCircle className="w-5 h-5" />}
                </div>
                <span className="text-sm font-medium truncate max-w-[120px]">{user?.fullName}</span>
              </Link>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="تسجيل الخروج">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors px-4 py-2">
                تسجيل الدخول
              </Link>
              <Link href="/register" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5">
                ابدأ الآن
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
