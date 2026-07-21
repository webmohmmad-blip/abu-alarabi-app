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
import { useState, type ChangeEvent } from "react";
import {
  BookOpen, Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  Search, X, Check, AlertCircle, Upload, Loader2,
  Eye, EyeOff, ExternalLink, FileText, GripVertical,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject {
  id: number;
  name: string;
  grade: string;
  field: string | null;
  color: string | null;
}

interface Dossier {
  id: number;
  title: string;
  description: string | null;
  subjectId: number;
  grade: string;
  pageCount: number;
  downloads: number;
  views: number;
  coverUrl: string | null;
  fileUrl: string | null;
  status: string;
  createdAt: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useSubjects = () =>
  useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => customFetch<Subject[]>("/api/subjects", { method: "GET" }),
  });

const useDossiers = (subjectId: number) =>
  useQuery({
    queryKey: ["/api/admin/dossiers", subjectId],
    queryFn: () =>
      customFetch<{ ok: boolean; items: Dossier[]; pagination: { total: number } }>(
        `/api/admin/dossiers?subjectId=${subjectId}&pageSize=100`,
        { method: "GET" }
      ).then((r) => ({ items: r.items ?? [], total: r.pagination?.total ?? 0 })),
    enabled: subjectId > 0,
  });

// AdminToast and DeleteDialog are imported from @/components/admin/shared/

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminContent() {
  const qc = useQueryClient();
  const { data: subjects, isLoading } = useSubjects();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [addDossierForSubject, setAddDossierForSubject] = useState<number | null>(null);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<Subject | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const deleteSubject = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/admin/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      setConfirmDeleteSubject(null);
      showToast("تم حذف المادة بنجاح");
    },
    onError: () => showToast("فشل حذف المادة", "error"),
  });

  const filtered = subjects?.filter((s) =>
    search ? s.name.includes(search) || s.grade.includes(search) : true
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> إدارة الدوسيات
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              رفع الدوسيات وتنظيمها حسب المادة الدراسية
            </p>
          </div>
          <Button
            onClick={() => setShowAddSubject(true)}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> مادة جديدة
          </Button>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث في المواد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* Empty state */}
        {!isLoading && filtered?.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">لا توجد مواد بعد</h3>
              <p className="text-muted-foreground text-sm mb-6">
                أضف مادة دراسية ثم ارفع دوسياتها.
              </p>
              <Button onClick={() => setShowAddSubject(true)} className="gap-2">
                <Plus className="w-4 h-4" /> إضافة أول مادة
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subject list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered?.map((subject, i) => {
              const isExpanded = expandedId === subject.id;
              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="bg-white/5 border-white/10 overflow-hidden">
                    {/* Subject row */}
                    <div
                      onClick={() =>
                        setExpandedId(isExpanded ? null : subject.id)
                      }
                      className="flex items-center gap-4 p-5 hover:bg-white/5 transition-colors cursor-pointer select-none"
                    >
                      {/* Color avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-base"
                        style={{ backgroundColor: subject.color ?? "#5A2D82" }}
                      >
                        {subject.name.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">
                          {subject.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          الصف {subject.grade}
                          {subject.field && subject.field !== "all"
                            ? ` • ${subject.field}`
                            : ""}
                        </div>
                      </div>

                      {/* Dossier count badge */}
                      <DossierCountBadge subjectId={subject.id} />

                      {/* Delete subject */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteSubject(subject);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Chevron */}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {/* Dossiers panel */}
                    {isExpanded && (
                      <DossiersPanel
                        subjectId={subject.id}
                        qc={qc}
                        onAdd={() => setAddDossierForSubject(subject.id)}
                        onEdit={(d) => setEditingDossier(d)}
                        onToast={showToast}
                      />
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Subject Modal ─────────────────────────────────────────── */}
      {showAddSubject && (
        <AddSubjectModal
          onClose={() => setShowAddSubject(false)}
          onSuccess={() => {
            setShowAddSubject(false);
            qc.invalidateQueries({ queryKey: ["/api/subjects"] });
            showToast("تمت إضافة المادة بنجاح");
          }}
        />
      )}

      {/* ── Add Dossier Modal ─────────────────────────────────────────── */}
      {addDossierForSubject !== null && (
        <DossierFormModal
          subjectId={addDossierForSubject}
          dossier={null}
          onClose={() => setAddDossierForSubject(null)}
          onSuccess={() => {
            const sid = addDossierForSubject;
            setAddDossierForSubject(null);
            qc.invalidateQueries({ queryKey: ["/api/admin/dossiers", sid] });
            showToast("تمت إضافة الدوسية بنجاح");
          }}
        />
      )}

      {/* ── Edit Dossier Modal ────────────────────────────────────────── */}
      {editingDossier && (
        <DossierFormModal
          subjectId={editingDossier.subjectId}
          dossier={editingDossier}
          onClose={() => setEditingDossier(null)}
          onSuccess={() => {
            const sid = editingDossier.subjectId;
            setEditingDossier(null);
            qc.invalidateQueries({ queryKey: ["/api/admin/dossiers", sid] });
            showToast("تم تحديث الدوسية بنجاح");
          }}
        />
      )}

      {/* ── Delete Subject Confirmation ───────────────────────────────── */}
      <DeleteDialog
        open={!!confirmDeleteSubject}
        onClose={() => setConfirmDeleteSubject(null)}
        onConfirm={() => confirmDeleteSubject && deleteSubject.mutate(confirmDeleteSubject.id)}
        isPending={deleteSubject.isPending}
        title="حذف المادة"
        subtitle="سيتم حذف المادة وجميع دوسياتها"
        itemText={confirmDeleteSubject?.name ?? ""}
        confirmText="حذف المادة"
      />

      {/* ── Toast ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <AdminToast
            key="toast"
            message={toast.message}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

// ─── Dossier Count Badge (fetches lazily per subject) ─────────────────────────

function DossierCountBadge({ subjectId }: { subjectId: number }) {
  const { data } = useDossiers(subjectId);
  const count = data?.total ?? data?.items?.length ?? 0;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
      {count} دوسية
    </span>
  );
}

// ─── Dossiers Panel ───────────────────────────────────────────────────────────

function DossiersPanel({
  subjectId,
  qc,
  onAdd,
  onEdit,
  onToast,
}: {
  subjectId: number;
  qc: ReturnType<typeof useQueryClient>;
  onAdd: () => void;
  onEdit: (d: Dossier) => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const { data, isLoading } = useDossiers(subjectId);
  const items = data?.items ?? [];
  const [confirmDelete, setConfirmDelete] = useState<Dossier | null>(null);

  const del = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean; message: string }>(
        `/api/admin/dossiers/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/dossiers", subjectId] });
      setConfirmDelete(null);
      onToast(resp?.message ?? "تم حذف الدوسية بنجاح");
    },
    onError: () => onToast("فشل حذف الدوسية", "error"),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      customFetch(`/api/admin/dossiers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/dossiers", subjectId] });
      onToast(
        vars.status === "published" ? "تم نشر الدوسية" : "تم إلغاء نشر الدوسية"
      );
    },
    onError: () => onToast("فشلت العملية", "error"),
  });

  return (
    <div className="border-t border-white/10 bg-black/10 p-5">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          الدوسيات ({items.length})
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة دوسية
        </button>
      </div>

      {/* Loading */}
      {isLoading && <Skeleton className="h-20 bg-white/5 rounded-xl" />}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            لا توجد دوسيات بعد — أضف أول دوسية من الزر أعلاه.
          </p>
        </div>
      )}

      {/* Dossier rows */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((d, idx) => {
            const isPublished = d.status === "published";
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors group"
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />

                {/* Index */}
                <span className="text-xs font-bold text-muted-foreground/50 w-5 shrink-0 text-center">
                  {idx + 1}
                </span>

                {/* Cover thumbnail or icon */}
                <div className="w-9 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 border border-white/10">
                  {d.coverUrl ? (
                    <img
                      src={d.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-4 h-4 text-primary/50" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {d.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {d.pageCount > 0 && <span>{d.pageCount} صفحة</span>}
                    {d.downloads > 0 && (
                      <>
                        <span>·</span>
                        <span>{d.downloads.toLocaleString("ar")} تنزيل</span>
                      </>
                    )}
                    {d.description && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[140px]">
                          {d.description}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge + actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Publish toggle */}
                  <button
                    onClick={() =>
                      togglePublish.mutate({
                        id: d.id,
                        status: isPublished ? "draft" : "published",
                      })
                    }
                    disabled={togglePublish.isPending}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                      isPublished
                        ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                    }`}
                    title={isPublished ? "إلغاء النشر" : "نشر"}
                  >
                    {isPublished ? "منشور" : "مسودة"}
                  </button>

                  {/* Open PDF */}
                  {d.fileUrl && (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-all"
                      title="فتح الملف"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => onEdit(d)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-all"
                    title="تعديل"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(d)}
                    disabled={del.isPending && confirmDelete?.id === d.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete dossier confirmation */}
      <DeleteDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && del.mutate(confirmDelete.id)}
        isPending={del.isPending}
        title="حذف الدوسية"
        subtitle="لا يمكن التراجع عن هذا الإجراء"
        itemText={confirmDelete?.title ?? ""}
        confirmText="حذف الدوسية"
        zClass="z-[60]"
      />
    </div>
  );
}

// ─── Dossier Form Modal (Add + Edit) ─────────────────────────────────────────

function DossierFormModal({
  subjectId,
  dossier,
  onClose,
  onSuccess,
}: {
  subjectId: number;
  dossier: Dossier | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: dossier?.title ?? "",
    description: dossier?.description ?? "",
    grade: dossier?.grade ?? "12",
    pageCount: dossier?.pageCount ?? 0,
    fileUrl: dossier?.fileUrl ?? "",
    coverUrl: dossier?.coverUrl ?? "",
  });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState(
    dossier?.fileUrl ? "ملف موجود" : ""
  );
  const [uploadingCover, setUploadingCover] = useState(false);

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("الرجاء اختيار ملف PDF فقط");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await customFetch<{
        uploadURL: string;
        objectPath: string;
      }>("/api/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: "application/pdf",
        }),
      });
      const up = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      if (!up.ok) throw new Error("فشل رفع الملف");
      setForm((prev) => ({
        ...prev,
        fileUrl: `/api/storage${objectPath}`,
      }));
      setUploadedName(file.name);
    } catch (err: any) {
      setError(err.message ?? "خطأ في رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { uploadURL, objectPath } = await customFetch<{
        uploadURL: string;
        objectPath: string;
      }>("/api/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const up = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!up.ok) throw new Error("فشل رفع الصورة");
      setForm((prev) => ({
        ...prev,
        coverUrl: `/api/storage${objectPath}`,
      }));
    } catch (err: any) {
      setError(err.message ?? "خطأ في رفع الصورة");
    } finally {
      setUploadingCover(false);
    }
  };

  const save = useMutation({
    mutationFn: () =>
      dossier
        ? customFetch(`/api/admin/dossiers/${dossier.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              ...form,
              pageCount: Number(form.pageCount) || 0,
            }),
          })
        : customFetch("/api/admin/dossiers", {
            method: "POST",
            body: JSON.stringify({
              ...form,
              subjectId,
              pageCount: Number(form.pageCount) || 0,
            }),
          }),
    onSuccess,
    onError: (e: any) => setError(e?.message ?? "خطأ في الحفظ"),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {dossier ? "تعديل الدوسية" : "إضافة دوسية جديدة"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              عنوان الدوسية *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="مثال: دوسية الوحدة الأولى"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              الوصف (اختياري)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/50"
              placeholder="وصف مختصر للدوسية..."
            />
          </div>

          {/* Grade + Page count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                الصف
              </label>
              <Input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="12"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                عدد الصفحات
              </label>
              <Input
                type="number"
                value={form.pageCount || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pageCount: parseInt(e.target.value) || 0,
                  })
                }
                className="bg-white/5 border-white/10 text-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* PDF Upload */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              ملف PDF
            </label>
            <label
              className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                uploadedName
                  ? "border-green-500/40 bg-green-500/10"
                  : "border-white/10 hover:border-primary/30"
              }`}
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-white/70">جاري الرفع...</span>
                </>
              ) : uploadedName ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 truncate max-w-[200px]">
                    {uploadedName}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/40">
                    اضغط لرفع ملف PDF
                  </span>
                </>
              )}
            </label>
            <Input
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-xs mt-2"
              placeholder="أو أدخل رابطاً مباشراً للملف"
              dir="ltr"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              صورة الغلاف (اختياري)
            </label>
            <div className="flex gap-2">
              {form.coverUrl && (
                <div className="w-12 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={form.coverUrl}
                    alt="غلاف"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 border border-dashed border-white/10 hover:border-primary/30 rounded-lg px-3 py-2 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                  {uploadingCover ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span className="text-xs text-white/60">
                        جاري الرفع...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-xs text-white/40">رفع صورة</span>
                    </>
                  )}
                </label>
                <Input
                  value={form.coverUrl}
                  onChange={(e) =>
                    setForm({ ...form, coverUrl: e.target.value })
                  }
                  className="bg-white/5 border-white/10 text-white text-xs"
                  placeholder="أو أدخل رابط الصورة"
                  dir="ltr"
                />
              </div>
            </div>
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
            disabled={!form.title.trim() || save.isPending || uploading || uploadingCover}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {save.isPending
              ? "جاري الحفظ..."
              : dossier
              ? "حفظ التعديلات"
              : "إضافة الدوسية"}
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

// ─── Add Subject Modal ────────────────────────────────────────────────────────

const PALETTE = [
  "#5A2D82", "#0D9BB5", "#C79A2D", "#2FA84F",
  "#E05252", "#6366F1", "#F59E0B", "#10B981",
];

function AddSubjectModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    grade: "12",
    field: "all",
    color: "#5A2D82",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      customFetch("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess,
    onError: (e: any) => setError(e?.message ?? "خطأ في الحفظ"),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">مادة دراسية جديدة</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              اسم المادة *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="مثال: اللغة العربية"
              autoFocus
            />
          </div>

          {/* Grade + Field */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                الصف الدراسي
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {["7", "8", "9", "10", "11", "12", "توجيهي", "عام"].map(
                  (g) => (
                    <option key={g} value={g} className="bg-[#1a1030]">
                      {g}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                الفرع
              </label>
              <select
                value={form.field}
                onChange={(e) => setForm({ ...form, field: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {[
                  { value: "all", label: "جميع الفروع" },
                  { value: "علمي", label: "علمي" },
                  { value: "أدبي", label: "أدبي" },
                  { value: "صناعي", label: "صناعي" },
                  { value: "زراعي", label: "زراعي" },
                ].map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#1a1030]">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              لون المادة
            </label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1030] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
              style={{ backgroundColor: form.color }}
            >
              {form.name.charAt(0) || "م"}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {form.name || "اسم المادة"}
              </p>
              <p className="text-xs text-muted-foreground">
                الصف {form.grade}
                {form.field !== "all" ? ` • ${form.field}` : ""}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {save.isPending ? "جاري الحفظ..." : "إضافة المادة"}
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
