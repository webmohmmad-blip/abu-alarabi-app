import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, BookOpen, CheckCircle2, XCircle, Pause,
  ChevronDown, TrendingUp, Calendar, Flame,
} from "lucide-react";

interface Session {
  id: number;
  subjectId: number;
  subjectName: string;
  type: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number;
  actualMinutes: number | null;
  focusScore: number | null;
  pauseCount: number;
}

const TYPE_LABEL: Record<string, string> = {
  pomodoro: "بومودورو",
  balanced: "متوازن",
  deep_focus: "تركيز عميق",
  quick_review: "مراجعة سريعة",
  custom: "مخصص",
};

const STATUS_STYLE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "مكتملة", color: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
  paused: { label: "متوقفة", color: "text-yellow-400 bg-yellow-400/10", icon: Pause },
  abandoned: { label: "ملغاة", color: "text-red-400 bg-red-400/10", icon: XCircle },
  active: { label: "نشطة", color: "text-primary bg-primary/10", icon: Clock },
};

const FOCUS_LABEL: Record<string, string> = {
  great: "ممتاز ⭐",
  good: "جيد",
  ok: "متوسط",
  bad: "ضعيف",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}
function groupByDate(sessions: Session[]) {
  const map: Record<string, Session[]> = {};
  for (const s of sessions) {
    const key = new Date(s.startedAt).toLocaleDateString("ar-SA");
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return Object.entries(map).sort((a, b) =>
    new Date(b[1][0].startedAt).getTime() - new Date(a[1][0].startedAt).getTime()
  );
}

export default function SessionsHistory() {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: () => customFetch<Session[]>("/api/sessions", { method: "GET" }),
  });

  const completed = sessions?.filter((s) => s.status === "completed") ?? [];
  const totalMinutes = completed.reduce((sum, s) => sum + (s.actualMinutes ?? 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const avgFocus = completed.filter((s) => s.focusScore).length > 0
    ? (completed.reduce((sum, s) => sum + (s.focusScore ?? 0), 0) / completed.filter((s) => s.focusScore).length).toFixed(1)
    : null;

  const grouped = sessions ? groupByDate(sessions) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black">سجل جلسات الدراسة</h1>
          <p className="text-muted-foreground text-sm mt-1">كل جلسة دراسية تم تسجيلها</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الجلسات", value: sessions?.length ?? 0, icon: Calendar, color: "text-primary" },
            { label: "جلسات مكتملة", value: completed.length, icon: CheckCircle2, color: "text-green-500" },
            { label: "ساعات الدراسة", value: `${totalHours}h ${totalMinutes % 60}m`, icon: Clock, color: "text-secondary" },
            { label: "متوسط التركيز", value: avgFocus ?? "—", icon: Flame, color: "text-accent" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-4">
                <div className={`${color} mb-2`}><Icon className="w-5 h-5" /></div>
                <div className="text-2xl font-black">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sessions list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : sessions?.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">لا توجد جلسات بعد</h3>
              <p className="text-muted-foreground text-sm">ابدأ أول جلسة دراسية من غرفة الدراسة.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {grouped.map(([dateKey, daySessions]) => {
              const isExpanded = expandedDate === dateKey;
              const dayMinutes = daySessions.filter((s) => s.status === "completed").reduce((sum, s) => sum + (s.actualMinutes ?? 0), 0);
              return (
                <Card key={dateKey} className="border-border/60 overflow-hidden">
                  {/* Date header */}
                  <button
                    onClick={() => setExpandedDate(isExpanded ? null : dateKey)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{formatDate(daySessions[0].startedAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          {daySessions.length} جلسة • {dayMinutes} دقيقة مكتملة
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {daySessions.map((s) => {
                        const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.active;
                        const StIcon = st.icon;
                        return (
                          <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                            {/* Status icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${st.color}`}>
                              <StIcon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{s.subjectName || "—"}</span>
                                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">
                                  {TYPE_LABEL[s.type] ?? s.type}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>
                                  {st.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                <span>{formatTime(s.startedAt)}</span>
                                {s.actualMinutes != null && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {s.actualMinutes} دقيقة
                                  </span>
                                )}
                                {s.pauseCount > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Pause className="w-3 h-3" />
                                    {s.pauseCount} توقف
                                  </span>
                                )}
                                {s.focusScore && (
                                  <span className="flex items-center gap-1 text-amber-500">
                                    <Flame className="w-3 h-3" />
                                    {FOCUS_LABEL[String(s.focusScore)] ?? s.focusScore}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-left shrink-0">
                              <div className="text-sm font-black text-primary">
                                {s.actualMinutes ?? s.plannedMinutes}
                                <span className="text-xs font-normal text-muted-foreground"> د</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                من {s.plannedMinutes} مخططة
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
