import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useCreateStudySession,
  useUpdateStudySession,
  useListStudyTasks,
  useListSubjects,
  useListDossiers,
  useListNotes,
  useCreateNote,
  useUpdateNote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  Focus,
  CheckCircle2,
  FileText,
  BookOpen,
  Save,
  Plus,
  ChevronDown,
} from "lucide-react";

type SessionState = "setup" | "active" | "paused" | "summary";

export default function StudyRoom() {
  const [, setLocation] = useLocation();
  const [sessionState, setSessionState] = useState<SessionState>("setup");
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [pauseCount, setPauseCount] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Setup selections
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<number | null>(null);
  const [timerMode, setTimerMode] = useState("pomodoro");
  const [startError, setStartError] = useState<string | null>(null);

  // Notes state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const queryClient = useQueryClient();

  const { data: tasksData } = useListStudyTasks({ status: "pending" });
  const { data: subjectsData } = useListSubjects();
  const { data: dossiersData } = useListDossiers(
    selectedSubject ? { subjectId: String(selectedSubject), limit: "50" } : { limit: "50" }
  );
  const { data: notesData, refetch: refetchNotes } = useListNotes(
    selectedDossierId
      ? { dossierId: String(selectedDossierId) }
      : selectedSubject
      ? { subjectId: String(selectedSubject) }
      : undefined,
    { query: { enabled: sessionState === "active" || sessionState === "paused" } }
  );

  const createSession = useCreateStudySession();
  const updateSession = useUpdateStudySession();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionState === "active" && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionState, timeRemaining]);

  const setMode = (mode: string, minutes: number) => {
    setTimerMode(mode);
    setTimeRemaining(minutes * 60);
    setTotalTime(minutes * 60);
  };

  const handleStart = () => {
    setStartError(null);
    const task = tasksData?.find((t) => t.id === selectedTask);
    const subjectId = task?.subjectId ?? selectedSubject ?? subjectsData?.[0]?.id ?? 1;

    createSession.mutate(
      {
        data: {
          subjectId,
          type: timerMode,
          plannedMinutes: totalTime / 60,
          taskId: selectedTask || undefined,
        },
      },
      {
        onSuccess: (data) => {
          setSessionId(data.id);
          setSessionState("active");
          refetchNotes();
        },
        onError: () => {
          setStartError("حدث خطأ أثناء بدء الجلسة، حاول مرة أخرى.");
        },
      }
    );
  };

  const handlePause = () => {
    setSessionState("paused");
    setPauseCount((prev) => prev + 1);
    if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "paused" } });
  };

  const handleResume = () => setSessionState("active");

  const handleComplete = () => {
    setSessionState("summary");
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    if (sessionId)
      updateSession.mutate({ id: sessionId, data: { status: "completed", actualMinutes } });
  };

  const handleAbort = () => {
    setSessionState("setup");
    if (sessionId)
      updateSession.mutate({ id: sessionId, data: { status: "abandoned" } });
  };

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    const subjectId = selectedSubject ?? subjectsData?.[0]?.id ?? 1;
    const title = noteTitle.trim() || `ملاحظة ${new Date().toLocaleDateString("ar")}`;

    if (editingNoteId) {
      updateNote.mutate(
        { id: editingNoteId, data: { title, content: noteContent } },
        {
          onSuccess: () => {
            showSaved();
            refetchNotes();
          },
        }
      );
    } else {
      createNote.mutate(
        {
          data: {
            title,
            content: noteContent,
            subjectId,
            dossierId: selectedDossierId ?? undefined,
            sessionId: sessionId ?? undefined,
          },
        },
        {
          onSuccess: (note) => {
            setEditingNoteId(note.id);
            showSaved();
            refetchNotes();
          },
        }
      );
    }
  };

  const showSaved = () => {
    setNoteSaved(true);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => setNoteSaved(false), 2000);
  };

  const loadNote = (note: { id: number; title: string; content: string }) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercentage = ((totalTime - timeRemaining) / totalTime) * 100;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const isPaused = sessionState === "paused";
  const selectedDossier = dossiersData?.items?.find((d) => d.id === selectedDossierId);

  // ══════════════════════════════════════════════════
  //  SETUP STATE
  // ══════════════════════════════════════════════════
  if (sessionState === "setup") {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-[72px] p-4 flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1/2 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="w-full max-w-2xl">
            <Card className="border-white/60 shadow-2xl p-8 bg-white/80 backdrop-blur-xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Focus className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black mb-2">غرفة التركيز والدراسة</h1>
                <p className="text-muted-foreground">بيئة خالية من المشتتات لرفع إنتاجيتك لأقصى حد.</p>
              </div>

              <div className="space-y-6">
                {/* Timer mode */}
                <div>
                  <h3 className="font-bold mb-3">اختر نظام المؤقت</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { mode: "pomodoro", min: 25, label: "بومودورو", sub: "تركيز عالي", color: "text-primary", border: "border-primary", bg: "bg-primary/5" },
                      { mode: "balanced", min: 45, label: "متوازن", sub: "حصة دراسية", color: "text-secondary", border: "border-secondary", bg: "bg-secondary/5" },
                      { mode: "deep_focus", min: 60, label: "عميق", sub: "لحل الامتحانات", color: "text-accent", border: "border-accent", bg: "bg-accent/5" },
                    ].map(({ mode, min, label, sub, color, border, bg }) => (
                      <button
                        key={mode}
                        onClick={() => setMode(mode, min)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          timerMode === mode ? `${border} ${bg} shadow-sm` : "border-black/5 hover:border-black/10 bg-white"
                        }`}
                      >
                        <div className={`text-2xl font-black ${color} mb-1`}>{min}</div>
                        <div className="text-sm font-bold">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                {subjectsData && subjectsData.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">المادة الدراسية</h3>
                    <div className="flex flex-wrap gap-2">
                      {subjectsData.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedSubject(s.id); setSelectedDossierId(null); }}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedSubject === s.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-black/8 bg-white text-foreground hover:border-black/15"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dossier */}
                {dossiersData && dossiersData.items.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">الدوسية (اختياري)</h3>
                    <div className="relative">
                      <select
                        value={selectedDossierId ?? ""}
                        onChange={(e) => setSelectedDossierId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2.5 rounded-lg border border-black/10 bg-white text-sm appearance-none focus:outline-none focus:border-primary/50"
                        dir="rtl"
                      >
                        <option value="">بدون دوسية محددة</option>
                        {dossiersData.items.map((d) => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                )}

                {startError && (
                  <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg py-2 px-4">
                    {startError}
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full text-lg h-14 shadow-xl shadow-primary/20"
                  onClick={handleStart}
                  disabled={createSession.isPending}
                >
                  {createSession.isPending ? "جاري التحضير..." : "ابدأ الجلسة الآن"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════
  //  SUMMARY STATE
  // ══════════════════════════════════════════════════
  if (sessionState === "summary") {
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-[72px] p-4 flex items-center justify-center">
          <Card className="w-full max-w-md p-8 border-white/60 shadow-2xl text-center">
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black mb-2">أحسنت صنعاً!</h2>
            <p className="text-muted-foreground mb-8">لقد أكملت جلسة دراسية بنجاح، خطوة إضافية نحو هدفك.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-muted p-4 rounded-2xl">
                <div className="text-sm text-muted-foreground mb-1">وقت الدراسة</div>
                <div className="text-2xl font-black text-primary">{actualMinutes} دقيقة</div>
              </div>
              <div className="bg-muted p-4 rounded-2xl">
                <div className="text-sm text-muted-foreground mb-1">مرات التوقف</div>
                <div className="text-2xl font-black text-secondary">{pauseCount}</div>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <h4 className="font-bold">كيف تقيم مستوى تركيزك؟</h4>
              <div className="flex justify-center gap-2 text-primary">
                {["bad", "ok", "good", "great"].map((level, i) => (
                  <button
                    key={level}
                    className="p-3 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold text-sm"
                    onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: level } })}
                  >
                    {["ضعيف", "متوسط", "جيد", "ممتاز"][i]}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => setSessionState("setup")}>جلسة جديدة</Button>
          </Card>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════
  //  ACTIVE / PAUSED STATE — new split layout
  // ══════════════════════════════════════════════════
  return (
    <>
      <Header />
      <div
        className="flex flex-col pt-[72px]"
        style={{ height: "100vh", background: isPaused ? "#fdf6ee" : "#1E0D33" }}
      >
        {/* ── TOP TIMER STRIP ── */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{
            borderBottom: `1px solid ${isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
            background: isPaused ? "rgba(251,146,60,0.06)" : "rgba(255,255,255,0.03)",
          }}
        >
          {/* Status */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPaused
                ? "bg-orange-200 text-orange-800"
                : "bg-white/10 text-white border border-white/20"
            }`}
          >
            {isPaused ? "الجلسة متوقفة مؤقتاً" : "جلسة تركيز نشطة"}
          </div>

          {/* Timer ring + time */}
          <div className="flex items-center gap-3">
            <svg width="52" height="52" className="-rotate-90">
              <circle cx="26" cy="26" r={radius} stroke={isPaused ? "#fed7aa" : "rgba(255,255,255,0.12)"} strokeWidth="5" fill="none" />
              <motion.circle
                cx="26" cy="26" r={radius}
                stroke={isPaused ? "#f97316" : "#5A2D82"}
                strokeWidth="5" fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>
            <span
              className="text-4xl font-black tabular-nums tracking-widest"
              style={{ color: isPaused ? "#7c2d12" : "#ffffff" }}
              dir="ltr"
            >
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAbort}
              title="إنهاء الجلسة"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                isPaused
                  ? "border-orange-300 text-orange-700 hover:bg-orange-100"
                  : "border-white/20 text-white/70 hover:bg-white/10"
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            {isPaused ? (
              <button
                onClick={handleResume}
                className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transition-colors"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg transition-colors"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            )}

            <button
              onClick={handleComplete}
              title="إنهاء وتسجيل"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                isPaused
                  ? "border-orange-300 text-orange-700 hover:bg-orange-100"
                  : "border-white/20 text-white/70 hover:bg-white/10"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── SPLIT PANEL ── */}
        <div className="flex flex-1 overflow-hidden" dir="rtl">

          {/* LEFT — Dossier viewer */}
          <div
            className="flex flex-col overflow-hidden"
            style={{
              width: "55%",
              borderLeft: `1px solid ${isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {/* Dossier selector header */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{
                borderBottom: `1px solid ${isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                background: isPaused ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
              }}
            >
              <BookOpen className="w-4 h-4 shrink-0" style={{ color: isPaused ? "#9ca3af" : "rgba(255,255,255,0.4)" }} />
              <div className="relative flex-1">
                <select
                  value={selectedDossierId ?? ""}
                  onChange={(e) => setSelectedDossierId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-sm font-medium pr-2 pl-6 py-1 rounded-lg border appearance-none focus:outline-none bg-transparent"
                  style={{
                    borderColor: isPaused ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
                    color: isPaused ? "#374151" : "rgba(255,255,255,0.85)",
                    background: isPaused ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                  }}
                  dir="rtl"
                >
                  <option value="">— اختر دوسية —</option>
                  {dossiersData?.items?.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: isPaused ? "#9ca3af" : "rgba(255,255,255,0.4)" }} />
              </div>
            </div>

            {/* Dossier content */}
            <div className="flex-1 overflow-auto">
              {selectedDossier ? (
                selectedDossier.fileUrl ? (
                  <iframe
                    src={selectedDossier.fileUrl}
                    className="w-full h-full border-0"
                    title={selectedDossier.title}
                  />
                ) : (
                  <div className="p-6 space-y-4">
                    <h2 className="text-xl font-black" style={{ color: isPaused ? "#111827" : "#ffffff" }}>
                      {selectedDossier.title}
                    </h2>
                    {selectedDossier.description && (
                      <p className="leading-relaxed text-sm" style={{ color: isPaused ? "#6b7280" : "rgba(255,255,255,0.65)" }}>
                        {selectedDossier.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs" style={{ color: isPaused ? "#9ca3af" : "rgba(255,255,255,0.35)" }}>
                      {selectedDossier.pageCount && <span>{selectedDossier.pageCount} صفحة</span>}
                      {selectedDossier.subjectName && <span>{selectedDossier.subjectName}</span>}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <BookOpen className="w-12 h-12 opacity-20" style={{ color: isPaused ? "#374151" : "#ffffff" }} />
                  <p className="text-sm" style={{ color: isPaused ? "#9ca3af" : "rgba(255,255,255,0.35)" }}>
                    اختر دوسية من القائمة أعلاه لتبدأ المذاكرة
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Notes editor */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: "45%", background: isPaused ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: isPaused ? "#9ca3af" : "rgba(255,255,255,0.4)" }} />
                <span className="text-sm font-bold" style={{ color: isPaused ? "#374151" : "rgba(255,255,255,0.85)" }}>
                  دفتر الملاحظات
                </span>
                {selectedDossier && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isPaused ? "#f3f4f6" : "rgba(255,255,255,0.1)", color: isPaused ? "#6b7280" : "rgba(255,255,255,0.5)" }}>
                    {selectedDossier.title}
                  </span>
                )}
              </div>
              {editingNoteId && (
                <button
                  onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: isPaused ? "#6b7280" : "rgba(255,255,255,0.4)", background: isPaused ? "#f3f4f6" : "rgba(255,255,255,0.06)" }}
                >
                  + ملاحظة جديدة
                </button>
              )}
            </div>

            {/* Saved notes list */}
            {notesData && notesData.length > 0 && (
              <div
                className="shrink-0 overflow-y-auto"
                style={{ maxHeight: "160px", borderBottom: `1px solid ${isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}
              >
                {notesData.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => loadNote(note)}
                    className="w-full text-right px-4 py-2.5 flex items-start gap-2 transition-colors"
                    style={{
                      background: editingNoteId === note.id ? (isPaused ? "rgba(90,45,130,0.06)" : "rgba(90,45,130,0.25)") : "transparent",
                      borderBottom: `1px solid ${isPaused ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: isPaused ? "#5A2D82" : "rgba(90,45,130,0.8)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: isPaused ? "#374151" : "rgba(255,255,255,0.85)" }}>
                        {note.title}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: isPaused ? "#9ca3af" : "rgba(255,255,255,0.35)" }}>
                        {note.content.slice(0, 60)}…
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Note editor */}
            <div className="flex flex-col flex-1 p-4 gap-3 overflow-hidden">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="عنوان الملاحظة..."
                className="w-full text-sm font-semibold px-3 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{
                  borderColor: isPaused ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
                  color: isPaused ? "#111827" : "#ffffff",
                }}
                dir="rtl"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب ملاحظتك هنا… يمكنك نقل أي معلومة من الدوسية وتلخيصها."
                className="flex-1 w-full text-sm px-3 py-2.5 rounded-lg border bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed"
                style={{
                  borderColor: isPaused ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
                  color: isPaused ? "#111827" : "rgba(255,255,255,0.9)",
                  minHeight: 0,
                }}
                dir="rtl"
              />
              <button
                onClick={handleSaveNote}
                disabled={!noteContent.trim() || createNote.isPending || updateNote.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                style={{
                  background: noteSaved ? (isPaused ? "#2FA84F" : "#2FA84F") : "#5A2D82",
                  color: "#ffffff",
                }}
              >
                {noteSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    تم الحفظ
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingNoteId ? "تحديث الملاحظة" : "حفظ الملاحظة"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
