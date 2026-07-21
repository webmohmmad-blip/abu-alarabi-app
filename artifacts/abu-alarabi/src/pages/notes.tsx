import { useState, useRef, useEffect, useCallback } from "react";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, useListSubjects } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, StickyNote, Trash2, Pin, PinOff,
  Pen, Eraser, Highlighter, Undo2, Redo2, Download,
  BookOpen, FileText, Play, Pause, RotateCcw,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, X, Move, Palette,
  AlignLeft, BookMarked, Layers,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stroke {
  id: string;
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  points: { x: number; y: number; pressure: number }[];
  lineWidth: number;
}

type PanelMode = "pdf+notes" | "pdf+draw" | "notes" | "draw";

// ─── Dossier fetch ────────────────────────────────────────────────────────────

function useDossiers() {
  return useQuery({
    queryKey: ["/api/dossiers", "all"],
    queryFn: () => customFetch<{ items: any[]; total: number }>("/api/dossiers?limit=100", { method: "GET" }),
  });
}

// ─── Floating Timer Widget ────────────────────────────────────────────────────

const TIMER_MODES = [
  { key: "pomodoro", label: "بومودورو", minutes: 25 },
  { key: "long", label: "طويل", minutes: 45 },
  { key: "break", label: "استراحة", minutes: 5 },
];

function FloatingTimer() {
  const [mode, setMode] = useState(0);
  const [total, setTotal] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Initialise position
  useEffect(() => {
    setPos({ x: window.innerWidth - 260, y: 80 });
  }, []);

  // Timer tick
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(p => {
          if (p <= 1) { setRunning(false); return 0; }
          return p - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = () => { setRunning(false); setRemaining(total); };

  const switchMode = (i: number) => {
    const m = TIMER_MODES[i];
    setMode(i);
    setTotal(m.minutes * 60);
    setRemaining(m.minutes * 60);
    setRunning(false);
  };

  // Drag
  const onDragStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.initX + dx, y: dragRef.current.initY + dy });
  };
  const onDragEnd = () => { dragRef.current = null; };

  const pct = total > 0 ? (remaining / total) : 0;
  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const r = 28;
  const circ = 2 * Math.PI * r;

  const sizeClass = size === "sm" ? "w-16 h-16" : size === "lg" ? "w-72" : "w-52";

  return (
    <div
      ref={widgetRef}
      style={{ left: pos.x, top: pos.y, position: "fixed", zIndex: 100 }}
      className="select-none"
    >
      {/* Collapsed: just circle */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center text-white text-xs font-black cursor-pointer hover:scale-105 transition-transform"
          onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}
        >
          {mins}:{secs}
        </button>
      ) : (
        <div className={`bg-foreground/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden ${size === "lg" ? "w-72" : "w-52"}`}>
          {/* Drag handle */}
          <div
            className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing bg-white/5"
            onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}
          >
            <Move className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">المؤقت</span>
            <div className="flex gap-1">
              {(["sm", "md", "lg"] as const).map(s => (
                <button key={s} onClick={() => setSize(s)}
                  className={`w-4 h-4 rounded-sm text-[8px] font-black transition-colors ${size === s ? "bg-primary text-white" : "text-white/30 hover:text-white"}`}>
                  {s === "sm" ? "S" : s === "md" ? "M" : "L"}
                </button>
              ))}
              <button onClick={() => setExpanded(false)} className="text-white/30 hover:text-white transition-colors ml-1">
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-white/10">
            {TIMER_MODES.map((m, i) => (
              <button key={m.key} onClick={() => switchMode(i)}
                className={`flex-1 py-1.5 text-[10px] font-bold transition-colors ${mode === i ? "text-white bg-primary/20" : "text-white/30 hover:text-white/60"}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Circle timer */}
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="relative">
              <svg width="72" height="72" className="-rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="36" cy="36" r={r} fill="none" stroke="#5A2D82" strokeWidth="4"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-black text-base tabular-nums">{mins}:{secs}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setRunning(r => !r)}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/80 transition-colors shadow-sm">
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-[-1px]" />}
              </button>
              <button onClick={reset}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drawing Canvas ───────────────────────────────────────────────────────────

interface DrawCanvasProps {
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  lineWidth: number;
}

function DrawCanvas({ tool, color, lineWidth }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Resize canvas to fill parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const saved = ctxRef.current?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctxRef.current = ctx;
      if (saved) ctx.putImageData(saved, 0, 0);
      setupCtx(ctx);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();
    return () => ro.disconnect();
  }, []);

  const setupCtx = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 50) history.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || history.current.length === 0) return;
    redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const prev = history.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    setCanUndo(history.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || redoStack.current.length === 0) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const next = redoStack.current.pop()!;
    ctx.putImageData(next, 0, 0);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "دفتر-دراستي.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    saveState();

    const { x, y } = getPos(e, canvas);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const w = tool === "eraser" ? lineWidth * 4 : lineWidth * (0.5 + pressure * 1.5);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = hexToRgba(color, 0.3);
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = w;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const { x, y } = getPos(e, canvas);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const w = tool === "eraser" ? lineWidth * 4 : lineWidth * (0.5 + pressure * 1.5);
    ctx.lineWidth = w;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerUp = () => {
    isDrawing.current = false;
    const ctx = ctxRef.current;
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-black/10 rounded-xl px-3 py-1.5 shadow-lg">
        <button onClick={undo} disabled={!canUndo}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors" title="تراجع">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={!canRedo}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors" title="إعادة">
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-black/10" />
        <button onClick={clearCanvas}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors" title="مسح الكل">
          <X className="w-4 h-4" />
        </button>
        <button onClick={downloadCanvas}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="تنزيل">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{
          cursor: tool === "eraser" ? "cell" : "crosshair",
          background: "white",
          backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
}

function getPos(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── PDF Panel ────────────────────────────────────────────────────────────────

function PdfPanel({ fileUrl, onClose }: { fileUrl: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-2xl overflow-hidden border border-black/10">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-black/10 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">عارض الدوسية</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="تصغير">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-muted-foreground w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="تكبير">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="إغلاق">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF embed */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <div style={{ width: `${zoom}%`, minWidth: "300px" }}>
          <iframe
            src={`${fileUrl}#toolbar=0&navpanes=0`}
            title="عارض PDF"
            className="w-full rounded-lg shadow-md border border-black/10"
            style={{ height: "75vh" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Notes Editor ─────────────────────────────────────────────────────────────

function NotesEditor({
  notes, activeId, editTitle, editContent, editSubjectId,
  subjects, onTitleChange, onContentChange, onSubjectChange,
  onDelete, isSaving, onBack,
}: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [activeId]);

  if (!activeId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
        <StickyNote className="w-16 h-16 opacity-20" />
        <p className="font-medium text-lg text-center">اختر ملاحظة أو أنشئ واحدة جديدة</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
      {/* Note toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 rounded text-muted-foreground hover:text-foreground md:hidden">
            <ChevronRight className="w-4 h-4" />
          </button>
          <select
            value={editSubjectId}
            onChange={e => onSubjectChange(parseInt(e.target.value))}
            className="bg-transparent font-bold text-sm text-primary focus:outline-none cursor-pointer"
          >
            {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isSaving ? "جاري الحفظ..." : "✓ محفوظ"}
          </span>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden" style={{
        backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)",
        backgroundPositionY: "48px",
        lineHeight: "32px",
      }}>
        <input
          type="text"
          placeholder="عنوان الملاحظة..."
          className="text-2xl font-black mb-4 bg-transparent border-none focus:outline-none w-full text-foreground placeholder:text-muted-foreground/40"
          value={editTitle}
          onChange={e => onTitleChange(e.target.value)}
          style={{ lineHeight: "1.3" }}
        />
        <textarea
          ref={textareaRef}
          placeholder="اكتب ملاحظاتك هنا... (يتم الحفظ تلقائياً)"
          className="flex-1 resize-none bg-transparent border-none focus:outline-none text-base text-gray-700 placeholder:text-muted-foreground/30 leading-8 scrollbar-hide"
          value={editContent}
          onChange={e => onContentChange(e.target.value)}
          style={{ lineHeight: "32px" }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PEN_COLORS = [
  "#1a1a2e", "#5A2D82", "#0D9BB5", "#E05252", "#2FA84F",
  "#C79A2D", "#6366F1", "#F59E0B", "#10B981", "#EC4899",
];

export default function StudyNotebook() {
  // Notes state
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<number | undefined>();
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubjectId, setEditSubjectId] = useState<number>(1);
  const [showNotesList, setShowNotesList] = useState(true);

  // Layout mode
  const [mode, setMode] = useState<PanelMode>("notes");

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Drawing tools
  const [drawTool, setDrawTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [penColor, setPenColor] = useState("#1a1a2e");
  const [lineWidth, setLineWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Data
  const { data: notesList, isLoading } = useListNotes({ subjectId: subjectFilter });
  const { data: subjects } = useListSubjects();
  const { data: dossierData } = useDossiers();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-save
  useEffect(() => {
    if (!activeNoteId) return;
    clearTimeout(autoSaveTimeout.current);
    autoSaveTimeout.current = setTimeout(() => {
      updateNote.mutate({ id: activeNoteId, data: { title: editTitle, content: editContent } });
    }, 1000);
    return () => clearTimeout(autoSaveTimeout.current);
  }, [editTitle, editContent, activeNoteId]);

  const handleCreateNew = () => {
    const subjectIdToUse = subjectFilter || subjects?.[0]?.id || 1;
    createNote.mutate(
      { data: { title: "ملاحظة جديدة", content: "", subjectId: subjectIdToUse } },
      {
        onSuccess: (newNote: any) => {
          setActiveNoteId(newNote.id);
          setEditTitle(newNote.title);
          setEditContent(newNote.content ?? "");
          setEditSubjectId(newNote.subjectId);
        },
      }
    );
  };

  const handleSelectNote = (note: any) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content ?? "");
    setEditSubjectId(note.subjectId);
  };

  const handleDelete = () => {
    if (!activeNoteId || !confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;
    deleteNote.mutate({ id: activeNoteId }, {
      onSuccess: () => { setActiveNoteId(null); }
    });
  };

  const handleSubjectChange = (id: number) => {
    setEditSubjectId(id);
    if (activeNoteId) updateNote.mutate({ id: activeNoteId, data: { subjectId: id } as any });
  };

  const filteredNotes = (Array.isArray(notesList) ? notesList : []).filter(n =>
    n.title.includes(search) || (n.content ?? "").includes(search)
  );

  // Mode helpers
  const showPdf = mode === "pdf+notes" || mode === "pdf+draw";
  const showDraw = mode === "pdf+draw" || mode === "draw";
  const showNotes = mode === "pdf+notes" || mode === "notes";

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)] flex flex-col gap-3" dir="rtl">

        {/* ── Top toolbar ── */}
        <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {[
              { m: "notes" as PanelMode, label: "ملاحظات", icon: StickyNote },
              { m: "draw" as PanelMode, label: "رسم", icon: Pen },
              { m: "pdf+notes" as PanelMode, label: "PDF + ملاحظات", icon: BookMarked },
              { m: "pdf+draw" as PanelMode, label: "PDF + رسم", icon: Layers },
            ].map(({ m, label, icon: Icon }) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === m ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Import PDF button */}
            {showPdf && (
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                {pdfUrl ? "تغيير الدوسية" : "استورد دوسية"}
              </Button>
            )}

            {/* Drawing tools (when draw mode) */}
            {showDraw && (
              <div className="flex items-center gap-1 bg-white border border-black/10 rounded-xl px-2 py-1">
                {[
                  { t: "pen" as const, icon: Pen, title: "قلم" },
                  { t: "highlighter" as const, icon: Highlighter, title: "تظليل" },
                  { t: "eraser" as const, icon: Eraser, title: "ممحاة" },
                ].map(({ t, icon: Icon, title }) => (
                  <button key={t} onClick={() => setDrawTool(t)} title={title}
                    className={`p-1.5 rounded-lg transition-colors ${drawTool === t ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
                <div className="w-px h-5 bg-black/10 mx-1" />
                {/* Color */}
                <div className="relative">
                  <button onClick={() => setShowColorPicker(p => !p)}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: penColor }} />
                  {showColorPicker && (
                    <div className="absolute top-8 right-0 z-50 bg-white border border-black/10 rounded-xl p-2 shadow-xl flex flex-wrap gap-1.5 w-36">
                      {PEN_COLORS.map(c => (
                        <button key={c} onClick={() => { setPenColor(c); setShowColorPicker(false); }}
                          className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${penColor === c ? "border-primary" : "border-white"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}
                </div>
                {/* Line width */}
                <input type="range" min="1" max="12" value={lineWidth}
                  onChange={e => setLineWidth(parseInt(e.target.value))}
                  className="w-16 accent-primary cursor-pointer" />
              </div>
            )}
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

          {/* Notes list sidebar */}
          {(mode === "notes" || mode === "pdf+notes") && (
            <div className={`flex flex-col ${showPdf ? "w-60 shrink-0" : "w-72 shrink-0"} h-full`}>
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="بحث..." className="pr-8 bg-white text-sm h-9"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button onClick={handleCreateNew} size="icon" className="h-9 w-9 shrink-0" disabled={createNote.isPending}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Subject filter pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                <button onClick={() => setSubjectFilter(undefined)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors ${!subjectFilter ? "bg-primary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}>
                  الكل
                </button>
                {subjects?.map((s: any) => (
                  <button key={s.id} onClick={() => setSubjectFilter(s.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors ${subjectFilter === s.id ? "bg-primary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}>
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground opacity-50">
                    <StickyNote className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">لا توجد ملاحظات</p>
                  </div>
                ) : filteredNotes.map(note => (
                  <div key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${activeNoteId === note.id ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-white border-black/8 hover:border-primary/20 hover:shadow-sm"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-xs truncate">{note.title || "بدون عنوان"}</h3>
                      <button onClick={e => { e.stopPropagation(); updateNote.mutate({ id: note.id, data: { isPinned: !note.isPinned } }); }}
                        className="text-muted-foreground hover:text-primary shrink-0">
                        {note.isPinned ? <Pin className="w-3 h-3 fill-primary text-primary" /> : <PinOff className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{note.content || "..."}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-muted rounded text-muted-foreground">{note.subjectName}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(note.createdAt).toLocaleDateString("ar-JO")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PDF viewer */}
          {showPdf && (
            <div className="flex-1 min-w-0 h-full">
              {pdfUrl ? (
                <PdfPanel fileUrl={pdfUrl} onClose={() => setPdfUrl(null)} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4 bg-muted/40 rounded-2xl border-2 border-dashed border-muted text-muted-foreground">
                  <BookOpen className="w-14 h-14 opacity-20" />
                  <p className="font-medium">استورد دوسية لتبدأ الدراسة</p>
                  <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
                    <BookOpen className="w-4 h-4" /> اختر دوسية
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Drawing canvas */}
          {showDraw && (
            <div className="flex-1 min-w-0 h-full rounded-2xl overflow-hidden shadow-sm border border-black/10">
              <DrawCanvas tool={drawTool} color={penColor} lineWidth={lineWidth} />
            </div>
          )}

          {/* Text notes editor */}
          {showNotes && (
            <div className={`flex flex-col h-full ${showPdf ? "w-72 shrink-0" : "flex-1"}`}>
              <NotesEditor
                activeId={activeNoteId}
                editTitle={editTitle}
                editContent={editContent}
                editSubjectId={editSubjectId}
                subjects={subjects}
                onTitleChange={setEditTitle}
                onContentChange={setEditContent}
                onSubjectChange={handleSubjectChange}
                onDelete={handleDelete}
                isSaving={updateNote.isPending}
                onBack={() => setActiveNoteId(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating timer */}
      <FloatingTimer />

      {/* Import dossier modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-foreground">استيراد دوسية</h2>
                <button onClick={() => setShowImportModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* From dossiers list */}
              {dossierData?.items && dossierData.items.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-muted-foreground mb-2">اختر من دوسياتك</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dossierData.items
                      .filter((d: any) => d.fileUrl)
                      .map((d: any) => (
                        <button key={d.id}
                          onClick={() => { setPdfUrl(d.fileUrl); setShowImportModal(false); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-black/8 hover:border-primary/30 hover:bg-primary/5 transition-all text-right">
                          <BookOpen className="w-5 h-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{d.title}</p>
                            <p className="text-xs text-muted-foreground">{d.pageCount} صفحة</p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="border-t border-black/8 pt-4">
                <p className="text-sm font-bold text-muted-foreground mb-2">أو أدخل رابط PDF مباشر</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    dir="ltr"
                    id="manual-pdf-url"
                    className="flex-1 text-sm"
                  />
                  <Button onClick={() => {
                    const url = (document.getElementById("manual-pdf-url") as HTMLInputElement)?.value;
                    if (url) { setPdfUrl(url); setShowImportModal(false); }
                  }} size="sm" className="shrink-0">فتح</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
