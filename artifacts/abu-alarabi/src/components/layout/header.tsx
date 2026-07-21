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
  { href: "/dashboard",   label: "لوحتي"                     },
  { href: "/dossiers",    label: "الدوسيات"                  },
  { href: "/worksheets",  label: "أوراق العمل"               },
  { href: "/exams",       label: "الامتحانات الإلكترونية"    },
  { href: "/weekly-quiz", label: "الكويز الأسبوعي"           },
  { href: "/study-room",  label: "غرفتي الدراسية"            },
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
          {/* Ornamental ض — exact reference style: black ring dense calligraphy + white circle */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl shrink-0 overflow-hidden bg-black">
            <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="rm">
                  <circle cx="50" cy="50" r="49" fill="white"/>
                  <circle cx="50" cy="50" r="31" fill="black"/>
                </mask>
                <clipPath id="cc">
                  <circle cx="50" cy="50" r="30"/>
                </clipPath>
              </defs>

              {/* Black background */}
              <circle cx="50" cy="50" r="50" fill="#111"/>

              {/* Dense white calligraphy filling the ring — outer row */}
              <g mask="url(#rm)" fontFamily="'Amiri','Scheherazade New','Traditional Arabic',serif" fill="white" fontSize="9" fontWeight="700" textAnchor="middle">
                {/* outer row – radius ≈ 42 → y = 50-42 = 8 */}
                <text transform="rotate(0   50 50) translate(50 8)">لغة</text>
                <text transform="rotate(20  50 50) translate(50 8)">الضاد</text>
                <text transform="rotate(40  50 50) translate(50 8)">بيان</text>
                <text transform="rotate(60  50 50) translate(50 8)">كلام</text>
                <text transform="rotate(80  50 50) translate(50 8)">أدب</text>
                <text transform="rotate(100 50 50) translate(50 8)">نحو</text>
                <text transform="rotate(120 50 50) translate(50 8)">صرف</text>
                <text transform="rotate(140 50 50) translate(50 8)">بلاغة</text>
                <text transform="rotate(160 50 50) translate(50 8)">فصحى</text>
                <text transform="rotate(180 50 50) translate(50 8)">شعر</text>
                <text transform="rotate(200 50 50) translate(50 8)">نثر</text>
                <text transform="rotate(220 50 50) translate(50 8)">عربي</text>
                <text transform="rotate(240 50 50) translate(50 8)">خط</text>
                <text transform="rotate(260 50 50) translate(50 8)">قرآن</text>
                <text transform="rotate(280 50 50) translate(50 8)">ضاد</text>
                <text transform="rotate(300 50 50) translate(50 8)">أدب</text>
                <text transform="rotate(320 50 50) translate(50 8)">كتاب</text>
                <text transform="rotate(340 50 50) translate(50 8)">لسان</text>
                {/* inner row – radius ≈ 35 → y = 50-35 = 15 */}
                <text transform="rotate(10  50 50) translate(50 15)">العربية</text>
                <text transform="rotate(30  50 50) translate(50 15)">حرف</text>
                <text transform="rotate(50  50 50) translate(50 15)">كلمة</text>
                <text transform="rotate(70  50 50) translate(50 15)">جملة</text>
                <text transform="rotate(90  50 50) translate(50 15)">معنى</text>
                <text transform="rotate(110 50 50) translate(50 15)">علم</text>
                <text transform="rotate(130 50 50) translate(50 15)">فكر</text>
                <text transform="rotate(150 50 50) translate(50 15)">شعر</text>
                <text transform="rotate(170 50 50) translate(50 15)">نحو</text>
                <text transform="rotate(190 50 50) translate(50 15)">صرف</text>
                <text transform="rotate(210 50 50) translate(50 15)">بيان</text>
                <text transform="rotate(230 50 50) translate(50 15)">لغة</text>
                <text transform="rotate(250 50 50) translate(50 15)">قلم</text>
                <text transform="rotate(270 50 50) translate(50 15)">كتب</text>
                <text transform="rotate(290 50 50) translate(50 15)">أمة</text>
                <text transform="rotate(310 50 50) translate(50 15)">ضاد</text>
                <text transform="rotate(330 50 50) translate(50 15)">فصيح</text>
                <text transform="rotate(350 50 50) translate(50 15)">أقلام</text>
              </g>

              {/* White inner circle */}
              <circle cx="50" cy="50" r="31" fill="white"/>

              {/* Ornamental inner ring — thin dark circle */}
              <circle cx="50" cy="50" r="28.5" fill="none" stroke="#111" strokeWidth="0.8"/>
              {/* Ornamental dots evenly around the ring */}
              {[0,45,90,135,180,225,270,315].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const cx = 50 + 28.5 * Math.sin(rad);
                const cy = 50 - 28.5 * Math.cos(rad);
                return <circle key={i} cx={cx} cy={cy} r="1.4" fill="#111"/>;
              })}
              {/* Second finer ring */}
              <circle cx="50" cy="50" r="25.5" fill="none" stroke="#111" strokeWidth="0.4" strokeDasharray="1.5 2.5"/>

              {/* ع — big, bold, black */}
              <text
                x="50" y="68"
                textAnchor="middle"
                fontSize="52"
                fontWeight="900"
                fontFamily="'Amiri','Scheherazade New','Traditional Arabic',serif"
                fill="#111"
                clipPath="url(#cc)"
              >ع</text>
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
