import { Link, useLocation } from "wouter";
import {
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronDown,
  CalendarDays,
  CheckCircle2,
  Clock,
  Settings,
  X,
  ShieldCheck,
  Plus,
  Coffee,
  Circle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScheduleSlot {
  id: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
}
interface CustomTask {
  id: number;
  title: string;
  isCompleted: boolean;
}
interface TodayData {
  date: string;
  dayOfWeek: number;
  isRestDay: boolean;
  slots: ScheduleSlot[];
  customTasks: CustomTask[];
}

function useTodaySchedule(enabled: boolean) {
  return useQuery<TodayData>({
    queryKey: ["/api/schedule/today"],
    queryFn: () => customFetch<TodayData>("/api/schedule/today", { method: "GET" }),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

const STUDENT_NAV = [
  { href: "/dashboard",   label: "لوحتي"                  },
  { href: "/dossiers",    label: "الدوسيات"               },
  { href: "/worksheets",  label: "أوراق العمل"            },
  { href: "/exams",       label: "الامتحانات"             },
  { href: "/weekly-quiz", label: "الكويز الأسبوعي"        },
  { href: "/study-room",  label: "غرفتي الدراسية"         },
  { href: "/schedule",    label: "جدولي الدراسي"          },
] as const;

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const qc = useQueryClient();
  const [scrolled, setScrolled] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // New custom task input
  const [newTaskText, setNewTaskText] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const { data: today } = useTodaySchedule(isAuthenticated);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showSchedule && !showAccount) return;
    const handler = (e: MouseEvent) => {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node))
        setShowSchedule(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setShowAccount(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSchedule, showAccount]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addTask = useMutation({
    mutationFn: (title: string) =>
      customFetch("/api/schedule/daily-tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });
      setNewTaskText("");
      setAddingTask(false);
    },
  });

  const toggleTask = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/schedule/daily-tasks/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/schedule/today"] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/schedule/daily-tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/schedule/today"] }),
  });

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { setLocation("/login"); window.location.reload(); },
    });
  };

  const isHome = location === "/";
  const isPrivileged = user?.role === "admin" || user?.role === "super_admin";

  // Counts for badge
  const pendingSlots = today?.isRestDay ? 0 : (today?.slots.length ?? 0);
  const pendingCustom = today?.customTasks.filter((t) => !t.isCompleted).length ?? 0;
  const totalPending = pendingSlots + pendingCustom;

  const completedCustom = today?.customTasks.filter((t) => t.isCompleted) ?? [];
  const pendingCustomTasks = today?.customTasks.filter((t) => !t.isCompleted) ?? [];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isHome && !scrolled
          ? "bg-transparent border-transparent"
          : "bg-foreground/95 backdrop-blur-md border-b border-white/10"
      }`}
    >
      <div className="flex h-[72px] items-center justify-between px-6 gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #5A2D82 0%, #3a1a59 100%)" }}
          >
            {/* Arabic calligraphy pen logo */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Pen nib / calligraphy motif */}
              <path d="M17 3L21 7L8 20H4V16L17 3Z" fill="white" fillOpacity="0.95" />
              <path d="M14.5 5.5L18.5 9.5" stroke="rgba(90,45,130,0.7)" strokeWidth="1.2" strokeLinecap="round"/>
              {/* Arabic diacritic dot — represents Arabic script */}
              <circle cx="5.5" cy="21.5" r="1.5" fill="white" fillOpacity="0.7"/>
              {/* Ink drop at base */}
              <path d="M4 16L4 20L8 20" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">أبو العربي</span>
        </Link>

        {/* ── Centre nav ── */}
        {isAuthenticated ? (
          <nav dir="rtl" className="hidden md:flex items-stretch flex-1 overflow-x-auto scrollbar-hide h-full">
            {STUDENT_NAV.map((item) => {
              const active = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 text-[13.5px] whitespace-nowrap border-b-2 transition-colors duration-150 ${
                    active
                      ? "border-primary text-white font-semibold"
                      : "border-transparent text-white/60 hover:text-white hover:border-white/20 font-normal"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {[
              { href: "/",           label: "الرئيسية"   },
              { href: "/dossiers",   label: "الدوسيات"   },
              { href: "/worksheets", label: "أوراق العمل" },
              { href: "/exams",      label: "الامتحانات" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location === item.href
                    ? "text-white bg-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* ── Right controls ── */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              {/* ── Today's schedule dropdown ── */}
              <div className="relative" ref={scheduleRef}>
                <button
                  onClick={() => setShowSchedule((s) => !s)}
                  className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
                    showSchedule ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden lg:inline">مهام اليوم</span>
                  {totalPending > 0 && (
                    <span className="w-5 h-5 bg-accent text-white rounded-full text-[10px] font-black flex items-center justify-center leading-none">
                      {totalPending}
                    </span>
                  )}
                </button>

                {showSchedule && (
                  <div className="absolute left-0 top-full mt-2 w-80 bg-[#1a1030]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">

                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">مهام اليوم</h3>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {today?.isRestDay
                            ? "يوم راحة 🌙"
                            : today
                            ? `${(today.slots.length ?? 0) + (today.customTasks?.length ?? 0)} مهمة اليوم`
                            : "لا يوجد جدول بعد"}
                        </p>
                      </div>
                      <button onClick={() => setShowSchedule(false)} className="text-white/40 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-80 overflow-y-auto">

                      {/* Rest day */}
                      {today?.isRestDay ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <Coffee className="w-8 h-8 text-amber-400/60" />
                          <p className="text-sm text-white/50">يوم راحة — استرح وعُد غداً 💪</p>
                        </div>
                      ) : !today || (today.slots.length === 0 && today.customTasks.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 px-4 text-center">
                          <CalendarDays className="w-8 h-8 text-white/20" />
                          <p className="text-sm text-white/50">لا توجد مهام اليوم</p>
                          <Link href="/schedule" onClick={() => setShowSchedule(false)} className="text-xs text-primary hover:underline">
                            أنشئ جدولك الدراسي
                          </Link>
                        </div>
                      ) : (
                        <div className="px-2 py-2 space-y-1">

                          {/* Schedule slots (from weekly timetable) */}
                          {(today.slots ?? []).length > 0 && (
                            <div className="px-2 pb-1 pt-1">
                              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">من جدولك الأسبوعي</p>
                              {today.slots.map((s) => (
                                <div key={s.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.subjectColor }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{s.subjectName}</p>
                                    <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {s.startTime} – {s.endTime}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Custom tasks */}
                          {(pendingCustomTasks.length > 0 || completedCustom.length > 0) && (
                            <div className="px-2 pb-1 pt-1">
                              {(today.slots ?? []).length > 0 && (
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">مهامي الإضافية</p>
                              )}
                              {pendingCustomTasks.map((t) => (
                                <div key={t.id} className="group flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
                                  <button
                                    onClick={() => toggleTask.mutate(t.id)}
                                    className="w-4 h-4 rounded-full border border-white/30 hover:border-primary flex items-center justify-center shrink-0 transition-colors"
                                  >
                                    <Circle className="w-2.5 h-2.5 text-white/20" />
                                  </button>
                                  <p className="flex-1 text-sm text-white truncate">{t.title}</p>
                                  <button
                                    onClick={() => deleteTask.mutate(t.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-destructive"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {completedCustom.map((t) => (
                                <div key={t.id} className="group flex items-center gap-2 px-2 py-2 rounded-xl opacity-40">
                                  <button
                                    onClick={() => toggleTask.mutate(t.id)}
                                    className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                  </button>
                                  <p className="flex-1 text-sm text-white line-through truncate">{t.title}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Add custom task input */}
                    <div className="border-t border-white/10 px-3 py-2">
                      {addingTask ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newTaskText.trim()) addTask.mutate(newTaskText.trim());
                              if (e.key === "Escape") { setAddingTask(false); setNewTaskText(""); }
                            }}
                            placeholder="اكتب مهمتك..."
                            className="flex-1 bg-white/10 text-white placeholder:text-white/30 text-sm px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={() => { if (newTaskText.trim()) addTask.mutate(newTaskText.trim()); }}
                            disabled={!newTaskText.trim() || addTask.isPending}
                            className="w-7 h-7 bg-primary hover:bg-primary/80 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button onClick={() => { setAddingTask(false); setNewTaskText(""); }} className="text-white/30 hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTask(true)}
                          className="w-full flex items-center gap-2 text-white/40 hover:text-white text-xs py-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          أضف مهمة إضافية ليومك
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-white/10 flex items-center justify-between">
                      <Link href="/schedule" onClick={() => setShowSchedule(false)} className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                        عدّل جدولك ←
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin link */}
              {isPrivileged && (
                <Link href="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </Link>
              )}

              {/* Account dropdown */}
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setShowAccount((s) => !s)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${showAccount ? "bg-white/15" : "hover:bg-white/10"}`}
                  aria-label="قائمة الحساب"
                  aria-expanded={showAccount}
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                    <UserCircle className="w-[18px] h-[18px]" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-white/80 truncate max-w-[100px]">
                    {user?.fullName}
                  </span>
                  <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${showAccount ? "rotate-180" : ""}`} />
                </button>

                {showAccount && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-[#1a1030]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user?.role === "student" ? "طالب" : user?.role === "admin" ? "مدير" : user?.role}
                      </p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <Link href="/settings" onClick={() => setShowAccount(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm font-medium">الإعدادات</span>
                      </Link>
                      <button
                        onClick={() => { setShowAccount(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2">
                تسجيل الدخول
              </Link>
              <Link href="/register" className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5">
                ابدأ الآن <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
