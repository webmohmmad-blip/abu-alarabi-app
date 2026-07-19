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
  ChevronDown,
  Upload,
  Pen,
  Type,
  Trash2,
  Minus,
  Plus,
} from "lucide-react";

type SessionState = "setup" | "active" | "paused" | "summary";
type NoteTab = "text" | "draw";

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
  const [noteTab, setNoteTab] = useState<NoteTab>("text");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState("#ffffff");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // Resizable panels
  const [leftWidth, setLeftWidth] = useState(55); // percentage
  const isDraggingDivider = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(55);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local dossier import
  const [localDossierUrl, setLocalDossierUrl] = useState<string | null>(null);
  const [localDossierName, setLocalDossierName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: tasksData } = useListStudyTasks({ status: "pending" });
  const { data: subjectsData } = useListSubjects();
  const { data: dossiersData } = useListDossiers({ limit: "50" });
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

  // ── Timer ──
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionState === "active" && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) { handleComplete(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionState, timeRemaining]);

  // ── Canvas: init background when tab switches or paused state changes ──
  useEffect(() => {
    if (noteTab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Only init if blank
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = data.data.every((v, i) => i % 4 === 3 ? v === 0 : true);
    if (isEmpty) {
      ctx.fillStyle = isPausedVal ? "#fff8f0" : "#160c28";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [noteTab]);

  // ── Resizable divider ──
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingDivider.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingDivider.current || !containerRef.current) return;
      const containerW = containerRef.current.offsetWidth;
      const delta = dragStartX.current - e.clientX; // RTL: right panel grows when dragging right
      const newW = Math.max(25, Math.min(75, dragStartWidth.current + (delta / containerW) * 100));
      setLeftWidth(newW);
    };
    const onMouseUp = () => {
      isDraggingDivider.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Canvas drawing ──
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const beginStroke = (pos: { x: number; y: number }) => {
    isDrawing.current = true;
    lastPos.current = pos;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = isEraser ? (isPausedVal ? "#fff8f0" : "#160c28") : penColor;
    ctx.lineWidth = isEraser ? penSize * 4 : penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (isEraser ? penSize * 4 : penSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? (isPausedVal ? "#fff8f0" : "#160c28") : penColor;
    ctx.fill();
  };
  const continueStroke = (pos: { x: number; y: number }) => {
    if (!isDrawing.current || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };
  const endStroke = () => { isDrawing.current = false; lastPos.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = isPausedVal ? "#fff8f0" : "#160c28";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasDataUrl = () => canvasRef.current?.toDataURL("image/png") ?? "";

  // ── Session handlers ──
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
      { data: { subjectId, type: timerMode, plannedMinutes: totalTime / 60, taskId: selectedTask || undefined } },
      {
        onSuccess: (data) => { setSessionId(data.id); setSessionState("active"); refetchNotes(); },
        onError: () => setStartError("حدث خطأ أثناء بدء الجلسة، حاول مرة أخرى."),
      }
    );
  };

  const handlePause = () => {
    setSessionState("paused");
    setPauseCount((p) => p + 1);
    if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "paused" } });
  };
  const handleResume = () => setSessionState("active");
  const handleComplete = () => {
    setSessionState("summary");
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "completed", actualMinutes } });
  };
  const handleAbort = () => {
    setSessionState("setup");
    if (sessionId) updateSession.mutate({ id: sessionId, data: { status: "abandoned" } });
  };

  // ── Notes ──
  const handleSaveNote = () => {
    const subjectId = selectedSubject ?? subjectsData?.[0]?.id ?? 1;
    const title = noteTitle.trim() || `ملاحظة ${new Date().toLocaleDateString("ar")}`;
    const content = noteTab === "draw" ? getCanvasDataUrl() : noteContent;
    if (!content) return;
    if (editingNoteId) {
      updateNote.mutate({ id: editingNoteId, data: { title, content } }, { onSuccess: () => { showSaved(); refetchNotes(); } });
    } else {
      createNote.mutate(
        { data: { title, content, subjectId, dossierId: selectedDossierId ?? undefined, sessionId: sessionId ?? undefined } },
        { onSuccess: (note) => { setEditingNoteId(note.id); showSaved(); refetchNotes(); } }
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
    if (note.content.startsWith("data:image")) {
      setNoteTab("draw");
      setNoteContent("");
      // Load image into canvas after tab switch renders canvas
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = note.content;
      }, 50);
    } else {
      setNoteTab("text");
      setNoteContent(note.content);
    }
  };

  // ── Dossier import ──
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localDossierUrl) URL.revokeObjectURL(localDossierUrl);
    setLocalDossierUrl(URL.createObjectURL(file));
    setLocalDossierName(file.name.replace(/\.pdf$/i, ""));
    setSelectedDossierId(null);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const progressPercentage = ((totalTime - timeRemaining) / totalTime) * 100;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // NOTE: isPausedVal used in effects above, must be consistent
  const isPausedVal = sessionState === "paused";
  const isPaused = isPausedVal;
  const selectedDossier = dossiersData?.items?.find((d) => d.id === selectedDossierId);
  const activeDossierUrl = localDossierUrl ?? selectedDossier?.fileUrl ?? null;
  const activeDossierName = localDossierName ?? selectedDossier?.title ?? null;

  // Theme tokens
  const T = {
    border: isPaused ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
    subText: isPaused ? "#9ca3af" : "rgba(255,255,255,0.4)",
    text: isPaused ? "#374151" : "rgba(255,255,255,0.85)",
    textBright: isPaused ? "#111827" : "#ffffff",
    panelBg: isPaused ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
    inputBorder: isPaused ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
    inputBg: isPaused ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
    chipBg: isPaused ? "#f3f4f6" : "rgba(255,255,255,0.1)",
    chipText: isPaused ? "#6b7280" : "rgba(255,255,255,0.5)",
    bg: isPaused ? "#fdf6ee" : "#1E0D33",
    canvasBg: isPaused ? "#fff8f0" : "#160c28",
    activeTabBg: isPaused ? "rgba(90,45,130,0.1)" : "rgba(90,45,130,0.35)",
  };

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
                      <button key={mode} onClick={() => setMode(mode, min)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${timerMode === mode ? `${border} ${bg} shadow-sm` : "border-black/5 hover:border-black/10 bg-white"}`}
                      >
                        <div className={`text-2xl font-black ${color} mb-1`}>{min}</div>
                        <div className="text-sm font-bold">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dossier */}
                <div>
                  <h3 className="font-bold mb-3">الدوسية (اختياري)</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedDossierId ?? ""}
                        onChange={(e) => { setSelectedDossierId(e.target.value ? Number(e.target.value) : null); setLocalDossierUrl(null); setLocalDossierName(null); }}
                        className="w-full px-4 py-2.5 rounded-lg border border-black/10 bg-white text-sm appearance-none focus:outline-none focus:border-primary/50"
                        dir="rtl"
                      >
                        <option value="">{localDossierName ? `📄 ${localDossierName}` : "بدون دوسية محددة"}</option>
                        {dossiersData?.items?.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      استيراد
                    </button>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileImport} />
                  </div>
                  {localDossierName && (
                    <p className="text-xs text-primary mt-1.5">📄 {localDossierName} — سيُعرض في الجلسة</p>
                  )}
                </div>

                {startError && (
                  <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg py-2 px-4">{startError}</p>
                )}
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
                  <button key={level} className="p-3 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold text-sm"
                    onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: level } })}>
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
  //  ACTIVE / PAUSED — split layout with resizable panels
  // ══════════════════════════════════════════════════
  return (
    <>
      <Header />
      <div className="flex flex-col pt-[72px]" style={{ height: "100vh", background: T.bg }}>

        {/* ── TOP TIMER STRIP ── */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${T.border}`, background: isPaused ? "rgba(251,146,60,0.06)" : "rgba(255,255,255,0.03)" }}>

          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPaused ? "bg-orange-200 text-orange-800" : "bg-white/10 text-white border border-white/20"}`}>
            {isPaused ? "الجلسة متوقفة مؤقتاً" : "جلسة تركيز نشطة"}
          </div>

          <div className="flex items-center gap-3">
            <svg width="52" height="52" className="-rotate-90">
              <circle cx="26" cy="26" r={radius} stroke={isPaused ? "#fed7aa" : "rgba(255,255,255,0.12)"} strokeWidth="5" fill="none" />
              <motion.circle cx="26" cy="26" r={radius} stroke={isPaused ? "#f97316" : "#5A2D82"} strokeWidth="5" fill="none"
                strokeLinecap="round" strokeDasharray={circumference}
                animate={{ strokeDashoffset }} transition={{ duration: 1, ease: "linear" }} />
            </svg>
            <span className="text-4xl font-black tabular-nums tracking-widest" style={{ color: isPaused ? "#7c2d12" : "#ffffff" }} dir="ltr">
              {formatTime(timeRemaining)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleAbort} title="إيقاف"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isPaused ? "border-orange-300 text-orange-700 hover:bg-orange-100" : "border-white/20 text-white/70 hover:bg-white/10"}`}>
              <Square className="w-4 h-4 fill-current" />
            </button>
            {isPaused ? (
              <button onClick={handleResume} className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            ) : (
              <button onClick={handlePause} className="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg">
                <Pause className="w-5 h-5 fill-current" />
              </button>
            )}
            <button onClick={handleComplete} title="إنهاء وتسجيل"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isPaused ? "border-orange-300 text-orange-700 hover:bg-orange-100" : "border-white/20 text-white/70 hover:bg-white/10"}`}>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── SPLIT PANEL ── */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden" dir="rtl">

          {/* LEFT — Dossier viewer */}
          <div className="flex flex-col overflow-hidden" style={{ width: `${leftWidth}%` }}>
            {/* Dossier header */}
            <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
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
              {/* Import button */}
              <button onClick={() => fileInputRef.current?.click()} title="استيراد PDF"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0"
                style={{ border: `1px solid ${T.inputBorder}`, color: T.text, background: T.inputBg }}>
                <Upload className="w-3 h-3" />
                استيراد
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileImport} />
            </div>

            {/* Dossier content */}
            <div className="flex-1 overflow-auto">
              {activeDossierUrl ? (
                <iframe src={activeDossierUrl} className="w-full h-full border-0" title={activeDossierName ?? "دوسية"} />
              ) : selectedDossier ? (
                <div className="p-6 space-y-4">
                  <h2 className="text-xl font-black" style={{ color: T.textBright }}>{selectedDossier.title}</h2>
                  {selectedDossier.description && (
                    <p className="leading-relaxed text-sm" style={{ color: isPaused ? "#6b7280" : "rgba(255,255,255,0.65)" }}>{selectedDossier.description}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <BookOpen className="w-12 h-12 opacity-20" style={{ color: isPaused ? "#374151" : "#ffffff" }} />
                  <p className="text-sm" style={{ color: T.subText }}>اختر دوسية أو استورد ملف PDF</p>
                </div>
              )}
            </div>
          </div>

          {/* ── DIVIDER (draggable) ── */}
          <div
            onMouseDown={handleDividerMouseDown}
            className="w-1 shrink-0 cursor-col-resize flex items-center justify-center group"
            style={{ background: T.border }}
          >
            <div className="w-4 h-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5"
              style={{ background: isPaused ? "rgba(90,45,130,0.2)" : "rgba(90,45,130,0.4)" }}>
              <div className="w-0.5 h-3 rounded-full" style={{ background: isPaused ? "#5A2D82" : "rgba(255,255,255,0.5)" }} />
            </div>
          </div>

          {/* RIGHT — Notes editor */}
          <div className="flex flex-col overflow-hidden flex-1" style={{ background: T.panelBg }}>

            {/* Notes header */}
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0"
              style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2">
                {/* Tab switcher */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.inputBorder}` }}>
                  <button onClick={() => setNoteTab("text")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                    style={{ background: noteTab === "text" ? T.activeTabBg : "transparent", color: noteTab === "text" ? T.textBright : T.subText }}>
                    <Type className="w-3 h-3" />
                    نص
                  </button>
                  <button onClick={() => setNoteTab("draw")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                    style={{ background: noteTab === "draw" ? T.activeTabBg : "transparent", color: noteTab === "draw" ? T.textBright : T.subText, borderRight: `1px solid ${T.inputBorder}` }}>
                    <Pen className="w-3 h-3" />
                    رسم
                  </button>
                </div>
                <FileText className="w-3.5 h-3.5" style={{ color: T.subText }} />
                <span className="text-xs font-bold" style={{ color: T.text }}>دفتر الملاحظات</span>
                {(selectedDossier || localDossierName) && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full truncate max-w-[100px]"
                    style={{ background: T.chipBg, color: T.chipText }}>
                    {localDossierName ?? selectedDossier?.title}
                  </span>
                )}
              </div>
              {editingNoteId && (
                <button onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); clearCanvas(); }}
                  className="text-xs px-2 py-0.5 rounded-lg"
                  style={{ color: T.subText, background: T.inputBg }}>
                  + جديد
                </button>
              )}
            </div>

            {/* Saved notes list */}
            {notesData && notesData.length > 0 && (
              <div className="shrink-0 overflow-y-auto" style={{ maxHeight: "140px", borderBottom: `1px solid ${T.border}` }}>
                {notesData.map((note) => (
                  <button key={note.id} onClick={() => loadNote(note)}
                    className="w-full text-right px-3 py-2 flex items-start gap-2 transition-colors"
                    style={{
                      background: editingNoteId === note.id ? T.activeTabBg : "transparent",
                      borderBottom: `1px solid ${T.border}`,
                    }}>
                    {note.content.startsWith("data:image") ? (
                      <Pen className="w-3 h-3 mt-0.5 shrink-0" style={{ color: isPaused ? "#5A2D82" : "rgba(90,45,130,0.8)" }} />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: isPaused ? "#5A2D82" : "rgba(90,45,130,0.8)" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{note.title}</p>
                      {!note.content.startsWith("data:image") && (
                        <p className="text-xs truncate mt-0.5" style={{ color: T.subText }}>{note.content.slice(0, 50)}…</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Note title */}
            <div className="px-3 pt-3">
              <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="عنوان الملاحظة..."
                className="w-full text-sm font-semibold px-3 py-1.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ borderColor: T.inputBorder, color: T.textBright }} dir="rtl" />
            </div>

            {/* TEXT mode */}
            {noteTab === "text" && (
              <div className="flex flex-col flex-1 px-3 pt-2 pb-3 gap-2 overflow-hidden">
                <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="اكتب ملاحظتك هنا… يمكنك نقل أي معلومة من الدوسية وتلخيصها."
                  className="flex-1 w-full text-sm px-3 py-2 rounded-lg border bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed"
                  style={{ borderColor: T.inputBorder, color: isPaused ? "#111827" : "rgba(255,255,255,0.9)", minHeight: 0 }}
                  dir="rtl" />
                <button onClick={handleSaveNote} disabled={!noteContent.trim() || createNote.isPending || updateNote.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: noteSaved ? "#2FA84F" : "#5A2D82", color: "#ffffff" }}>
                  {noteSaved ? <><CheckCircle2 className="w-4 h-4" />تم الحفظ</> : <><Save className="w-4 h-4" />{editingNoteId ? "تحديث" : "حفظ"}</>}
                </button>
              </div>
            )}

            {/* DRAW mode */}
            {noteTab === "draw" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Pen toolbar */}
                <div className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  {/* Color swatches */}
                  <div className="flex gap-1.5">
                    {(isPaused
                      ? ["#111827", "#5A2D82", "#0D9BB5", "#C79A2D", "#2FA84F", "#ef4444"]
                      : ["#ffffff", "#a78bfa", "#38bdf8", "#fbbf24", "#4ade80", "#f87171"]
                    ).map((c) => (
                      <button key={c} onClick={() => { setPenColor(c); setIsEraser(false); }}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: penColor === c && !isEraser ? T.textBright : "transparent" }} />
                    ))}
                  </div>
                  <div className="w-px h-4 mx-0.5" style={{ background: T.border }} />
                  {/* Pen size */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPenSize((p) => Math.max(1, p - 1))} className="w-5 h-5 flex items-center justify-center rounded" style={{ color: T.subText }}><Minus className="w-3 h-3" /></button>
                    <span className="text-xs w-4 text-center font-mono" style={{ color: T.text }}>{penSize}</span>
                    <button onClick={() => setPenSize((p) => Math.min(20, p + 1))} className="w-5 h-5 flex items-center justify-center rounded" style={{ color: T.subText }}><Plus className="w-3 h-3" /></button>
                  </div>
                  <div className="w-px h-4 mx-0.5" style={{ background: T.border }} />
                  {/* Eraser */}
                  <button onClick={() => setIsEraser((e) => !e)}
                    className="text-xs px-2 py-0.5 rounded-lg font-medium transition-colors"
                    style={{ background: isEraser ? T.activeTabBg : T.inputBg, color: isEraser ? T.textBright : T.subText }}>
                    ممحاة
                  </button>
                  {/* Clear */}
                  <button onClick={clearCanvas} className="mr-auto" title="مسح الكل" style={{ color: T.subText }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-hidden relative">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    style={{ width: "100%", height: "100%", display: "block", cursor: isEraser ? "cell" : "crosshair", background: T.canvasBg, touchAction: "none" }}
                    onMouseDown={(e) => beginStroke(getCanvasPos(e))}
                    onMouseMove={(e) => continueStroke(getCanvasPos(e))}
                    onMouseUp={endStroke}
                    onMouseLeave={endStroke}
                    onTouchStart={(e) => { e.preventDefault(); beginStroke(getTouchPos(e)); }}
                    onTouchMove={(e) => { e.preventDefault(); continueStroke(getTouchPos(e)); }}
                    onTouchEnd={endStroke}
                  />
                </div>

                {/* Save drawing */}
                <div className="px-3 py-2 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
                  <button onClick={handleSaveNote}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ background: noteSaved ? "#2FA84F" : "#5A2D82", color: "#ffffff" }}>
                    {noteSaved ? <><CheckCircle2 className="w-4 h-4" />تم الحفظ</> : <><Save className="w-4 h-4" />{editingNoteId ? "تحديث الرسم" : "حفظ الرسم"}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
