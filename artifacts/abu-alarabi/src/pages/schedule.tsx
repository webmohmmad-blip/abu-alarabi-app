/**
 * صفحة الجدول الدراسي الأسبوعي
 * الطالب يبني جدوله: يختار المواد + الأوقات + أيام الراحة
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Plus, Trash2, Coffee, BookOpen, Clock, ChevronDown, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
}
interface ScheduleData { slots: Slot[]; restDays: number[]; }
interface Subject { id: number; name: string; color: string; grade?: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAYS_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function slotDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  return mins >= 60 ? `${Math.floor(mins / 60)}س ${mins % 60 > 0 ? `${mins % 60}د` : ""}`.trim() : `${mins}د`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Schedule() {
  const qc = useQueryClient();

  const { data: schedule, isLoading } = useQuery<ScheduleData>({
    queryKey: ["/api/schedule"],
    queryFn: () => customFetch("/api/schedule"),
  });
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => customFetch("/api/subjects"),
  });

  // ── Add slot form state ────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjectId: "", dayOfWeek: "0", startTime: "08:00", endTime: "09:00" });
  const [formError, setFormError] = useState("");

  const addSlot = useMutation({
    mutationFn: () =>
      customFetch("/api/schedule/slots", {
        method: "POST",
        body: JSON.stringify({
          subjectId: parseInt(form.subjectId, 10),
          dayOfWeek: parseInt(form.dayOfWeek, 10),
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });
      setShowForm(false);
      setForm({ subjectId: "", dayOfWeek: "0", startTime: "08:00", endTime: "09:00" });
    },
    onError: (e: any) => setFormError(e.message ?? "خطأ"),
  });

  const deleteSlot = useMutation({
    mutationFn: (id: number) => customFetch(`/api/schedule/slots/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });
    },
  });

  const setRestDays = useMutation({
    mutationFn: (restDays: number[]) =>
      customFetch("/api/schedule/rest-days", {
        method: "PUT",
        body: JSON.stringify({ restDays }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });
    },
  });

  const restDays = schedule?.restDays ?? [];

  const toggleRestDay = (d: number) => {
    const next = restDays.includes(d) ? restDays.filter((x) => x !== d) : [...restDays, d];
    setRestDays.mutate(next);
  };

  const validateAndSubmit = () => {
    setFormError("");
    if (!form.subjectId) { setFormError("اختر مادة"); return; }
    if (form.startTime >= form.endTime) { setFormError("وقت النهاية يجب أن يكون بعد وقت البداية"); return; }
    addSlot.mutate();
  };

  // Group slots by day
  const slotsByDay = Array.from({ length: 7 }, (_, d) =>
    (schedule?.slots ?? []).filter((s) => s.dayOfWeek === d).sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

  const totalSlots = schedule?.slots.length ?? 0;
  const studyDays = [...new Set(schedule?.slots.map((s) => s.dayOfWeek) ?? [])].filter((d) => !restDays.includes(d)).length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black">جدولي الدراسي</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalSlots === 0
                ? "ابنِ جدولك الأسبوعي — أضف موادك وأوقاتها"
                : `${totalSlots} حصة أسبوعياً على ${studyDays} يوم دراسي`}
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> إضافة حصة
          </Button>
        </div>

        {/* ── Rest days ── */}
        <div className="bg-card rounded-2xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold text-sm">أيام الراحة</h2>
            <span className="text-xs text-muted-foreground">(لن تظهر مهام هذه الأيام)</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DAYS_SHORT.map((label, d) => {
              const isRest = restDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleRestDay(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    isRest
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {isRest && <Coffee className="w-3 h-3 inline ml-1" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Weekly grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS.map((dayLabel, d) => {
              const isRest = restDays.includes(d);
              const daySlots = slotsByDay[d];
              const isToday = new Date().getDay() === d;

              return (
                <div
                  key={d}
                  className={`rounded-2xl border p-3 flex flex-col gap-2 min-h-[120px] ${
                    isRest
                      ? "bg-amber-50/50 border-amber-100"
                      : isToday
                      ? "bg-primary/4 border-primary/20"
                      : "bg-card border-border"
                  }`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {dayLabel}
                    </span>
                    {isRest && <Coffee className="w-3 h-3 text-amber-400" />}
                    {isToday && !isRest && (
                      <span className="text-[9px] bg-primary text-white rounded-full px-1.5 py-0.5 font-bold">اليوم</span>
                    )}
                  </div>

                  {/* Slots */}
                  {isRest ? (
                    <p className="text-[10px] text-amber-500 text-center py-2">راحة</p>
                  ) : daySlots.length === 0 ? (
                    <button
                      onClick={() => { setForm((f) => ({ ...f, dayOfWeek: String(d) })); setShowForm(true); }}
                      className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/40 hover:text-primary transition-colors rounded-xl hover:bg-primary/5 border border-dashed border-transparent hover:border-primary/20"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      {daySlots.map((s) => (
                        <div
                          key={s.id}
                          className="group relative rounded-xl px-2 py-1.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: s.subjectColor }}
                        >
                          <div className="truncate">{s.subjectName}</div>
                          <div className="flex items-center gap-1 opacity-80 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {s.startTime}–{s.endTime}
                          </div>
                          <button
                            onClick={() => deleteSlot.mutate(s.id)}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => { setForm((f) => ({ ...f, dayOfWeek: String(d) })); setShowForm(true); }}
                        className="w-full text-[9px] text-muted-foreground/40 hover:text-primary transition-colors flex items-center justify-center gap-0.5 py-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> إضافة
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Add slot modal ── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
            <div className="bg-card rounded-3xl shadow-2xl p-6 w-full max-w-md border border-border">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-lg">إضافة حصة دراسية</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="text-sm font-bold mb-1.5 block">المادة</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {subjects?.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setForm((f) => ({ ...f, subjectId: String(s.id) }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold text-right transition-all ${
                          form.subjectId === String(s.id)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                        {form.subjectId === String(s.id) && <Check className="w-3.5 h-3.5 mr-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day */}
                <div>
                  <label className="text-sm font-bold mb-1.5 block">اليوم</label>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_SHORT.map((label, d) => (
                      <button
                        key={d}
                        onClick={() => setForm((f) => ({ ...f, dayOfWeek: String(d) }))}
                        disabled={restDays.includes(d)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          form.dayOfWeek === String(d)
                            ? "bg-primary text-white"
                            : restDays.includes(d)
                            ? "bg-amber-50 text-amber-300 cursor-not-allowed"
                            : "bg-muted hover:bg-primary/10 text-muted-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold mb-1.5 block">من</label>
                    <select
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold mb-1.5 block">إلى</label>
                    <select
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {form.startTime < form.endTime && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    المدة: {slotDuration(form.startTime, form.endTime)}
                  </p>
                )}

                {formError && <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{formError}</p>}

                <Button
                  className="w-full"
                  onClick={validateAndSubmit}
                  disabled={addSlot.isPending}
                >
                  {addSlot.isPending ? "جاري الحفظ..." : "إضافة الحصة"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
