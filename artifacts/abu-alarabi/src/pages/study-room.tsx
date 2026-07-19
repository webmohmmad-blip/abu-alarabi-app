/**
 * Study Room 2.0 — Premium GoodNotes-inspired workspace
 * PDF reader + annotations + notes + bookmarks, all in one place
 */
import {
  useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent,
} from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as pdfjsLib from "pdfjs-dist";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Pencil, Highlighter, Eraser, Hand, Square, Circle as CircleIcon,
  Minus, Undo2, Redo2, Maximize2, Minimize2, BookmarkPlus, Bookmark,
  FileText, ListTodo, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Search, Save, Loader2, StickyNote, Trash2, Pin, Plus, X,
  ArrowLeft, FolderOpen, Clock, AlignLeft, Upload, Settings,
  Timer, Play, Pause, RotateCcw, Coffee,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// PDF.js worker
// ──────────────────────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type Tool = "hand" | "pen" | "highlighter" | "eraser" | "rect" | "circle" | "line" | "text";
type Tab  = "notes" | "bookmarks" | "timer";

interface Point { x: number; y: number; }
interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  text?: string;
  rect?: { x: number; y: number; w: number; h: number };
}
interface NoteItem { id: number; title: string; content: string; isPinned: boolean; createdAt: string; dossierId?: number; }
interface Bookmark { id: number; pageNumber: number; title: string; }
interface Task { id: number; title: string; status: string; type: string; scheduledAt: string; }

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const COLORS = ["#1a1a1a", "#5A2D82", "#0D9BB5", "#C79A2D", "#2FA84F", "#E53E3E", "#FFFFFF"];
const HIGHLIGHT_COLORS = ["#FFF176", "#A5D6A7", "#90CAF9", "#FFCC80", "#F48FB1"];
const WIDTHS = [2, 4, 6, 10, 16];
const SAVE_DEBOUNCE_MS = 1500;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }

function drawStrokesOnCanvas(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const stroke of strokes) {
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "rect" && stroke.rect) {
      const { x, y, w, h } = stroke.rect;
      ctx.strokeRect(x, y, w, h);
    } else if (stroke.tool === "circle" && stroke.rect) {
      const { x, y, w, h } = stroke.rect;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === "line" && stroke.points.length >= 2) {
      const [p0, pn] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pn.x, pn.y); ctx.stroke();
    } else if (stroke.tool === "text" && stroke.text && stroke.points.length > 0) {
      ctx.font = `${stroke.width * 4}px Cairo, sans-serif`;
      ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
    } else if (stroke.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export default function StudyRoom() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const initialDossierId = params.get("dossierId") ? parseInt(params.get("dossierId")!, 10) : null;
  const qc = useQueryClient();

  // ── Workspace state ─────────────────────────────────────────────────────────
  const [dossierId, setDossierId] = useState<number | null>(initialDossierId);
  const [dossierTitle, setDossierTitle] = useState("");
  const [dossierFileUrl, setDossierFileUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  // ── Annotation state ─────────────────────────────────────────────────────────
  const [tool, setTool] = useState<Tool>("hand");
  const [penColor, setPenColor] = useState(COLORS[0]);
  const [penWidth, setPenWidth] = useState(WIDTHS[1]);
  const [strokes, setStrokes] = useState<Map<number, Stroke[]>>(new Map());
  const [history, setHistory] = useState<Map<number, Stroke[][]>>(new Map());
  const [redoStack, setRedoStack] = useState<Map<number, Stroke[][]>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const pdfCanvasRef  = useRef<HTMLCanvasElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageInputRef   = useRef<HTMLInputElement>(null);
  const workspaceRef   = useRef<HTMLDivElement>(null);
  const saveTimerRef   = useRef<NodeJS.Timeout | null>(null);

  // ── Pomodoro timer state ──────────────────────────────────────────────────────
  const POMODORO_WORK    = 25 * 60;
  const POMODORO_BREAK   = 5  * 60;
  const POMODORO_LONG    = 15 * 60;
  const [timerMode, setTimerMode]     = useState<"work" | "break" | "long">("work");
  const [timerSeconds, setTimerSeconds] = useState(POMODORO_WORK);
  const [timerRunning, setTimerRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const timerTotalSeconds = timerMode === "work" ? POMODORO_WORK : timerMode === "break" ? POMODORO_BREAK : POMODORO_LONG;
  const timerProgress = ((timerTotalSeconds - timerSeconds) / timerTotalSeconds) * 100;
  const timerMins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const timerSecs = String(timerSeconds % 60).padStart(2, "0");

  const switchTimerMode = (mode: "work" | "break" | "long") => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    setTimerMode(mode);
    setTimerSeconds(mode === "work" ? POMODORO_WORK : mode === "break" ? POMODORO_BREAK : POMODORO_LONG);
  };

  const toggleTimer = () => {
    setTimerRunning((r) => {
      if (r) { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); return false; }
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            setTimerMode((m) => {
              if (m === "work") {
                setPomodoroCount((c) => {
                  const next = c + 1;
                  const nextMode = next % 4 === 0 ? "long" : "break";
                  setTimerSeconds(nextMode === "break" ? POMODORO_BREAK : POMODORO_LONG);
                  setTimerMode(nextMode);
                  return next;
                });
              } else {
                setTimerSeconds(POMODORO_WORK);
                setTimerMode("work");
              }
              return m;
            });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return true;
    });
  };

  const resetTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    setTimerSeconds(timerMode === "work" ? POMODORO_WORK : timerMode === "break" ? POMODORO_BREAK : POMODORO_LONG);
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); }, []);

  // ── Notes state ──────────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [editingNote, setEditingNote] = useState<number | null>(null);
  // Local-only bookmarks/notes for files opened directly from disk (no DB)
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[]>([]);
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);

  // -1 is the sentinel for a locally-opened PDF file (no database persistence)
  const isLocalFile = dossierId === -1;

  // ── API queries ───────────────────────────────────────────────────────────────
  const { data: dossiers } = useQuery<{ id: number; title: string; fileUrl?: string; subjectName?: string }[]>({
    queryKey: ["/api/dossiers"],
    queryFn: () => customFetch<{ items: { id: number; title: string; fileUrl?: string; subjectName?: string }[] }>("/api/dossiers").then((r) => r.items ?? []),
  });
  const { data: remoteNotes } = useQuery<NoteItem[]>({
    queryKey: ["/api/notes", dossierId],
    queryFn: () => customFetch(`/api/notes?dossierId=${dossierId}`),
    enabled: (dossierId ?? 0) > 0,
  });
  const notes = isLocalFile ? localNotes : remoteNotes;

  const { data: remoteBookmarks } = useQuery<Bookmark[]>({
    queryKey: ["/api/workspace/bookmarks", dossierId],
    queryFn: () => customFetch(`/api/workspace/bookmarks/${dossierId}`),
    enabled: (dossierId ?? 0) > 0,
  });
  const bookmarks = isLocalFile ? localBookmarks : remoteBookmarks;

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/studyplan/tasks"],
    queryFn: () => customFetch("/api/studyplan/tasks"),
  });

  // ── Open dossier ───────────────────────────────────────────────────────────────
  const openDossier = useCallback((d: { id: number; title: string; fileUrl?: string; subjectName?: string }) => {
    pushRecent({ id: d.id, title: d.title, subjectName: d.subjectName, fileUrl: d.fileUrl });
    setDossierId(d.id);
    setDossierTitle(d.title);
    setDossierFileUrl(d.fileUrl ?? null);
    setCurrentPage(1);
    setStrokes(new Map());
    setPdfDoc(null);
    setPdfError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open dossier from URL param
  useEffect(() => {
    if (initialDossierId && dossiers) {
      const d = dossiers.find((x) => x.id === initialDossierId);
      if (d) openDossier(d);
    }
  }, [initialDossierId, dossiers, openDossier]);

  // ── Load PDF ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dossierFileUrl) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(null);
    setPdfDoc(null);

    const loadingTask = pdfjsLib.getDocument({
      url: dossierFileUrl,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    loadingTask.promise.then((doc) => {
      if (cancelled) return;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setPdfLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      console.error("PDF load error", err);
      setPdfError("تعذّر تحميل الملف. تحقق من الرابط أو حاول مجدداً.");
      setPdfLoading(false);
    });
    return () => { cancelled = true; loadingTask.destroy(); };
  }, [dossierFileUrl]);

  // ── Load annotations from DB on page change ────────────────────────────────────
  useEffect(() => {
    // Skip for local files — annotations are stored in memory only
    if (!dossierId || !pdfDoc || isLocalFile) return;
    customFetch<{ strokes: Stroke[] }>(`/api/workspace/annotations/${dossierId}/${currentPage}`)
      .then(({ strokes: saved }) => {
        setStrokes((prev) => {
          const next = new Map(prev);
          if (!next.has(currentPage)) next.set(currentPage, saved);
          return next;
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId, currentPage, pdfDoc]);

  // ── Render PDF page ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    let cancelled = false;
    pdfDoc.getPage(currentPage).then((page) => {
      if (cancelled || !pdfCanvasRef.current) return;
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.render({ canvasContext: ctx as any, viewport } as any).promise.then(() => {
        if (!annotCanvasRef.current) return;
        annotCanvasRef.current.width = viewport.width;
        annotCanvasRef.current.height = viewport.height;
        const annotCtx = annotCanvasRef.current.getContext("2d")!;
        drawStrokesOnCanvas(annotCtx, strokes.get(currentPage) ?? []);
      });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale]);

  // ── Redraw annotation canvas when strokes change ──────────────────────────────
  useEffect(() => {
    if (!annotCanvasRef.current) return;
    const ctx = annotCanvasRef.current.getContext("2d")!;
    drawStrokesOnCanvas(ctx, strokes.get(currentPage) ?? []);
  }, [strokes, currentPage]);

  // ── Auto-save annotations ──────────────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (!dossierId || isLocalFile) { setSaveStatus("saved"); return; }
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!dossierId) return;
      setSaveStatus("saving");
      const pageStrokes = strokes.get(currentPage) ?? [];
      try {
        await customFetch(`/api/workspace/annotations/${dossierId}/${currentPage}`, {
          method: "PUT",
          body: JSON.stringify({ strokes: pageStrokes }),
          headers: { "Content-Type": "application/json" },
        });
        setSaveStatus("saved");
      } catch { setSaveStatus("unsaved"); }
    }, SAVE_DEBOUNCE_MS);
  }, [dossierId, strokes, currentPage]);

  // ── Save progress when page changes ───────────────────────────────────────────
  useEffect(() => {
    if (!dossierId || currentPage < 1 || isLocalFile) return;
    customFetch(`/api/workspace/progress/${dossierId}`, {
      method: "PUT", body: JSON.stringify({ lastPage: currentPage }),
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  }, [dossierId, currentPage]);

  // ── Canvas drawing helpers ─────────────────────────────────────────────────────
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = annotCanvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "hand") return;
    e.preventDefault();
    const pt = getCanvasPoint(e);
    const newStroke: Stroke = {
      id: uid(),
      tool,
      color: tool === "eraser" ? "#ffffff" : penColor,
      width: tool === "highlighter" ? penWidth * 5 : penWidth,
      opacity: tool === "highlighter" ? 0.3 : 1,
      points: [pt],
    };
    if (["rect", "circle", "line"].includes(tool)) setShapeStart(pt);
    setCurrentStroke(newStroke);
    setIsDrawing(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke || !annotCanvasRef.current) return;
    const pt = getCanvasPoint(e);
    const ctx = annotCanvasRef.current.getContext("2d")!;

    if (["rect", "circle", "line"].includes(tool) && shapeStart) {
      // Preview shape
      drawStrokesOnCanvas(ctx, strokes.get(currentPage) ?? []);
      const previewStroke: Stroke = {
        ...currentStroke,
        rect: { x: shapeStart.x, y: shapeStart.y, w: pt.x - shapeStart.x, h: pt.y - shapeStart.y },
        points: [shapeStart, pt],
      };
      drawStrokesOnCanvas(ctx, [...(strokes.get(currentPage) ?? []), previewStroke]);
      setCurrentStroke((prev) => prev ? { ...prev, points: [shapeStart, pt], rect: { x: shapeStart.x, y: shapeStart.y, w: pt.x - shapeStart.x, h: pt.y - shapeStart.y } } : prev);
    } else {
      // Freehand: draw incrementally
      const pts = [...currentStroke.points, pt];
      ctx.globalAlpha = currentStroke.opacity;
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      const last = currentStroke.points[currentStroke.points.length - 1];
      ctx.moveTo(last.x, last.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      ctx.globalAlpha = 1;
      setCurrentStroke((prev) => prev ? { ...prev, points: pts } : prev);
    }
  };

  const onPointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    // Commit stroke
    const finishedStroke = currentStroke;
    setStrokes((prev) => {
      const next = new Map(prev);
      const page = next.get(currentPage) ?? [];
      next.set(currentPage, [...page, finishedStroke]);
      return next;
    });
    setHistory((prev) => {
      const next = new Map(prev);
      const pageHist = next.get(currentPage) ?? [];
      next.set(currentPage, [...pageHist, strokes.get(currentPage) ?? []]);
      return next;
    });
    setRedoStack((prev) => { const n = new Map(prev); n.delete(currentPage); return n; });
    setCurrentStroke(null);
    setShapeStart(null);
    scheduleSave();
  };

  // ── Undo / Redo ────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setHistory((prevH) => {
      const pageHist = prevH.get(currentPage) ?? [];
      if (!pageHist.length) return prevH;
      const prev = pageHist[pageHist.length - 1];
      setRedoStack((r) => { const n = new Map(r); n.set(currentPage, [...(r.get(currentPage) ?? []), strokes.get(currentPage) ?? []]); return n; });
      setStrokes((s) => { const n = new Map(s); n.set(currentPage, prev); return n; });
      const nextH = new Map(prevH);
      nextH.set(currentPage, pageHist.slice(0, -1));
      return nextH;
    });
    scheduleSave();
  }, [currentPage, strokes, scheduleSave]);

  const redo = useCallback(() => {
    setRedoStack((prevR) => {
      const stack = prevR.get(currentPage) ?? [];
      if (!stack.length) return prevR;
      const next = stack[stack.length - 1];
      setHistory((h) => { const n = new Map(h); n.set(currentPage, [...(h.get(currentPage) ?? []), strokes.get(currentPage) ?? []]); return n; });
      setStrokes((s) => { const n = new Map(s); n.set(currentPage, next); return n; });
      const nextR = new Map(prevR);
      nextR.set(currentPage, stack.slice(0, -1));
      return nextR;
    });
    scheduleSave();
  }, [currentPage, strokes, scheduleSave]);

  // ── Bookmark current page ──────────────────────────────────────────────────────
  const addBookmark = async () => {
    if (!dossierId) return;
    if (isLocalFile) {
      // Local-only: store in component state
      const already = localBookmarks.some((b) => b.pageNumber === currentPage);
      if (!already) {
        setLocalBookmarks((prev) => [
          ...prev,
          { id: Date.now(), pageNumber: currentPage, title: `صفحة ${currentPage}` },
        ]);
      }
      return;
    }
    await customFetch(`/api/workspace/bookmarks/${dossierId}`, {
      method: "POST",
      body: JSON.stringify({ pageNumber: currentPage, title: `صفحة ${currentPage}` }),
      headers: { "Content-Type": "application/json" },
    });
    qc.invalidateQueries({ queryKey: ["/api/workspace/bookmarks", dossierId] });
  };

  const deleteBookmark = async (id: number) => {
    if (isLocalFile) {
      setLocalBookmarks((prev) => prev.filter((b) => b.id !== id));
      return;
    }
    await customFetch(`/api/workspace/bookmarks/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["/api/workspace/bookmarks", dossierId] });
  };

  // ── Add note ───────────────────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!noteTitle.trim()) return;
    if (isLocalFile) {
      // Local-only note
      setLocalNotes((prev) => [
        {
          id: Date.now(),
          title: noteTitle,
          content: noteText,
          isPinned: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNoteTitle(""); setNoteText("");
      return;
    }
    if (!dossierId) return;
    await customFetch("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: noteTitle,
        content: noteText,
        dossierId,
        subjectId: 1,
        tags: [],
      }),
      headers: { "Content-Type": "application/json" },
    });
    setNoteTitle(""); setNoteText("");
    qc.invalidateQueries({ queryKey: ["/api/notes", dossierId] });
  };

  const deleteNote = async (id: number) => {
    if (isLocalFile) {
      setLocalNotes((prev) => prev.filter((n) => n.id !== id));
      return;
    }
    await customFetch(`/api/notes/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["/api/notes", dossierId] });
  };

  const isBookmarked = useMemo(
    () => bookmarks?.some((b) => b.pageNumber === currentPage),
    [bookmarks, currentPage]
  );

  const navigatePage = (n: number) => setCurrentPage(Math.min(totalPages, Math.max(1, n)));

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────
  const bg = isDark ? "bg-[#1a1a2e]" : "bg-[#f0ede8]";
  const toolbarBg = isDark ? "bg-[#16213e]/95 border-white/10" : "bg-white/95 border-gray-200/80";
  const sidebarBg = isDark ? "bg-[#16213e] border-white/10" : "bg-white border-gray-200/60";

  // ── Recent sessions (localStorage) ───────────────────────────────────────────
  const RECENT_KEY = "study-room-recent";
  interface RecentEntry { id: number; title: string; subjectName?: string; fileUrl?: string; isLocal?: boolean; openedAt: string; }

  const [recentSessions, setRecentSessions] = useState<RecentEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
  });

  const pushRecent = (entry: Omit<RecentEntry, "openedAt">) => {
    setRecentSessions((prev) => {
      const filtered = prev.filter((r) => !(r.id === entry.id && r.isLocal === entry.isLocal));
      const next = [{ ...entry, openedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Open a local PDF file directly for testing (no upload needed)
  const handleLocalFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.pdf$/i, "");
    pushRecent({ id: -1, title, isLocal: true, fileUrl: url });
    setDossierTitle(title);
    setDossierFileUrl(url);
    setDossierId(-1); // sentinel: local file
    setCurrentPage(1);
    setStrokes(new Map());
    setPdfDoc(null);
    setPdfError(null);
  };

  // Dossier picker (no dossier selected)
  if (!dossierId) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-black">غرفة الدراسة</h1>
            <p className="text-muted-foreground text-sm mt-1">اختر دوسية أو افتح ملف PDF من جهازك</p>
          </div>

          {/* Open local PDF card */}
          <label className="block cursor-pointer">
            <input type="file" accept="application/pdf" className="hidden" onChange={handleLocalFile} />
            <div className="border-2 border-dashed border-primary/30 rounded-3xl p-8 hover:border-primary/60 hover:bg-primary/3 transition-all text-center group">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-bold text-lg mb-1">افتح ملف PDF من جهازك</h2>
              <p className="text-sm text-muted-foreground">اضغط لاختيار أي ملف PDF — سيُفتح مباشرة بدون رفع</p>
            </div>
          </label>

          {/* Dossiers from platform */}
          <div>
            <h2 className="font-bold text-base mb-3">دوسيات المنصة</h2>

            {dossiers?.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground mb-1">لا توجد دوسيات بعد</p>
                <p className="text-xs text-muted-foreground/70">ستظهر الدوسيات هنا بعد إضافتها من قِبل المشرف</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {dossiers?.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => openDossier(d)}
                    className="text-right px-4 py-4 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-3 group bg-white shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{d.title}</div>
                      {d.subjectName && <div className="text-xs text-muted-foreground mt-0.5">{d.subjectName}</div>}
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base">آخر الجلسات</h2>
                <button
                  onClick={() => {
                    localStorage.removeItem(RECENT_KEY);
                    setRecentSessions([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  مسح الكل
                </button>
              </div>
              <div className="space-y-2">
                {recentSessions.map((r, i) => {
                  const relativeTime = (() => {
                    const diff = Date.now() - new Date(r.openedAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    const hours = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    if (mins < 1) return "الآن";
                    if (mins < 60) return `منذ ${mins} د`;
                    if (hours < 24) return `منذ ${hours} س`;
                    return `منذ ${days} يوم`;
                  })();

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (r.isLocal && r.fileUrl) {
                          // Re-open local file URL (still valid in same session)
                          setDossierTitle(r.title);
                          setDossierFileUrl(r.fileUrl);
                          setDossierId(-1);
                          setCurrentPage(1);
                          setStrokes(new Map());
                          setPdfDoc(null);
                          setPdfError(null);
                        } else if (!r.isLocal) {
                          openDossier({ id: r.id, title: r.title, subjectName: r.subjectName, fileUrl: r.fileUrl });
                        }
                      }}
                      className="w-full text-right px-4 py-3 rounded-2xl border border-border/40 hover:border-primary/30 hover:bg-primary/4 transition-all flex items-center gap-3 group bg-white/60"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.isLocal ? "bg-amber-50" : "bg-primary/8"}`}>
                        {r.isLocal
                          ? <FolderOpen className="w-4 h-4 text-amber-500" />
                          : <Clock className="w-4 h-4 text-primary/60" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-gray-800">{r.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.isLocal && <span className="text-[10px] text-amber-500 font-medium">ملف محلي</span>}
                          {r.subjectName && <span className="text-[10px] text-muted-foreground">{r.subjectName}</span>}
                          <span className="text-[10px] text-muted-foreground/60">{relativeTime}</span>
                        </div>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div
      ref={workspaceRef}
      className={`${isFullscreen ? "fixed inset-0 z-50" : "h-screen"} flex flex-col ${bg} overflow-hidden`}
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      {/* ── TOP TOOLBAR ── */}
      <header className={`${toolbarBg} border-b backdrop-blur-xl shrink-0 h-12 flex items-center px-3 gap-2 z-10`}>
        {/* Back / Dossier selector */}
        <button
          onClick={() => setDossierId(null)}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500"
          title="اختر دوسية أخرى"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          title={sidebarOpen ? "أخفِ الشريط" : "أظهر الشريط"}
        >
          <AlignLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Title + page */}
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm text-gray-900 truncate block">{dossierTitle}</span>
        </div>

        {/* Page navigation */}
        {pdfDoc && (
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-0.5">
            <button onClick={() => navigatePage(currentPage - 1)} className="p-0.5 hover:text-primary" disabled={currentPage <= 1}>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <input
              ref={pageInputRef}
              type="number"
              value={currentPage}
              min={1} max={totalPages}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) navigatePage(v);
              }}
              className="w-10 text-center text-xs font-bold bg-transparent outline-none"
            />
            <span className="text-xs text-gray-400">/ {totalPages}</span>
            <button onClick={() => navigatePage(currentPage + 1)} className="p-0.5 hover:text-primary" disabled={currentPage >= totalPages}>
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Zoom */}
        {pdfDoc && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-xs font-semibold text-gray-600 w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Undo / Redo */}
        <button onClick={undo} disabled={!(history.get(currentPage)?.length)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 disabled:opacity-30">
          <Undo2 className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={redo} disabled={!(redoStack.get(currentPage)?.length)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 disabled:opacity-30">
          <Redo2 className="w-4 h-4 text-gray-600" />
        </button>

        {/* Bookmark */}
        <button
          onClick={addBookmark}
          className={`w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors ${isBookmarked ? "text-accent" : "text-gray-400"}`}
          title="إضافة إشارة مرجعية"
        >
          {isBookmarked ? <Bookmark className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
        </button>

        {/* Save status */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
          {saveStatus === "saved" && <Save className="w-3 h-3 text-green-500" />}
          {saveStatus === "unsaved" && <div className="w-2 h-2 rounded-full bg-amber-400" />}
        </div>

        {/* Fullscreen */}
        <button onClick={() => setIsFullscreen((v) => !v)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-500" /> : <Maximize2 className="w-4 h-4 text-gray-500" />}
        </button>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── LEFT SIDEBAR ── */}
        {sidebarOpen && (
          <aside className={`${sidebarBg} border-l flex flex-col w-72 shrink-0`} style={{ direction: "rtl" }}>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0">
              {([ ["notes", StickyNote, "ملاحظات"], ["bookmarks", Bookmark, "إشارات"], ["timer", Timer, "موقت"] ] as [Tab, React.ElementType, string][]).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === tab
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px]">{label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-3 space-y-2 border border-gray-100">
                    <input
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="عنوان الملاحظة"
                      className="w-full text-sm font-semibold bg-transparent outline-none placeholder:text-gray-300"
                    />
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="اكتب ملاحظتك هنا..."
                      rows={3}
                      className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-gray-300"
                    />
                    <button
                      onClick={saveNote}
                      disabled={!noteTitle.trim()}
                      className="w-full py-1.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >
                      حفظ الملاحظة
                    </button>
                  </div>
                  {notes?.length === 0 && (
                    <p className="text-center text-gray-300 text-xs py-4">لا توجد ملاحظات للدوسية</p>
                  )}
                  {notes?.map((n) => (
                    <div key={n.id} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-gray-900 truncate">{n.title}</div>
                        <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {n.content && <p className="text-xs text-gray-500 mt-1 line-clamp-3">{n.content}</p>}
                      <div className="text-[10px] text-gray-300 mt-2">
                        {new Date(n.createdAt).toLocaleDateString("ar-SA")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* POMODORO TIMER */}
              {activeTab === "timer" && (
                <div className="flex flex-col items-center gap-5 pt-4">
                  {/* Mode selector */}
                  <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-full">
                    {([ ["work", "تركيز"], ["break", "راحة"], ["long", "راحة طويلة"] ] as ["work"|"break"|"long", string][]).map(([m, label]) => (
                      <button
                        key={m}
                        onClick={() => switchTimerMode(m)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${timerMode === m ? "bg-white shadow text-primary" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Circular progress */}
                  <div className="relative w-44 h-44">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                      <circle
                        cx="50" cy="50" r="44" fill="none"
                        stroke={timerMode === "work" ? "hsl(var(--primary))" : "#22c55e"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 44}`}
                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerProgress / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.9s linear" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={`text-4xl font-black tabular-nums ${timerMode === "work" ? "text-gray-900" : "text-green-600"}`}>
                        {timerMins}:{timerSecs}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        {timerMode === "work" ? <><Pencil className="w-3 h-3" /> تركيز</> : <><Coffee className="w-3 h-3" /> راحة</>}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={resetTimer}
                      className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      title="إعادة تعيين"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={toggleTimer}
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                        timerRunning
                          ? "bg-gray-900 hover:bg-gray-700"
                          : timerMode === "work"
                          ? "bg-primary hover:bg-primary/90 shadow-primary/30"
                          : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
                      }`}
                    >
                      {timerRunning
                        ? <Pause className="w-6 h-6 text-white" />
                        : <Play className="w-6 h-6 text-white mr-0.5" />}
                    </button>
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-black text-primary">{pomodoroCount}</span>
                    </div>
                  </div>

                  {/* Pomodoro count label */}
                  <p className="text-xs text-gray-400 text-center">
                    {pomodoroCount === 0
                      ? "ابدأ جلستك الأولى 🎯"
                      : `أتممت ${pomodoroCount} جلسة${pomodoroCount >= 4 ? " 🔥 رائع!" : ""}`}
                  </p>

                  {/* Tip */}
                  <div className="w-full rounded-2xl bg-primary/5 border border-primary/10 p-3 text-center">
                    <p className="text-xs text-primary/80 font-medium leading-relaxed">
                      {timerMode === "work"
                        ? "ركّز ٢٥ دقيقة دون انقطاع، ثم خذ راحة قصيرة."
                        : timerMode === "break"
                        ? "استرح ٥ دقائق — اشرب ماءً أو تمدد قليلاً."
                        : "راحة طويلة ١٥ دقيقة — أنت تستحقها! 🎉"}
                    </p>
                  </div>
                </div>
              )}

              {/* BOOKMARKS */}
              {activeTab === "bookmarks" && (
                <div className="space-y-2">
                  {!bookmarks?.length && (
                    <p className="text-center text-gray-300 text-xs py-4">لا توجد إشارات مرجعية</p>
                  )}
                  {bookmarks?.map((b) => (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-2">
                      <button
                        onClick={() => navigatePage(b.pageNumber)}
                        className="flex-1 text-right"
                      >
                        <div className="font-semibold text-sm text-gray-900">{b.title}</div>
                        <div className="text-xs text-primary">صفحة {b.pageNumber}</div>
                      </button>
                      <button onClick={() => deleteBookmark(b.id)} className="text-gray-200 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </aside>
        )}

        {/* ── CENTER: PDF + ANNOTATIONS ── */}
        <main className="flex-1 min-w-0 relative overflow-auto flex items-start justify-center py-6">
          {/* States */}
          {!dossierFileUrl && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
                <FileText className="w-10 h-10 text-gray-300" />
              </div>
              <div>
                <h2 className="font-bold text-gray-700 mb-1">لا يوجد ملف PDF</h2>
                <p className="text-sm text-gray-400">هذه الدوسية لا تحتوي على ملف PDF. يمكن للمشرف رفع الملف من لوحة التحكم.</p>
              </div>
            </div>
          )}

          {pdfLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-gray-500 text-sm">جاري تحميل الملف...</p>
            </div>
          )}

          {pdfError && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-500 text-sm">{pdfError}</p>
            </div>
          )}

          {/* PDF Canvas + Annotation overlay */}
          {pdfDoc && !pdfLoading && !pdfError && (
            <div
              className="relative shadow-2xl rounded-lg overflow-hidden"
              style={{ background: isDark ? "#2d2d2d" : "#fff" }}
            >
              {/* PDF page canvas */}
              <canvas ref={pdfCanvasRef} style={{ display: "block" }} />

              {/* Annotation canvas on top */}
              <canvas
                ref={annotCanvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{
                  position: "absolute",
                  inset: 0,
                  cursor: tool === "hand"
                    ? "default"
                    : tool === "eraser"
                    ? "cell"
                    : "crosshair",
                  touchAction: tool === "hand" ? "auto" : "none",
                  pointerEvents: tool === "hand" ? "none" : "auto",
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── BOTTOM ANNOTATION TOOLBAR ── */}
      {pdfDoc && (
        <footer className={`${toolbarBg} border-t backdrop-blur-xl shrink-0 h-14 flex items-center justify-center gap-2 px-4`}>
          {/* Tools */}
          {([
            ["hand",        Hand,        "تصفح"],
            ["pen",         Pencil,       "قلم"],
            ["highlighter", Highlighter,  "تظليل"],
            ["eraser",      Eraser,       "ممحاة"],
            ["rect",        Square,       "مستطيل"],
            ["circle",      CircleIcon,   "دائرة"],
            ["line",        Minus,        "خط"],
          ] as [Tool, React.ElementType, string][]).map(([t, Icon, label]) => (
            <button
              key={t}
              title={label}
              onClick={() => setTool(t)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                tool === t
                  ? "bg-primary text-white shadow-lg scale-110"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Colors */}
          {(tool === "highlighter" ? HIGHLIGHT_COLORS : COLORS).map((c) => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === c ? "border-primary scale-125" : "border-gray-200"}`}
              style={{ background: c }}
            />
          ))}

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Stroke width */}
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setPenWidth(w)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${penWidth === w ? "bg-gray-100 ring-2 ring-primary" : "hover:bg-gray-50"}`}
            >
              <div
                className="rounded-full bg-gray-700"
                style={{ width: Math.min(w * 1.5, 16), height: Math.min(w * 1.5, 16) }}
              />
            </button>
          ))}
        </footer>
      )}
    </div>
  );
}
