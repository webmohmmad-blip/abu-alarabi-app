/**
 * إدارة الكويز الأسبوعي
 * مطابق تماماً لصفحة إدارة الامتحانات — الفرق الوحيد هو النوع (weekly_quiz)
 */
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useListSubjects } from "@workspace/api-client-react";
import {
  Trophy, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Search,
  X, Copy, Eye, EyeOff, Archive, FileQuestion, Clock, Target, AlertCircle,
} from "lucide-react";
import { AdminToast } from "@/components/admin/shared/admin-toast";
import { DeleteDialog } from "@/components/admin/shared/delete-dialog";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { StatsCards } from "@/components/admin/shared/stats-cards";
import { QuestionPanel } from "@/components/admin/assessment/question-builder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quiz {
  id: number;
  title: string;
  subjectId: number;
  type: string;
  durationMinutes: number;
  maxAttempts: number;
  totalScore: string;
  passingScore: string;
  instructions: string | null;
  status: string;
  isAvailable: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

const QUIZ_KEY = ["/api/admin/quiz-list"];

const useQuizzes = () =>
  useQuery<Quiz[]>({
    queryKey: QUIZ_KEY,
    queryFn: () =>
      customFetch<{ items: Quiz[] }>("/api/admin/quiz", { method: "GET" })
        .then((r) => r.items),
  });

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminQuiz() {
  const qc = useQueryClient();
  const { data: quizzes, isLoading } = useQuizzes();
  const { data: subjects } = useListSubjects();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingQuiz,  setEditingQuiz]  = useState<Quiz | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Quiz | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const deleteQuiz = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean; message: string }>(`/api/admin/quiz/${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUIZ_KEY });
      setConfirmDelete(null);
      showToast(data?.message ?? "تم حذف الكويز بنجاح");
    },
    onError: (e: any) => showToast(e?.data?.message ?? e?.message ?? "فشل حذف الكويز", "error"),
  });

  const duplicateQuiz = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/admin/exams/${id}/duplicate`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUIZ_KEY });
      showToast("تم نسخ الكويز بنجاح");
    },
    onError: () => showToast("فشل نسخ الكويز", "error"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status, isAvailable }: { id: number; status: string; isAvailable: boolean }) =>
      customFetch(`/api/admin/exams/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, isAvailable }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUIZ_KEY }),
    onError: () => showToast("فشل تغيير الحالة", "error"),
  });

  // ── Filtering & stats ─────────────────────────────────────────────────────────

  const all = quizzes ?? [];
  const filtered = all.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const sub = (subjects as any[])?.find((s: any) => s.id === q.subjectId)?.name ?? "";
      if (!q.title.includes(search) && !sub.includes(search) && !q.status.includes(search)) return false;
    }
    return true;
  });

  const stats = {
    total:     all.length,
    published: all.filter((q) => q.status === "published").length,
    draft:     all.filter((q) => q.status === "draft").length,
    archived:  all.filter((q) => q.status === "archived").length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
              <Trophy className="w-6 h-6 text-primary" /> إدارة الكويز الأسبوعي
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              إنشاء وإدارة ونشر الكويزات الأسبوعية للطلاب
            </p>
          </div>
          <Button
            onClick={() => { setEditingQuiz(null); setShowCreate(true); }}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> كويز جديد
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
              placeholder="البحث في الكويزات..."
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
                    ? "bg-primary text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Quiz list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-white/5 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search || statusFilter !== "all" ? "لا توجد نتائج" : "لا توجد كويزات بعد"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((quiz, i) => {
              const isOpen = expandedId === quiz.id;
              const subjectName =
                (subjects as any[])?.find((s: any) => s.id === quiz.subjectId)?.name ?? "";
              const isDeleting = deleteQuiz.isPending && confirmDelete?.id === quiz.id;
              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors select-none"
                      onClick={() => setExpandedId(isOpen ? null : quiz.id)}
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-white truncate">{quiz.title}</span>
                          <StatusBadge status={quiz.status} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span>{subjectName}</span>
                          <span className="flex items-center gap-1">
                            <FileQuestion className="w-3 h-3" />{quiz.questionCount} سؤال
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{quiz.durationMinutes} د
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />{quiz.totalScore} علامة
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {quiz.status === "draft" && (
                          <button
                            onClick={() =>
                              setStatus.mutate({ id: quiz.id, status: "published", isAvailable: true })
                            }
                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                            title="نشر"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {quiz.status === "published" && (
                          <button
                            onClick={() =>
                              setStatus.mutate({ id: quiz.id, status: "draft", isAvailable: false })
                            }
                            className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                            title="إلغاء النشر"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        {quiz.status !== "archived" && (
                          <button
                            onClick={() =>
                              setStatus.mutate({ id: quiz.id, status: "archived", isAvailable: false })
                            }
                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors"
                            title="أرشفة"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => duplicateQuiz.mutate(quiz.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingQuiz(quiz); setShowCreate(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(quiz)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>

                    {/* Question Builder Panel */}
                    {isOpen && <QuestionPanel assessmentId={quiz.id} listQueryKey={QUIZ_KEY} qc={qc} onToast={showToast} />}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {showCreate && (
        <QuizFormModal
          quiz={editingQuiz}
          subjects={subjects as any[] ?? []}
          onClose={() => { setShowCreate(false); setEditingQuiz(null); }}
          onSuccess={() => {
            setShowCreate(false);
            setEditingQuiz(null);
            qc.invalidateQueries({ queryKey: QUIZ_KEY });
          }}
        />
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <DeleteDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteQuiz.mutate(confirmDelete.id)}
        isPending={deleteQuiz.isPending}
        title="تأكيد الحذف"
        subtitle="هذا الإجراء لا يمكن التراجع عنه"
        prefixText="هل أنت متأكد من حذف الكويز:"
        itemText={confirmDelete?.title ?? ""}
        confirmText="حذف الكويز"
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
// ─── Quiz Form Modal ──────────────────────────────────────────────────────────

function QuizFormModal({
  quiz, subjects, onClose, onSuccess,
}: {
  quiz: Quiz | null;
  subjects: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title:            quiz?.title            ?? "",
    subjectId:        quiz?.subjectId        ?? (subjects[0]?.id ?? 0),
    durationMinutes:  quiz?.durationMinutes  ?? 20,
    maxAttempts:      quiz?.maxAttempts      ?? 1,
    passingScore:     quiz?.passingScore     ?? "50",
    instructions:     quiz?.instructions     ?? "",
    status:           quiz?.status           ?? "draft",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      quiz
        ? customFetch(`/api/admin/exams/${quiz.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...form, subjectId: parseInt(String(form.subjectId)) }),
          })
        : customFetch("/api/admin/quiz", {
            method: "POST",
            body: JSON.stringify({ ...form, subjectId: parseInt(String(form.subjectId)) }),
          }),
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
          <h2 className="text-xl font-bold text-white">
            {quiz ? "تعديل الكويز" : "كويز جديد"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">عنوان الكويز *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="مثال: كويز الأسبوع الأول — اللغة العربية"
              autoFocus
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">المادة الدراسية *</label>
            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id} className="bg-[#1a1030]">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Duration + Attempts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">المدة (دقيقة)</label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 20 })}
                className="bg-white/5 border-white/10 text-white"
                min="1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">عدد المحاولات</label>
              <Input
                type="number"
                value={form.maxAttempts}
                onChange={(e) => setForm({ ...form, maxAttempts: parseInt(e.target.value) || 1 })}
                className="bg-white/5 border-white/10 text-white"
                min="1"
              />
            </div>
          </div>

          {/* Passing score */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">درجة النجاح</label>
            <Input
              type="number"
              value={form.passingScore}
              onChange={(e) => setForm({ ...form, passingScore: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">تعليمات الكويز</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
              placeholder="أدخل تعليمات الكويز للطلاب..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">حالة النشر</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="draft"     className="bg-[#1a1030]">مسودة</option>
              <option value="published" className="bg-[#1a1030]">منشور</option>
              <option value="archived"  className="bg-[#1a1030]">مؤرشف</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />{error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!form.title.trim()) { setError("العنوان مطلوب"); return; }
                save.mutate();
              }}
              disabled={save.isPending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {save.isPending
                ? "جاري الحفظ..."
                : quiz
                ? "حفظ التعديلات"
                : "إنشاء الكويز"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
