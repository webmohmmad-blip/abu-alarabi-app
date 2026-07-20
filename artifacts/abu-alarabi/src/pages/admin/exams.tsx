import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useListSubjects } from "@workspace/api-client-react";
import { AdminToast } from "@/components/admin/shared/admin-toast";
import { DeleteDialog } from "@/components/admin/shared/delete-dialog";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { StatsCards } from "@/components/admin/shared/stats-cards";
import { QuestionPanel } from "@/components/admin/assessment/question-builder";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, Search,
  X, Check, Copy, Eye, EyeOff, Archive, PenTool,
  AlertCircle, FileQuestion, Clock, Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exam {
  id: number; title: string; subjectId: number; type: string;
  durationMinutes: number; maxAttempts: number; totalScore: string;
  passingScore: string; instructions: string | null; status: string;
  isAvailable: boolean; questionCount: number; createdAt: string;
}
interface Question {
  id: number; examId: number; text: string; type: string; order: number;
  score: string; imageUrl: string | null; correctAnswer: string | null;
  explanation: string | null;
  choices: { id: number; choiceKey: string; text: string; order: number }[];
}

const QUESTION_TYPES = [
  { value: "mcq", label: "اختيار من متعدد" },
  { value: "true_false", label: "صح وخطأ" },
  { value: "fill_blank", label: "إكمال" },
  { value: "matching", label: "وصل" },
  { value: "ordering", label: "ترتيب" },
  { value: "essay", label: "مقالي" },
];
const EXAM_TYPES = [
  { value: "full", label: "شامل" }, { value: "unit", label: "وحدة" },
  { value: "lesson", label: "درس" }, { value: "ministerial", label: "وزاري" },
  { value: "diagnostic", label: "تشخيصي" },
];

// StatusBadge → imported from @/components/admin/shared/status-badge

// ─── Hooks ────────────────────────────────────────────────────────────────────
const useExams = () => useQuery<Exam[]>({
  queryKey: ["/api/admin/exams-list"],
  queryFn: () => customFetch<{ items: Exam[] }>("/api/exams?limit=200&includeAll=true", { method: "GET" })
    .then(r => r.items ?? (r as any)),
});
const useQuestions = (examId: number | null) => useQuery<Question[]>({
  queryKey: ["/api/admin/exams", examId, "questions"],
  queryFn: () => customFetch<Question[]>(`/api/admin/exams/${examId}/questions`, { method: "GET" }),
  enabled: !!examId,
});

// AdminToast → imported from @/components/admin/shared/admin-toast

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminExams() {
  const qc = useQueryClient();
  const { data: exams, isLoading } = useExams();
  const { data: subjects } = useListSubjects();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Confirmation modal state
  const [confirmDelete, setConfirmDelete] = useState<Exam | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const deleteExam = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean; message: string }>(`/api/admin/exams/${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] });
      setConfirmDelete(null);
      showToast(data?.message ?? "تم حذف الامتحان بنجاح");
    },
    onError: (e: any) => {
      showToast(e?.data?.message ?? e?.message ?? "فشل حذف الامتحان", "error");
    },
  });

  const duplicateExam = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/exams/${id}/duplicate`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status, isAvailable }: { id: number; status: string; isAvailable: boolean }) =>
      customFetch(`/api/admin/exams/${id}`, { method: "PATCH", body: JSON.stringify({ status, isAvailable }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }),
  });

  const filtered = (exams ?? []).filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search && !e.title.includes(search)) return false;
    return true;
  });

  const stats = {
    total: exams?.length ?? 0,
    published: exams?.filter(e => e.status === "published").length ?? 0,
    draft: exams?.filter(e => e.status === "draft").length ?? 0,
    archived: exams?.filter(e => e.status === "archived").length ?? 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <PenTool className="w-6 h-6 text-primary" /> إدارة الامتحانات
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">بناء الامتحانات وإدارة أسئلتها ونشرها</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> امتحان جديد
          </Button>
        </motion.div>

        {/* Stats */}
        <StatsCards stats={[
          { label: "الكل",   value: stats.total,     color: "text-white"      },
          { label: "منشور",  value: stats.published, color: "text-green-400"  },
          { label: "مسودة",  value: stats.draft,     color: "text-white/60"   },
          { label: "مؤرشف", value: stats.archived,  color: "text-orange-400" },
        ]} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الامتحانات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1">
            {[{ v: "all", l: "الكل" }, { v: "draft", l: "مسودة" }, { v: "published", l: "منشور" }, { v: "archived", l: "مؤرشف" }].map(f => (
              <button
                key={f.v}
                onClick={() => setStatusFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === f.v ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Exam List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-white/5 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <FileQuestion className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">{search ? "لا توجد نتائج" : "لا توجد امتحانات بعد"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((exam, i) => {
              const isOpen = expandedId === exam.id;
              const subjectName = (subjects as any[])?.find((s: any) => s.id === exam.subjectId)?.name ?? "";
              const isDeleting = deleteExam.isPending && confirmDelete?.id === exam.id;
              return (
                <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors select-none"
                      onClick={() => setExpandedId(isOpen ? null : exam.id)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <PenTool className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-white truncate">{exam.title}</span>
                          <StatusBadge status={exam.status} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span>{subjectName}</span>
                          <span className="flex items-center gap-1"><FileQuestion className="w-3 h-3" />{exam.questionCount} سؤال</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.durationMinutes} د</span>
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" />{exam.totalScore} علامة</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {exam.status === "draft" && (
                          <button
                            onClick={() => setStatus.mutate({ id: exam.id, status: "published", isAvailable: true })}
                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="نشر"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {exam.status === "published" && (
                          <button
                            onClick={() => setStatus.mutate({ id: exam.id, status: "draft", isAvailable: false })}
                            className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="إلغاء النشر"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        {exam.status !== "archived" && (
                          <button
                            onClick={() => setStatus.mutate({ id: exam.id, status: "archived", isAvailable: false })}
                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors" title="أرشفة"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => duplicateExam.mutate(exam.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors" title="نسخ"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingExam(exam); setShowCreate(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors" title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(exam)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40" title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>

                    {/* Question Builder Panel */}
                    {isOpen && <QuestionPanel assessmentId={exam.id} listQueryKey={["/api/admin/exams-list"]} qc={qc} onToast={showToast} />}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Exam Create/Edit Modal ──────────────────────────────────────────── */}
      {showCreate && (
        <ExamFormModal
          exam={editingExam}
          subjects={subjects as any[] ?? []}
          onClose={() => { setShowCreate(false); setEditingExam(null); }}
          onSuccess={() => { setShowCreate(false); setEditingExam(null); qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }); }}
        />
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      <DeleteDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteExam.mutate(confirmDelete.id)}
        isPending={deleteExam.isPending}
        title="تأكيد الحذف"
        subtitle="هذا الإجراء لا يمكن التراجع عنه"
        prefixText="هل أنت متأكد من حذف الامتحان:"
        itemText={confirmDelete?.title ?? ""}
        confirmText="حذف الامتحان"
      />

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <AdminToast key="toast" message={toast.message} type={toast.type} onDone={() => setToast(null)} />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
// ─── Exam Form Modal ──────────────────────────────────────────────────────────
function ExamFormModal({ exam, subjects, onClose, onSuccess }: {
  exam: Exam | null;
  subjects: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: exam?.title ?? "",
    subjectId: exam?.subjectId ?? subjects[0]?.id ?? 0,
    type: exam?.type ?? "full",
    durationMinutes: exam?.durationMinutes ?? 60,
    maxAttempts: exam?.maxAttempts ?? 3,
    passingScore: exam?.passingScore ?? "50",
    instructions: exam?.instructions ?? "",
    status: exam?.status ?? "draft",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => exam
      ? customFetch(`/api/admin/exams/${exam.id}`, { method: "PATCH", body: JSON.stringify(form) })
      : customFetch("/api/admin/exams", { method: "POST", body: JSON.stringify(form) }),
    onSuccess,
    onError: () => setError("حدث خطأ أثناء الحفظ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{exam ? "تعديل الامتحان" : "امتحان جديد"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">عنوان الامتحان *</label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="أدخل عنوان الامتحان"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">المادة *</label>
            <select
              value={form.subjectId}
              onChange={e => setForm({ ...form, subjectId: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              {subjects.map((s: any) => <option key={s.id} value={s.id} className="bg-[#1a1030]">{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">النوع</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#1a1030]">{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">المدة (دقيقة)</label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={e => setForm({ ...form, durationMinutes: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">درجة النجاح</label>
              <Input
                type="number"
                value={form.passingScore}
                onChange={e => setForm({ ...form, passingScore: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">عدد المحاولات</label>
              <Input
                type="number"
                value={form.maxAttempts}
                onChange={e => setForm({ ...form, maxAttempts: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">تعليمات الامتحان</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
              placeholder="أدخل تعليمات الامتحان..."
            />
          </div>

          {error && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 bg-primary">
              {save.isPending ? "جاري الحفظ..." : exam ? "حفظ التعديلات" : "إنشاء الامتحان"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
