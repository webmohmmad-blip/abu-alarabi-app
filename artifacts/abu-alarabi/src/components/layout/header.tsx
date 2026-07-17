import { Link, useLocation } from "wouter";
import { UserCircle, LogOut, ChevronLeft, CalendarDays, CheckCircle2, Clock, BookOpen, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

interface StudyTask {
  id: number;
  title: string;
  subjectName: string;
  subjectColor: string;
  type: string;
  status: string;
  durationMinutes: number | null;
  scheduledAt: string;
}

interface StudyPlan {
  goal: string;
  todayTasks: StudyTask[];
  streakDays: number;
  recommendation: string;
}

function useStudyPlan(enabled: boolean) {
  return useQuery<StudyPlan>({
    queryKey: ["/api/studyplan"],
    queryFn: () => customFetch<StudyPlan>("/api/studyplan", { method: "GET" }),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const [scrolled, setScrolled] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const { data: plan } = useStudyPlan(isAuthenticated);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSchedule) return;
    const handler = (e: MouseEvent) => {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedule(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSchedule]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { setLocation("/login"); window.location.reload(); },
    });
  };

  const isHome = location === "/";

  const todayTasks = plan?.todayTasks ?? [];
  const doneTasks = todayTasks.filter(t => t.status === "completed");
  const pendingTasks = todayTasks.filter(t => t.status !== "completed");

  const TYPE_LABEL: Record<string, string> = {
    dossier: "دوسيه", worksheet: "ورقة عمل", revision: "مراجعة", exam: "امتحان", lesson: "درس",
  };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      isHome && !scrolled ? "bg-transparent border-transparent" : "bg-foreground/95 backdrop-blur-md border-b border-white/10"
    }`}>
      <div className="container mx-auto flex h-18 items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm"
            style={{ background: "linear-gradient(135deg, #5A2D82 0%, #3a1a59 100%)" }}>
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
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location === item.href ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth section */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Study schedule button */}
              <div className="relative" ref={scheduleRef}>
                <button
                  onClick={() => setShowSchedule(s => !s)}
                  className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
                    showSchedule ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>جدولك اليوم</span>
                  {pendingTasks.length > 0 && (
                    <span className="w-5 h-5 bg-accent text-white rounded-full text-[10px] font-black flex items-center justify-center leading-none">
                      {pendingTasks.length}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {showSchedule && (
                  <div className="absolute left-0 top-full mt-2 w-80 bg-[#1a1030]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">جدولك الدراسي اليوم</h3>
                        {todayTasks.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {doneTasks.length} من {todayTasks.length} مهام مكتملة
                          </p>
                        )}
                      </div>
                      <button onClick={() => setShowSchedule(false)} className="text-muted-foreground hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress bar */}
                    {todayTasks.length > 0 && (
                      <div className="px-4 pt-3">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                            style={{ width: `${(doneTasks.length / todayTasks.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    <div className="max-h-72 overflow-y-auto px-2 py-2">
                      {todayTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                          <CalendarDays className="w-10 h-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium text-white/60">لا توجد مهام مجدولة اليوم</p>
                          {plan?.recommendation && (
                            <p className="text-xs text-muted-foreground mt-1">{plan.recommendation}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {pendingTasks.length > 0 && (
                            <div className="mb-1">
                              {pendingTasks.map(task => (
                                <TaskRow key={task.id} task={task} typeLabel={TYPE_LABEL} />
                              ))}
                            </div>
                          )}
                          {doneTasks.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">مكتملة</div>
                              {doneTasks.map(task => (
                                <TaskRow key={task.id} task={task} typeLabel={TYPE_LABEL} done />
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                      {plan?.streakDays ? (
                        <div className="flex items-center gap-1.5 text-xs text-accent font-bold">
                          🔥 {plan.streakDays} يوم متواصل
                        </div>
                      ) : <div />}
                      <Link href="/dashboard" onClick={() => setShowSchedule(false)}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                        لوحة التحكم ←
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User avatar */}
              <Link href="/dashboard"
                className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-black text-white">
                  {user?.fullName?.charAt(0) || <UserCircle className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium text-white/80 truncate max-w-[100px]">{user?.fullName}</span>
              </Link>

              <button onClick={handleLogout}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2">
                تسجيل الدخول
              </Link>
              <Link href="/register"
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5">
                ابدأ الآن <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function TaskRow({ task, typeLabel, done = false }: { task: StudyTask; typeLabel: Record<string, string>; done?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors ${done ? "opacity-50" : "hover:bg-white/5"}`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${done ? "bg-green-400" : "bg-white/20"}`}
        style={!done ? { backgroundColor: task.subjectColor } : {}} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : "text-white"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{typeLabel[task.type] ?? task.type}</span>
          {task.durationMinutes && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />{task.durationMinutes} د
            </span>
          )}
        </div>
      </div>
      {done && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
    </div>
  );
}
