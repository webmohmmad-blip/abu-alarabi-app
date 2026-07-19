import { useState, useEffect, useRef, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import {
  Play, Pause, Square, Focus, CheckCircle2,
  FileText, BookOpen, Save, ChevronDown, Upload,
  Pen, MousePointer2, Trash2, Minus, Plus, Eraser,
} from "lucide-react";

type SessionState = "setup" | "active" | "paused" | "summary";
type ActiveTool = "none" | "pen" | "select";

export default function StudyRoom() {
  const [, ] = useLocation();
  const [sessionState, setSessionState] = useState<SessionState>("setup");
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [pauseCount, setPauseCount] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Setup
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<number | null>(null);
  const [timerMode, setTimerMode] = useState("pomodoro");
  const [startError, setStartError] = useState<string | null>(null);

  // Notes (text only)
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Dossier annotation overlay
  const [activeTool, setActiveTool] = useState<ActiveTool>("none");
  const [penColor, setPenColor] = useState("#f97316");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Resizable panels
  const [leftWidth, setLeftWidth] = useState(58);
  const isDraggingDivider = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(58);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local dossier import
  const [localDossierUrl, setLocalDossierUrl] = useState<string | null>(null);
  const [localDossierName, setLocalDossierName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tasksData } = useListStudyTasks({ status: "pending" });
  const { data: subjectsData } = useListSubjects();
  const { data: dossiersData } = useListDossiers({ limit: "50" });
  const { data: notesData, refetch: refetchNotes } = useListNotes(
    selectedDossierId ? { dossierId: String(selectedDossierId) }
      : selectedSubject ? { subjectId: String(selectedSubject) } : undefined,
    { query: { enabled: sessionState === "active" || sessionState === "paused" } }
  );

  const createSession = useCreateStudySession();
  const updateSession = useUpdateStudySession();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  // ── Timer ──
  useEffect(() => {
    let id: NodeJS.Timeout;
    if (sessionState === "active" && timeRemaining > 0) {
      id = setInterval(() => {
        setTimeRemaining((p) => { if (p <= 1) { handleComplete(); return 0; } return p - 1; });
      }, 1000);
    }
    return () => clearInterval(id);
  }, [sessionState, timeRemaining]);

  // ── Resizable divider ──
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingDivider.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingDivider.current || !containerRef.current) return;
      const cw = containerRef.current.offsetWidth;
      // RTL: dossier is on the right side of the container
      const delta = dragStartX.current - e.clientX;
      setLeftWidth(Math.max(25, Math.min(75, dragStartWidth.current + (delta / cw) * 100)));
    };
    const onUp = () => { isDraggingDivider.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Canvas annotation helpers ──
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = annotationCanvasRef.current!.getBoundingClientRect();
    const scaleX = annotationCanvasRef.current!.width / r.width;
    const scaleY = annotationCanvasRef.current!.height / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  };

  const onCanvasDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "none") return;
    const pos = getPos(e);
    if (activeTool === "pen") {
      isDrawing.current = true;
      lastPos.current = pos;
      const ctx = annotationCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = isEraser ? "rgba(0,0,0,0)" : penColor;
      ctx.lineWidth = isEraser ? penSize * 5 : penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (isEraser ? penSize * 5 : penSize) / 2, 0, Math.PI * 2);
      ctx.fillStyle = penColor;
      if (!isEraser) ctx.fill();
    } else if (activeTool === "select") {
      selectionStart.current = pos;
      setSelectionRect(null);
    }
  };

  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "none") return;
    const pos = getPos(e);
    if (activeTool === "pen" && isDrawing.current && lastPos.current) {
      const ctx = annotationCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    } else if (activeTool === "select" && selectionStart.current) {
      const s = selectionStart.current;
      setSelectionRect({ x: Math.min(s.x, pos.x), y: Math.min(s.y, pos.y), w: Math.abs(pos.x - s.x), h: Math.abs(pos.y - s.y) });
    }
  };

  const onCanvasUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
    if (activeTool === "pen") {
      const ctx = annotationCanvasRef.current?.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
    }
  };

  const clearAnnotations = () => {
    const c = annotationCanvasRef.current;
    if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setSelectionRect(null);
  };

  const clearSelection = () => { setSelectionRect(null); selectionStart.current = null; };

  // Selection → send excerpt to notes
  const selectionToNote = () => {
    const ref = selectedDossier?.title ?? localDossierName ?? "الدوسية";
    const area = selectionRect
      ? ` (منطقة محددة من الصفحة)`
      : "";
    setNoteContent((c) => c + (c ? "\n\n" : "") + `📌 مقتطف من ${ref}${area}:\n`);
    clearSelection();
  };

  // ── Session handlers ──
  const setMode = (mode: string, minutes: number) => { setTimerMode(mode); setTimeRemaining(minutes * 60); setTotalTime(minutes * 60); };

  const handleStart = () => {
    setStartError(null);
    const subjectId = selectedSubject ?? subjectsData?.[0]?.id ?? 1;
    createSession.mutate(
      { data: { subjectId, type: timerMode, plannedMinutes: totalTime / 60 } },
      {
        onSuccess: (data) => { setSessionId(data.id); setSessionState("active"); refetchNotes(); },
        onError: () => setStartError("حدث خطأ أثناء بدء الجلسة، حاول مرة أخرى."),
      }
    );
  };

  const handlePause = () => { setSessionState("paused"); setPauseCount((p) => p + 1); if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "paused" } }); };
  const handleResume = () => setSessionState("active");
  const handleComplete = () => {
    setSessionState("summary");
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "completed", actualMinutes } });
  };
  const handleAbort = () => { setSessionState("setup"); if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "abandoned" } }); };

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    const subjectId = selectedSubject ?? subjectsData?.[0]?.id ?? 1;
    const title = noteTitle.trim() || `ملاحظة ${new Date().toLocaleDateString("ar")}`;
    if (editingNoteId) {
      updateNote.mutate({ id: editingNoteId, data: { title, content: noteContent } }, { onSuccess: () => { showSaved(); refetchNotes(); } });
    } else {
      createNote.mutate(
        { data: { title, content: noteContent, subjectId, dossierId: selectedDossierId ?? undefined, sessionId: sessionId ?? undefined } },
        { onSuccess: (note) => { setEditingNoteId(note.id); showSaved(); refetchNotes(); } }
      );
    }
  };

  const showSaved = () => { setNoteSaved(true); if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current); noteSaveTimer.current = setTimeout(() => setNoteSaved(false), 2000); };
  const loadNote = (note: { id: number; title: string; content: string }) => { setEditingNoteId(note.id); setNoteTitle(note.title); setNoteContent(note.content); };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localDossierUrl) URL.revokeObjectURL(localDossierUrl);
    setLocalDossierUrl(URL.createObjectURL(file));
    setLocalDossierName(file.name.replace(/\.pdf$/i, ""));
    setSelectedDossierId(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const progressPct = ((totalTime - timeRemaining) / totalTime) * 100;
  const R = 44; const C = 2 * Math.PI * R;

  const isPaused = sessionState === "paused";
  const selectedDossier = dossiersData?.items?.find((d) => d.id === selectedDossierId);
  const activeDossierUrl = localDossierUrl ?? selectedDossier?.fileUrl ?? null;
  const activeDossierName = localDossierName ?? selectedDossier?.title ?? null;

  // Theme
  const T = {
    border: isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
    subText: isPaused ? "#9ca3af" : "rgba(255,255,255,0.4)",
    text: isPaused ? "#374151" : "rgba(255,255,255,0.85)",
    textBright: isPaused ? "#111827" : "#ffffff",
    panelBg: isPaused ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
    inputBorder: isPaused ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
    inputBg: isPaused ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
    activeTabBg: isPaused ? "rgba(90,45,130,0.12)" : "rgba(90,45,130,0.4)",
    bg: isPaused ? "#fdf6ee" : "#1E0D33",
  };

  const toolBtn = (tool: ActiveTool, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => { setActiveTool(activeTool === tool ? "none" : tool); if (tool !== "pen") setIsEraser(false); }}
      title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
      style={{ background: activeTool === tool ? "#5A2D82" : T.inputBg, color: activeTool === tool ? "#fff" : T.text, border: `1px solid ${activeTool === tool ? "#5A2D82" : T.inputBorder}` }}
    >
      {icon}{label}
    </button>
  );

  // ══════════ SETUP ══════════
  if (sessionState === "setup") {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-[72px] p-4 flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1/2 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="w-full max-w-2xl">
            <Card className="border-white/60 shadow-2xl p-8 bg-white/80 backdrop-blur-xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4"><Focus className="w-8 h-8" /></div>
                <h1 className="text-3xl font-black mb-2">غرفة التركيز والدراسة</h1>
                <p className="text-muted-foreground">بيئة خالية من المشتتات لرفع إنتاجيتك لأقصى حد.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-3">اختر نظام المؤقت</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { mode: "pomodoro", min: 25, label: "بومودورو", sub: "تركيز عالي", color: "text-primary", border: "border-primary", bg: "bg-primary/5" },
                      { mode: "balanced", min: 45, label: "متوازن", sub: "حصة دراسية", color: "text-secondary", border: "border-secondary", bg: "bg-secondary/5" },
                      { mode: "deep_focus", min: 60, label: "عميق", sub: "لحل الامتحانات", color: "text-accent", border: "border-accent", bg: "bg-accent/5" },
                    ].map(({ mode, min, label, sub, color, border, bg }) => (
                      <button key={mode} onClick={() => setMode(mode, min)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${timerMode === mode ? `${border} ${bg} shadow-sm` : "border-black/5 hover:border-black/10 bg-white"}`}>
                        <div className={`text-2xl font-black ${color} mb-1`}>{min}</div>
                        <div className="text-sm font-bold">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold mb-3">الدوسية (اختياري)</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={selectedDossierId ?? ""}
                        onChange={(e) => { setSelectedDossierId(e.target.value ? Number(e.target.value) : null); setLocalDossierUrl(null); setLocalDossierName(null); }}
                        className="w-full px-4 py-2.5 rounded-lg border border-black/10 bg-white text-sm appearance-none focus:outline-none focus:border-primary/50" dir="rtl">
                        <option value="">{localDossierName ? `📄 ${localDossierName}` : "بدون دوسية محددة"}</option>
                        {dossiersData?.items?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors">
                      <Upload className="w-4 h-4" />استيراد
                    </button>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileImport} />
                  </div>
                  {localDossierName && <p className="text-xs text-primary mt-1.5">📄 {localDossierName} — سيُعرض في الجلسة</p>}
                </div>
                {startError && <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg py-2 px-4">{startError}</p>}
                <Button size="lg" className="w-full text-lg h-14 shadow-xl shadow-primary/20" onClick={handleStart} disabled={createSession.isPending}>
                  {createSession.isPending ? "جاري التحضير..." : "ابدأ الجلسة الآن"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // ══════════ SUMMARY ══════════
  if (sessionState === "summary") {
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-[72px] p-4 flex items-center justify-center">
          <Card className="w-full max-w-md p-8 border-white/60 shadow-2xl text-center">
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10" /></div>
            <h2 className="text-3xl font-black mb-2">أحسنت صنعاً!</h2>
            <p className="text-muted-foreground mb-8">لقد أكملت جلسة دراسية بنجاح.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-muted p-4 rounded-2xl"><div className="text-sm text-muted-foreground mb-1">وقت الدراسة</div><div className="text-2xl font-black text-primary">{actualMinutes} دقيقة</div></div>
              <div className="bg-muted p-4 rounded-2xl"><div className="text-sm text-muted-foreground mb-1">مرات التوقف</div><div className="text-2xl font-black text-secondary">{pauseCount}</div></div>
            </div>
            <div className="space-y-4 mb-8">
              <h4 className="font-bold">كيف تقيم مستوى تركيزك؟</h4>
              <div className="flex justify-center gap-2 text-primary">
                {["bad","ok","good","great"].map((level, i) => (
                  <button key={level} className="p-3 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold text-sm"
                    onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: level } })}>
                    {["ضعيف","متوسط","جيد","ممتاز"][i]}
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

  // ══════════ ACTIVE / PAUSED ══════════
  return (
    <>
      <Header />
      <div className="flex flex-col pt-[72px]" style={{ height: "100vh", background: T.bg }}>

        {/* ── TIMER STRIP ── */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${T.border}`, background: isPaused ? "rgba(251,146,60,0.06)" : "rgba(255,255,255,0.03)" }}>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPaused ? "bg-orange-200 text-orange-800" : "bg-white/10 text-white border border-white/20"}`}>
            {isPaused ? "الجلسة متوقفة مؤقتاً" : "جلسة تركيز نشطة"}
          </div>
          <div className="flex items-center gap-3">
            <svg width="52" height="52" className="-rotate-90">
              <circle cx="26" cy="26" r={R} stroke={isPaused ? "#fed7aa" : "rgba(255,255,255,0.12)"} strokeWidth="5" fill="none" />
              <motion.circle cx="26" cy="26" r={R} stroke={isPaused ? "#f97316" : "#5A2D82"} strokeWidth="5" fill="none"
                strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C - (progressPct / 100) * C }} transition={{ duration: 1, ease: "linear" }} />
            </svg>
            <span className="text-4xl font-black tabular-nums tracking-widest" style={{ color: isPaused ? "#7c2d12" : "#ffffff" }} dir="ltr">{formatTime(timeRemaining)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAbort} className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isPaused ? "border-orange-300 text-orange-700 hover:bg-orange-100" : "border-white/20 text-white/70 hover:bg-white/10"}`}><Square className="w-4 h-4 fill-current" /></button>
            {isPaused
              ? <button onClick={handleResume} className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg"><Play className="w-5 h-5 fill-current ml-0.5" /></button>
              : <button onClick={handlePause} className="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg"><Pause className="w-5 h-5 fill-current" /></button>}
            <button onClick={handleComplete} className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isPaused ? "border-orange-300 text-orange-700 hover:bg-orange-100" : "border-white/20 text-white/70 hover:bg-white/10"}`}><CheckCircle2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── SPLIT PANEL ── */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden" dir="rtl">

          {/* LEFT — Dossier + Annotation overlay */}
          <div className="flex flex-col overflow-hidden" style={{ width: `${leftWidth}%` }}>

            {/* Dossier header row */}
            <div className="flex items-center gap-2 px-3 py-2 shrink-0"
              style={{ borderBottom: `1px solid ${T.border}`, background: T.panelBg }}>
              <BookOpen className="w-4 h-4 shrink-0" style={{ color: T.subText }} />
              <div className="relative flex-1">
                <select value={selectedDossierId ?? ""}
                  onChange={(e) => { setSelectedDossierId(e.target.value ? Number(e.target.value) : null); setLocalDossierUrl(null); setLocalDossierName(null); }}
                  className="w-full text-sm font-medium pr-2 pl-5 py-1 rounded-lg border appearance-none focus:outline-none bg-transparent"
                  style={{ borderColor: T.inputBorder, color: T.text, background: T.inputBg }} dir="rtl">
                  <option value="">{localDossierName ? `📄 ${localDossierName}` : "— اختر دوسية —"}</option>
                  {dossiersData?.items?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
                <ChevronDown className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: T.subText }} />
              </div>
              <button onClick={() => fileInputRef.current?.click()} title="استيراد PDF"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors"
                style={{ border: `1px solid ${T.inputBorder}`, color: T.text, background: T.inputBg }}>
                <Upload className="w-3 h-3" />استيراد
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileImport} />
            </div>

            {/* Annotation toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 flex-wrap"
              style={{ borderBottom: `1px solid ${T.border}`, background: isPaused ? "rgba(0,0,0,0.015)" : "rgba(255,255,255,0.015)" }}>
              {/* Tool buttons */}
              {toolBtn("pen", <Pen className="w-3 h-3" />, "قلم")}
              {toolBtn("select", <MousePointer2 className="w-3 h-3" />, "تحديد")}

              {/* Pen options — only when pen active */}
              {activeTool === "pen" && (
                <>
                  <div className="w-px h-4" style={{ background: T.border }} />
                  {/* Colors */}
                  <div className="flex gap-1.5">
                    {["#f97316","#ef4444","#3b82f6","#22c55e","#a855f7","#ffffff","#000000"].map((c) => (
                      <button key={c} onClick={() => { setPenColor(c); setIsEraser(false); }}
                        className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                        style={{ background: c, borderColor: penColor === c && !isEraser ? (isPaused ? "#374151" : "#ffffff") : "transparent" }} />
                    ))}
                  </div>
                  <div className="w-px h-4" style={{ background: T.border }} />
                  {/* Size */}
                  <button onClick={() => setPenSize((p) => Math.max(1, p - 1))} className="w-5 h-5 flex items-center justify-center rounded" style={{ color: T.subText }}><Minus className="w-3 h-3" /></button>
                  <span className="text-xs w-4 text-center tabular-nums" style={{ color: T.text }}>{penSize}</span>
                  <button onClick={() => setPenSize((p) => Math.min(24, p + 1))} className="w-5 h-5 flex items-center justify-center rounded" style={{ color: T.subText }}><Plus className="w-3 h-3" /></button>
                  <div className="w-px h-4" style={{ background: T.border }} />
                  {/* Eraser */}
                  <button onClick={() => setIsEraser((e) => !e)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: isEraser ? T.activeTabBg : T.inputBg, color: isEraser ? T.textBright : T.subText, border: `1px solid ${T.inputBorder}` }}>
                    <Eraser className="w-3 h-3" />ممحاة
                  </button>
                </>
              )}

              {/* Selection action */}
              {activeTool === "select" && selectionRect && (
                <>
                  <div className="w-px h-4" style={{ background: T.border }} />
                  <button onClick={selectionToNote}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "#5A2D82", color: "#fff" }}>
                    <FileText className="w-3 h-3" />أضف للملاحظات
                  </button>
                  <button onClick={clearSelection} className="text-xs px-1.5 py-0.5 rounded-lg" style={{ color: T.subText, background: T.inputBg }}>إلغاء</button>
                </>
              )}

              {/* Clear all annotations */}
              {activeTool !== "none" && (
                <button onClick={clearAnnotations} className="mr-auto" title="مسح التعليقات" style={{ color: T.subText }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Tool off hint */}
              {activeTool !== "none" && (
                <span className="text-xs mr-1" style={{ color: T.subText }}>
                  {activeTool === "pen" ? "اضغط خارج القلم للتفاعل مع الـ PDF" : "اسحب لتحديد منطقة"}
                </span>
              )}
            </div>

            {/* Dossier content + annotation canvas overlay */}
            <div className="flex-1 relative overflow-hidden">
              {activeDossierUrl ? (
                <iframe src={activeDossierUrl} className="absolute inset-0 w-full h-full border-0" title={activeDossierName ?? "دوسية"} style={{ pointerEvents: activeTool !== "none" ? "none" : "auto" }} />
              ) : selectedDossier ? (
                <div className="absolute inset-0 overflow-auto p-6">
                  <h2 className="text-xl font-black mb-3" style={{ color: T.textBright }}>{selectedDossier.title}</h2>
                  {selectedDossier.description && <p className="text-sm leading-relaxed" style={{ color: T.text }}>{selectedDossier.description}</p>}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <BookOpen className="w-12 h-12 opacity-20" style={{ color: isPaused ? "#374151" : "#ffffff" }} />
                  <p className="text-sm" style={{ color: T.subText }}>اختر دوسية أو استورد ملف PDF</p>
                </div>
              )}

              {/* Annotation canvas overlay */}
              <canvas
                ref={annotationCanvasRef}
                width={1200} height={900}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  pointerEvents: activeTool !== "none" ? "all" : "none",
                  cursor: activeTool === "pen" ? (isEraser ? "cell" : "crosshair") : activeTool === "select" ? "crosshair" : "default",
                  touchAction: "none",
                }}
                onMouseDown={onCanvasDown}
                onMouseMove={onCanvasMove}
                onMouseUp={onCanvasUp}
                onMouseLeave={onCanvasUp}
              />

              {/* Selection rectangle visual */}
              {activeTool === "select" && selectionRect && (() => {
                const c = annotationCanvasRef.current;
                if (!c) return null;
                const r = c.getBoundingClientRect();
                const scaleX = r.width / c.width;
                const scaleY = r.height / c.height;
                return (
                  <div style={{
                    position: "absolute",
                    left: selectionRect.x * scaleX,
                    top: selectionRect.y * scaleY,
                    width: selectionRect.w * scaleX,
                    height: selectionRect.h * scaleY,
                    border: "2px dashed #5A2D82",
                    background: "rgba(90,45,130,0.12)",
                    pointerEvents: "none",
                  }} />
                );
              })()}
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div onMouseDown={handleDividerMouseDown}
            className="w-1 shrink-0 cursor-col-resize flex items-center justify-center group"
            style={{ background: T.border }}>
            <div className="w-3 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: isPaused ? "rgba(90,45,130,0.25)" : "rgba(90,45,130,0.5)" }} />
          </div>

          {/* RIGHT — Notes (text only) */}
          <div className="flex flex-col overflow-hidden flex-1" style={{ background: T.panelBg }}>

            {/* Notes header */}
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0"
              style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" style={{ color: T.subText }} />
                <span className="text-xs font-bold" style={{ color: T.text }}>دفتر الملاحظات</span>
                {(selectedDossier || localDossierName) && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full truncate max-w-[90px]"
                    style={{ background: isPaused ? "#f3f4f6" : "rgba(255,255,255,0.1)", color: isPaused ? "#6b7280" : "rgba(255,255,255,0.4)" }}>
                    {localDossierName ?? selectedDossier?.title}
                  </span>
                )}
              </div>
              {editingNoteId && (
                <button onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }}
                  className="text-xs px-2 py-0.5 rounded-lg" style={{ color: T.subText, background: T.inputBg }}>
                  + جديد
                </button>
              )}
            </div>

            {/* Saved notes */}
            {notesData && notesData.length > 0 && (
              <div className="shrink-0 overflow-y-auto" style={{ maxHeight: "130px", borderBottom: `1px solid ${T.border}` }}>
                {notesData.map((note) => (
                  <button key={note.id} onClick={() => loadNote(note)}
                    className="w-full text-right px-3 py-2 flex items-start gap-2 transition-colors"
                    style={{ background: editingNoteId === note.id ? T.activeTabBg : "transparent", borderBottom: `1px solid ${T.border}` }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: isPaused ? "#5A2D82" : "rgba(90,45,130,0.8)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{note.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: T.subText }}>{note.content.slice(0, 55)}…</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Note editor */}
            <div className="flex flex-col flex-1 px-3 pt-3 pb-3 gap-2 overflow-hidden">
              <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="عنوان الملاحظة..."
                className="w-full text-sm font-semibold px-3 py-1.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ borderColor: T.inputBorder, color: T.textBright }} dir="rtl" />
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب ملاحظتك هنا… أو حدّد منطقة في الدوسية وأضفها مباشرةً."
                className="flex-1 w-full text-sm px-3 py-2 rounded-lg border bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed"
                style={{ borderColor: T.inputBorder, color: isPaused ? "#111827" : "rgba(255,255,255,0.9)", minHeight: 0 }}
                dir="rtl" />
              <button onClick={handleSaveNote} disabled={!noteContent.trim() || createNote.isPending || updateNote.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: noteSaved ? "#2FA84F" : "#5A2D82", color: "#ffffff" }}>
                {noteSaved ? <><CheckCircle2 className="w-4 h-4" />تم الحفظ</> : <><Save className="w-4 h-4" />{editingNoteId ? "تحديث" : "حفظ"}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
