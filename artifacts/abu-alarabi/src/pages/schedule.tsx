/**
 * صفحة الجدول الدراسي الأسبوعي
 * الطالب يبني جدوله: يختار المواد الشخصية + أيام متعددة + الأوقات
 */
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Plus, Trash2, Coffee, Clock, X, Check, AlertCircle, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: number | null;
  personalSubjectId: number | null;
  subjectName: string;
  subjectColor: string;
}
interface PersonalSubject {
  id: number;
  name: string;
  color: string;
}
interface ScheduleData {
  slots: Slot[];
  personalSubjects: PersonalSubject[];
  restDays: number[];
}
interface ConflictInfo { dayOfWeek: number; conflictWith: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS     = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAYS_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const COLORS = [
  "#5A2D82", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316",
];

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
  return mins >= 60
    ? `${Math.floor(mins / 60)}س ${mins % 60 > 0 ? `${mins % 60}د` : ""}`.trim()
    : `${mins}د`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Schedule() {
  const qc = useQueryClient();

  const { data: schedule, isLoading } = useQuery<ScheduleData>({
    queryKey: ["/api/schedule"],
    queryFn: () => customFetch("/api/schedule"),
  });

  // ── Form state ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [formError, setFormError] = useState("");
  // After-submit conflict state
  const [pendingConflicts, setPendingConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const pendingPayloadRef = useRef<{ personalSubjectId: number; days: number[] } | null>(null);

  const restDays = schedule?.restDays ?? [];
  const personalSubjects = schedule?.personalSubjects ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createSubject = useMutation({
    mutationFn: (body: { name: string; color: string }) =>
      customFetch<PersonalSubject>("/api/schedule/personal-subjects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });

  const addSlots = useMutation({
    mutationFn: (body: {
      personalSubjectId: number;
      days: number[];
      startTime: string;
      endTime: string;
    }) =>
      customFetch<{ created: Slot[]; conflicts: ConflictInfo[] }>(
        "/api/schedule/slots",
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });

      if (result.conflicts.length > 0) {
        // Some days had conflicts — tell the user
        setPendingConflicts(result.conflicts);
        setShowConflictModal(true);
      }

      if (result.created.length > 0) {
        closeForm();
      }
    },
    onError: (e: any) => setFormError(e?.data?.error ?? e?.message ?? "خطأ"),
  });

  const deleteSlot = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/schedule/slots/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });
    },
  });

  const deleteSubject = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/schedule/personal-subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
    },
  });

  const setRestDays = useMutation({
    mutationFn: (days: number[]) =>
      customFetch("/api/schedule/rest-days", { method: "PUT", body: JSON.stringify({ restDays: days }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/schedule/today"] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const closeForm = () => {
    setShowForm(false);
    setSubjectName("");
    setColor(COLORS[0]);
    setSelectedDays([]);
    setStartTime("08:00");
    setEndTime("09:00");
    setFormError("");
    pendingPayloadRef.current = null;
  };

  const toggleDay = (d: number) => {
    if (restDays.includes(d)) return;
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const toggleRestDay = (d: number) => {
    const next = restDays.includes(d)
      ? restDays.filter((x) => x !== d)
      : [...restDays, d];
    setRestDays.mutate(next);
  };

  // ── Suggested subjects (autocomplete) ─────────────────────────────────────
  const trimmed = subjectName.trim();
  const suggestions = trimmed
    ? personalSubjects.filter((s) =>
        s.name.toLowerCase().includes(trimmed.toLowerCase()) && s.name !== trimmed
      )
    : [];
  const exactMatch = personalSubjects.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase()
  );

  // When choosing an existing suggestion
  const pickSuggestion = (s: PersonalSubject) => {
    setSubjectName(s.name);
    setColor(s.color);
  };

  const validateAndSubmit = async () => {
    setFormError("");
    if (!trimmed) { setFormError("اكتب اسم المادة"); return; }
    if (selectedDays.length === 0) { setFormError("اختر يوماً على الأقل"); return; }
    if (startTime >= endTime) { setFormError("وقت النهاية يجب أن يكون بعد وقت البداية"); return; }

    // Upsert the personal subject first
    const subject = await createSubject.mutateAsync({ name: trimmed, color });
    addSlots.mutate({
      personalSubjectId: subject.id,
      days: selectedDays,
      startTime,
      endTime,
    });
  };

  // Group slots by day
  const slotsByDay = Array.from({ length: 7 }, (_, d) =>
    (schedule?.slots ?? [])
      .filter((s) => s.dayOfWeek === d)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

  const totalSlots = schedule?.slots.length ?? 0;
  const studyDays = [...new Set(schedule?.slots.map((s) => s.dayOfWeek) ?? [])]
    .filter((d) => !restDays.includes(d)).length;

  // ── Group personal subjects for the sidebar ────────────────────────────────
  const subjectMap = new Map<number, PersonalSubject>();
  (schedule?.slots ?? []).forEach((s) => {
    if (s.personalSubjectId) {
      const ps = personalSubjects.find((p) => p.id === s.personalSubjectId);
      if (ps) subjectMap.set(ps.id, ps);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
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

        {/* Rest days */}
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

        {/* Weekly grid */}
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
                      onClick={() => {
                        setSelectedDays([d]);
                        setShowForm(true);
                      }}
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
                        onClick={() => {
                          setSelectedDays([d]);
                          setShowForm(true);
                        }}
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

        {/* Personal subjects list (with delete) */}
        {subjectMap.size > 0 && (
          <div className="bg-card rounded-2xl border p-4">
            <h2 className="font-bold text-sm mb-3">موادي الشخصية</h2>
            <div className="flex flex-wrap gap-2">
              {[...subjectMap.values()].map((ps) => (
                <div
                  key={ps.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm"
                  style={{ borderColor: ps.color + "40", background: ps.color + "12" }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ps.color }} />
                  <span className="font-semibold">{ps.name}</span>
                  <button
                    onClick={() => {
                      if (confirm(`حذف "${ps.name}" وكل حصصه من الجدول؟`)) {
                        deleteSubject.mutate(ps.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Add slot modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="bg-card rounded-3xl shadow-2xl p-6 w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg">إضافة حصة دراسية</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">

              {/* Subject name */}
              <div className="relative">
                <label className="text-sm font-bold mb-1.5 block">اسم المادة</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                  placeholder="مثال: رياضيات، فيزياء، نحو..."
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  autoComplete="off"
                />
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => pickSuggestion(s)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-sm text-right"
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Color picker — hide if using an existing subject's color */}
              <div>
                <label className="text-sm font-bold mb-1.5 block">اللون</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Multi-day selector */}
              <div>
                <label className="text-sm font-bold mb-1.5 block">
                  الأيام
                  {selectedDays.length > 0 && (
                    <span className="mr-1 text-xs font-normal text-primary">
                      ({selectedDays.length} {selectedDays.length === 1 ? "يوم" : "أيام"})
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_SHORT.map((label, d) => {
                    const isRest = restDays.includes(d);
                    const isSelected = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        disabled={isRest}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-primary text-white"
                            : isRest
                            ? "bg-amber-50 text-amber-300 cursor-not-allowed"
                            : "bg-muted hover:bg-primary/10 text-muted-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {selectedDays.sort().map((d) => DAYS[d]).join(" · ")}
                  </p>
                )}
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold mb-1.5 block">من</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                  >
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold mb-1.5 block">إلى</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                  >
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {startTime < endTime && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 -mt-2">
                  <Clock className="w-3 h-3" />
                  المدة: {slotDuration(startTime, endTime)}
                </p>
              )}

              {formError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </p>
              )}

              <Button
                className="w-full"
                onClick={validateAndSubmit}
                disabled={addSlots.isPending || createSubject.isPending}
              >
                {(addSlots.isPending || createSubject.isPending)
                  ? "جاري الحفظ..."
                  : selectedDays.length > 1
                  ? `إضافة ${selectedDays.length} حصص`
                  : "إضافة الحصة"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conflict modal ─────────────────────────────────────────────────── */}
      {showConflictModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h2 className="font-black text-base">تعارض في المواعيد</h2>
            </div>
            <div className="space-y-2 mb-5">
              {pendingConflicts.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-amber-50 rounded-xl px-3 py-2">
                  <span className="font-bold text-amber-700">{DAYS[c.dayOfWeek]}:</span>
                  <span className="text-muted-foreground">
                    يوجد تعارض مع مادة أخرى في هذا الوقت
                    {c.conflictWith ? ` (${c.conflictWith})` : ""}
                  </span>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setShowConflictModal(false);
                setPendingConflicts([]);
              }}
            >
              حسناً
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
