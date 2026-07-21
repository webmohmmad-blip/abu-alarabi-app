import { useState, type ChangeEvent } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { AdminToast } from "@/components/admin/shared/admin-toast";
import { DeleteDialog } from "@/components/admin/shared/delete-dialog";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { StatsCards } from "@/components/admin/shared/stats-cards";
import {
  FileText, Plus, Trash2, Pencil, Search, X,
  Eye, EyeOff, Archive, Clock, CheckCircle2, AlertCircle,
  Copy, ExternalLink, Upload, Loader2, Check,
  BarChart3, BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject { id: number; name: string; grade: string; }

interface Worksheet {
  id: number;
  title: string;
  description?: string | null;
  subjectId: number;
  grade: string;
  difficulty: string;
  estimatedMinutes: number;
  fileUrl: string | null;
  coverUrl?: string | null;
  downloads: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "سهل",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20"  },
  medium: { label: "متوسط", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  hard:   { label: "صعب",   color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20"      },
};

// StatusBadge → imported from @/components/admin/shared/status-badge

const diffBadge = (d: string) => {
  const m = DIFFICULTY_META[d];
  if (!m) return null;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  );
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useWorksheets = () =>
  useQuery<Worksheet[]>({
    queryKey: ["/api/admin/worksheets"],
    queryFn: () =>
      customFetch<{ items: Worksheet[] }>("/api/admin/worksheets", { method: "GET" })
        .then((r) => r.items),
  });

const useSubjects = () =>
  useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: () => customFetch<Subject[]>("/api/subjects", { method: "GET" }),
  });

// AdminToast → imported from @/components/admin/shared/admin-toast

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminWorksheets() {
  const qc = useQueryClient();
  const { data: worksheets, isLoading } = useWorksheets();
  const { data: subjects } = useSubjects();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingWs, setEditingWs] = useState<Worksheet | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Worksheet | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const del = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean; message: string }>(`/api/admin/worksheets/${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/worksheets"] });
      setConfirmDelete(null);
      showToast(data?.message ?? "تم حذف ورقة العمل بنجاح");
    },
    onError: (e: any) => showToast(e?.data?.message ?? "فشل الحذف", "error"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      customFetch(`/api/admin/worksheets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/worksheets"] });
      const label = ({ published: "منشور", draft: "مسودة", archived: "مؤرشف" } as Record<string, string>)[vars.status] ?? vars.status;
      showToast(`تم تغيير الحالة إلى: ${label}`);
    },
    onError: () => showToast("فشل تغيير الحالة", "error"),
  });

  const duplicate = useMutation({
    mutationFn: (ws: Worksheet) =>
      customFetch("/api/admin/worksheets", {
        method: "POST",
        body: JSON.stringify({
          title: `${ws.title} (نسخة)`,
          subjectId: ws.subjectId,
          grade: ws.grade,
          difficulty: ws.difficulty,
          description: ws.description ?? null,
          estimatedMinutes: ws.estimatedMinutes,
          fileUrl: ws.fileUrl,
          coverUrl: ws.coverUrl ?? null,
          status: "draft",
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/worksheets"] });
      showToast("تم نسخ ورقة العمل");
    },
    onError: () => showToast("فشل نسخ ورقة العمل", "error"),
  });

  // ── Filtering & stats ───────────────────────────────────────────────────────

  const all = worksheets ?? [];
  const stats = {
    total:     all.length,
    published: all.filter((w) => w.status === "published").length,
    draft:     all.filter((w) => w.status === "draft").length,
    archived:  all.filter((w) => w.status === "archived").length,
  };

  const filtered = all.filter((w) => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const subjectName = (subjects ?? []).find((s) => s.id === w.subjectId)?.name ?? "";
      if (
        !w.title.includes(search) &&
        !w.grade.includes(search) &&
        !subjectName.includes(search)
      )
        return false;
    }
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-secondary" /> أوراق العمل
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              إدارة أوراق العمل ورفعها وتنظيمها ونشرها للطلاب
            </p>
          </div>
          <Button
            onClick={() => { setEditingWs(null); setShowCreate(true); }}
            className="bg-secondary hover:bg-secondary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> إضافة ورقة عمل
          </Button>
        </motion.div>

        {/* Stats */}
        <StatsCards stats={[
          { label: "الكل",   value: stats.total,     color: "text-white"      },
          { label: "منشور",  value: stats.published, color: "text-green-400"  },
          { label: "مسودة",  value: stats.draft,     color: "text-white/60"   },
          { label: "مؤرشف", value: stats.archived,  color: "text-orange-400" },
        ]} />

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="البحث في أوراق العمل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1">
            {[
              { v: "all",       l: "الكل"   },
              { v: "draft",     l: "مسودة"  },
              { v: "published", l: "منشور"  },
              { v: "archived",  l: "مؤرشف" },
            ].map((f) => (
              <button
                key={f.v}
                onClick={() => setStatusFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === f.v
                    ? "bg-secondary text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search || statusFilter !== "all"
                  ? "لا توجد نتائج تطابق البحث"
                  : "لا توجد أوراق عمل بعد — أضف أول ورقة من الزر أعلاه."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((ws, i) => (
              <WorksheetRow
                key={ws.id}
                ws={ws}
                index={i}
                subjects={subjects ?? []}
                onEdit={() => { setEditingWs(ws); setShowCreate(true); }}
                onDelete={() => setConfirmDelete(ws)}
                onDuplicate={() => duplicate.mutate(ws)}
                onSetStatus={(status) => setStatus.mutate({ id: ws.id, status })}
                isDeleting={del.isPending && confirmDelete?.id === ws.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {showCreate && (
        <WorksheetFormModal
          worksheet={editingWs}
          subjects={subjects ?? []}
          onClose={() => { setShowCreate(false); setEditingWs(null); }}
          onSuccess={(msg) => {
            setShowCreate(false);
            setEditingWs(null);
            qc.invalidateQueries({ queryKey: ["/api/admin/worksheets"] });
            showToast(msg);
          }}
        />
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <DeleteDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && del.mutate(confirmDelete.id)}
        isPending={del.isPending}
        title="حذف ورقة العمل"
        subtitle="هذا الإجراء لا يمكن التراجع عنه"
        itemText={confirmDelete?.title ?? ""}
        confirmText="حذف ورقة العمل"
      />

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <AdminToast key="toast" message={toast.message} type={toast.type} onDone={() => setToast(null)} />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

// ─── Worksheet Row ─────────────────────────────────────────────────────────────

function WorksheetRow({
  ws,
  index,
  subjects,
  onEdit,
  onDelete,
  onDuplicate,
  onSetStatus,
  isDeleting,
}: {
  ws: Worksheet;
  index: number;
  subjects: Subject[];
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSetStatus: (s: string) => void;
  isDeleting: boolean;
}) {
  const subjectName = subjects.find((s) => s.id === ws.subjectId)?.name ?? "";
  const diff = DIFFICULTY_META[ws.difficulty];

  const fmtDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("ar-JO", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="bg-white/5 border-white/10 overflow-hidden group hover:border-white/20 transition-colors">
        <div className="flex items-center gap-3 p-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-secondary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-white truncate max-w-[280px]">{ws.title}</span>
              <StatusBadge status={ws.status} />
              {diffBadge(ws.difficulty)}
            </div>
            {/* Meta row */}
            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              {subjectName && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{subjectName}</span>}
              {ws.grade && <span>الصف {ws.grade}</span>}
              {ws.estimatedMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{ws.estimatedMinutes} د
                </span>
              )}
              {ws.fileUrl && (
                <span className="text-green-400/70 flex items-center gap-1">
                  <Check className="w-3 h-3" /> PDF
                </span>
              )}
              {ws.downloads > 0 && <span>{ws.downloads.toLocaleString("ar")} تنزيل</span>}
              {fmtDate(ws.updatedAt) && (
                <span className="text-white/30">آخر تعديل: {fmtDate(ws.updatedAt)}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Open PDF */}
            {ws.fileUrl && (
              <a
                href={ws.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                title="فتح الملف"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Publish / Unpublish */}
            {ws.status === "draft" && (
              <button
                onClick={() => onSetStatus("published")}
                className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                title="نشر"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {ws.status === "published" && (
              <button
                onClick={() => onSetStatus("draft")}
                className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                title="إلغاء النشر"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            )}

            {/* Archive */}
            {ws.status !== "archived" && (
              <button
                onClick={() => onSetStatus("archived")}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title="أرشفة"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            {ws.status === "archived" && (
              <button
                onClick={() => onSetStatus("draft")}
                className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors"
                title="إلغاء الأرشفة"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            {/* Duplicate */}
            <button
              onClick={onDuplicate}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="نسخ"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              title="تعديل"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Worksheet Form Modal ─────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { value: "easy",   label: "سهل"   },
  { value: "medium", label: "متوسط" },
  { value: "hard",   label: "صعب"   },
];

const STATUS_OPTIONS = [
  { value: "draft",     label: "مسودة"  },
  { value: "published", label: "منشور"  },
  { value: "archived",  label: "مؤرشف" },
];

function WorksheetFormModal({
  worksheet,
  subjects,
  onClose,
  onSuccess,
}: {
  worksheet: Worksheet | null;
  subjects: Subject[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    title:            worksheet?.title            ?? "",
    description:      worksheet?.description      ?? "",
    subjectId:        worksheet?.subjectId        ?? (subjects[0]?.id ?? 0),
    grade:            worksheet?.grade            ?? (subjects[0]?.grade ?? "12"),
    difficulty:       worksheet?.difficulty       ?? "medium",
    estimatedMinutes: worksheet?.estimatedMinutes ?? 30,
    fileUrl:          worksheet?.fileUrl          ?? "",
    coverUrl:         worksheet?.coverUrl         ?? "",
    status:           worksheet?.status           ?? "draft",
  });
  const [error,            setError]            = useState("");
  const [uploading,        setUploading]        = useState(false);
  const [uploadedName,     setUploadedName]     = useState(worksheet?.fileUrl ? "ملف موجود" : "");
  const [uploadingCover,   setUploadingCover]   = useState(false);
  const [uploadedCoverName,setUploadedCoverName]= useState(worksheet?.coverUrl ? "صورة موجودة" : "");

  // Auto-fill grade when subject changes
  const handleSubjectChange = (id: number) => {
    const s = subjects.find((s) => s.id === id);
    setForm((f) => ({ ...f, subjectId: id, grade: s?.grade ?? f.grade }));
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("الرجاء اختيار ملف صورة (JPG، PNG، WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة يتجاوز 5 ميغابايت");
      return;
    }
    setError(""); setUploadingCover(true);
    try {
      const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
        "/api/storage/uploads/request-url",
        { method: "POST", body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }
      );
      const up = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!up.ok) throw new Error("فشل رفع الصورة");
      setForm((f) => ({ ...f, coverUrl: `/api/storage${objectPath}` }));
      setUploadedCoverName(file.name);
    } catch (err: any) {
      setError(err.message ?? "فشل رفع الصورة");
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("الرجاء اختيار ملف PDF فقط");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("حجم الملف يتجاوز الحد المسموح به (50 ميغابايت)");
      return;
    }
    setError(""); setUploading(true);
    try {
      const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
        "/api/storage/uploads/request-url",
        { method: "POST", body: JSON.stringify({ name: file.name, size: file.size, contentType: "application/pdf" }) }
      );
      const up = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": "application/pdf" } });
      if (!up.ok) throw new Error("فشل رفع الملف إلى التخزين");
      setForm((f) => ({ ...f, fileUrl: `/api/storage${objectPath}` }));
      setUploadedName(file.name);
    } catch (err: any) {
      setError(err.message ?? "فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: () =>
      worksheet
        ? customFetch(`/api/admin/worksheets/${worksheet.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...form, subjectId: Number(form.subjectId) }),
          })
        : customFetch("/api/admin/worksheets", {
            method: "POST",
            body: JSON.stringify({ ...form, subjectId: Number(form.subjectId) }),
          }),
    onSuccess: () => onSuccess(worksheet ? "تم تحديث ورقة العمل بنجاح" : "تمت إضافة ورقة العمل بنجاح"),
    onError: (e: any) => setError(e?.message ?? "حدث خطأ أثناء الحفظ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {worksheet ? "تعديل ورقة العمل" : "ورقة عمل جديدة"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">عنوان ورقة العمل *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="مثال: ورقة عمل النحو — الفصل الأول"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الوصف (اختياري)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-secondary/40"
              placeholder="وصف مختصر عن محتوى ورقة العمل..."
              rows={3}
            />
          </div>

          {/* Subject + Grade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">المادة الدراسية</label>
              <select
                value={form.subjectId}
                onChange={(e) => handleSubjectChange(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#1a1030]">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">الصف الدراسي</label>
              <Input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="مثال: 12"
              />
            </div>
          </div>

          {/* Difficulty + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">مستوى الصعوبة</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#1a1030]">{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">حالة النشر</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#1a1030]">{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الوقت المتوقع (دقيقة)</label>
            <Input
              type="number"
              value={form.estimatedMinutes || ""}
              onChange={(e) => setForm({ ...form, estimatedMinutes: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="30"
              min="0"
            />
          </div>

          {/* Cover image upload */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">صورة الغلاف (اختيارية)</label>
            <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors mb-2 ${
              uploadedCoverName
                ? "border-green-500/40 bg-green-500/10"
                : "border-white/10 hover:border-secondary/30"
            }`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
              {uploadingCover ? (
                <><Loader2 className="w-4 h-4 text-secondary animate-spin" /><span className="text-sm text-white/70">جاري رفع الصورة...</span></>
              ) : uploadedCoverName ? (
                <><Check className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400 truncate max-w-[220px]">{uploadedCoverName}</span></>
              ) : (
                <><Upload className="w-4 h-4 text-white/40" /><span className="text-sm text-white/40">اضغط لرفع صورة الغلاف (JPG، PNG)</span></>
              )}
            </label>
            {form.coverUrl && (
              <div className="flex items-center gap-2 mb-2">
                <img src={form.coverUrl} alt="غلاف" className="w-12 h-12 rounded-lg object-cover border border-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <button
                  onClick={() => { setForm((f) => ({ ...f, coverUrl: "" })); setUploadedCoverName(""); }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> إزالة الصورة
                </button>
              </div>
            )}
          </div>

          {/* PDF Upload */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">ملف PDF</label>

            {/* Drop zone */}
            <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors mb-2 ${
              uploadedName
                ? "border-green-500/40 bg-green-500/10"
                : "border-white/10 hover:border-secondary/30"
            }`}>
              <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={uploading} />
              {uploading ? (
                <><Loader2 className="w-4 h-4 text-secondary animate-spin" /><span className="text-sm text-white/70">جاري الرفع...</span></>
              ) : uploadedName ? (
                <><Check className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400 truncate max-w-[220px]">{uploadedName}</span></>
              ) : (
                <><Upload className="w-4 h-4 text-white/40" /><span className="text-sm text-white/40">اضغط لرفع ملف PDF (حتى 50 ميغابايت)</span></>
              )}
            </label>

            {/* PDF action buttons when file exists */}
            {form.fileUrl && (
              <div className="flex items-center gap-2 mb-2">
                <a
                  href={form.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> معاينة PDF
                </a>
                <span className="text-white/20">·</span>
                <button
                  onClick={() => { setForm((f) => ({ ...f, fileUrl: "" })); setUploadedName(""); }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> إزالة الملف
                </button>
              </div>
            )}

            {/* Manual URL */}
            <Input
              value={form.fileUrl}
              onChange={(e) => { setForm({ ...form, fileUrl: e.target.value }); if (e.target.value) setUploadedName(""); }}
              className="bg-white/5 border-white/10 text-white text-xs"
              placeholder="أو أدخل رابطاً مباشراً للملف"
              dir="ltr"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => save.mutate()}
            disabled={!form.title.trim() || save.isPending || uploading}
            className="flex-1 bg-secondary hover:bg-secondary/90"
          >
            {save.isPending
              ? "جاري الحفظ..."
              : worksheet
              ? "حفظ التعديلات"
              : "إضافة ورقة العمل"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            إلغاء
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
