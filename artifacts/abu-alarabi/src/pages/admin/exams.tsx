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
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, Search,
  X, Check, Copy, Eye, EyeOff, Archive, PenTool, GripVertical,
  CheckCircle2, AlertCircle, BookOpen, FileQuestion, Clock, Target,
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

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    published: "bg-green-500/10 text-green-400 border-green-500/20",
    draft: "bg-white/10 text-white/60 border-white/10",
    archived: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    hidden: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const labels: Record<string, string> = { published: "منشور", draft: "مسودة", archived: "مؤرشف", hidden: "مخفي" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[s] ?? "bg-white/10 text-white/60 border-white/10"}`}>{labels[s] ?? s}</span>;
};

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

  const deleteExam = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/exams/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }),
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

  const stats = { total: exams?.length ?? 0, published: exams?.filter(e => e.status === "published").length ?? 0, draft: exams?.filter(e => e.status === "draft").length ?? 0, archived: exams?.filter(e => e.status === "archived").length ?? 0 };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><PenTool className="w-6 h-6 text-primary" /> إدارة الامتحانات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">بناء الامتحانات وإدارة أسئلتها ونشرها</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> امتحان جديد
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ label: "الكل", value: stats.total, color: "text-white" },
            { label: "منشور", value: stats.published, color: "text-green-400" },
            { label: "مسودة", value: stats.draft, color: "text-white/60" },
            { label: "مؤرشف", value: stats.archived, color: "text-orange-400" }].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="البحث في الامتحانات..." value={search} onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-1">
            {[{ v: "all", l: "الكل" }, { v: "draft", l: "مسودة" }, { v: "published", l: "منشور" }, { v: "archived", l: "مؤرشف" }].map(f => (
              <button key={f.v} onClick={() => setStatusFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === f.v ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
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
              return (
                <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors select-none"
                      onClick={() => setExpandedId(isOpen ? null : exam.id)}>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <PenTool className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-white truncate">{exam.title}</span>
                          {statusBadge(exam.status)}
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
                          <button onClick={() => setStatus.mutate({ id: exam.id, status: "published", isAvailable: true })}
                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="نشر">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {exam.status === "published" && (
                          <button onClick={() => setStatus.mutate({ id: exam.id, status: "draft", isAvailable: false })}
                            className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="إلغاء النشر">
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        {exam.status !== "archived" && (
                          <button onClick={() => setStatus.mutate({ id: exam.id, status: "archived", isAvailable: false })}
                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors" title="أرشفة">
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => duplicateExam.mutate(exam.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors" title="نسخ">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingExam(exam); setShowCreate(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`حذف "${exam.title}"؟`)) deleteExam.mutate(exam.id); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>

                    {/* Question Builder Panel */}
                    {isOpen && <QuestionPanel examId={exam.id} qc={qc} />}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <ExamFormModal
          exam={editingExam}
          subjects={subjects as any[] ?? []}
          onClose={() => { setShowCreate(false); setEditingExam(null); }}
          onSuccess={() => { setShowCreate(false); setEditingExam(null); qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }); }}
        />
      )}
    </AdminLayout>
  );
}

// ─── Question Panel ────────────────────────────────────────────────────────────
function QuestionPanel({ examId, qc }: { examId: number; qc: ReturnType<typeof useQueryClient> }) {
  const { data: questions, isLoading } = useQuestions(examId);
  const [addingType, setAddingType] = useState<string | null>(null);

  const deleteQ = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/exams", examId, "questions"] }); qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }); },
  });

  return (
    <div className="border-t border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><FileQuestion className="w-4 h-4 text-primary" /> الأسئلة ({questions?.length ?? 0})</h3>
        <div className="flex gap-1">
          {!addingType && (
            <div className="relative group">
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => setAddingType("mcq")}>
                <Plus className="w-3.5 h-3.5" /> إضافة سؤال
              </Button>
              <div className="absolute left-0 top-full mt-1 w-44 bg-[#1a1030] border border-white/10 rounded-xl shadow-2xl hidden group-hover:block z-20">
                {QUESTION_TYPES.map(t => (
                  <button key={t.value} onClick={() => setAddingType(t.value)}
                    className="w-full text-right px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? <Skeleton className="h-16 bg-white/5 rounded-xl" /> : (
        <div className="space-y-2">
          {questions?.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/5 group">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              <span className="text-xs font-bold text-muted-foreground/60 w-5 shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    {QUESTION_TYPES.find(t => t.value === q.type)?.label ?? q.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{q.score} علامة</span>
                </div>
                <p className="text-sm text-white/90 line-clamp-1">{q.text}</p>
                {q.correctAnswer && <p className="text-[10px] text-green-400 mt-0.5">✓ {q.correctAnswer}</p>}
              </div>
              <button onClick={() => { if (confirm("حذف السؤال؟")) deleteQ.mutate(q.id); }}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {questions?.length === 0 && !addingType && (
            <p className="text-sm text-muted-foreground text-center py-4">أضف أسئلتك باستخدام الزر أعلاه.</p>
          )}
        </div>
      )}

      {addingType && (
        <AddQuestionForm
          examId={examId}
          type={addingType}
          onTypeChange={setAddingType}
          onDone={() => { setAddingType(null); qc.invalidateQueries({ queryKey: ["/api/admin/exams", examId, "questions"] }); qc.invalidateQueries({ queryKey: ["/api/admin/exams-list"] }); }}
          onCancel={() => setAddingType(null)}
        />
      )}
    </div>
  );
}

// ─── Add Question Form ─────────────────────────────────────────────────────────
function AddQuestionForm({ examId, type, onTypeChange, onDone, onCancel }: {
  examId: number; type: string; onTypeChange: (t: string) => void; onDone: () => void; onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [score, setScore] = useState("1");
  const [explanation, setExplanation] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [mcqChoices, setMcqChoices] = useState(["", "", "", ""]);
  const [mcqCorrect, setMcqCorrect] = useState("A");
  const [matchLeft, setMatchLeft] = useState(["", "", ""]);
  const [matchRight, setMatchRight] = useState(["", "", ""]);
  const [orderItems, setOrderItems] = useState(["", "", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const buildChoicesAndAnswer = () => {
    if (type === "mcq") {
      const keys = ["A", "B", "C", "D"];
      return {
        choices: mcqChoices.map((t, i) => ({ choiceKey: keys[i], text: t, order: i })).filter(c => c.text.trim()),
        correctAnswer: mcqCorrect,
      };
    }
    if (type === "true_false") {
      return {
        choices: [{ choiceKey: "true", text: "صح", order: 0 }, { choiceKey: "false", text: "خطأ", order: 1 }],
        correctAnswer,
      };
    }
    if (type === "matching") {
      const choices = [
        ...matchLeft.map((t, i) => ({ choiceKey: `L${i + 1}`, text: t, order: i })),
        ...matchRight.map((t, i) => ({ choiceKey: `R${i + 1}`, text: t, order: i + 10 })),
      ].filter(c => c.text.trim());
      return { choices, correctAnswer: matchLeft.map((_, i) => `L${i + 1}:R${i + 1}`).join(",") };
    }
    if (type === "ordering") {
      return {
        choices: orderItems.map((t, i) => ({ choiceKey: String(i + 1), text: t, order: i })).filter(c => c.text.trim()),
        correctAnswer: orderItems.map((_, i) => String(i + 1)).join(","),
      };
    }
    return { choices: [], correctAnswer };
  };

  const handleSave = async () => {
    if (!text.trim()) { setError("نص السؤال مطلوب"); return; }
    setSaving(true); setError("");
    try {
      const { choices, correctAnswer: ca } = buildChoicesAndAnswer();
      await customFetch(`/api/admin/exams/${examId}/questions`, {
        method: "POST",
        body: JSON.stringify({ text, type, score: parseFloat(score), explanation: explanation || null, correctAnswer: ca || null, choices }),
      });
      onDone();
    } catch { setError("حدث خطأ أثناء الحفظ"); } finally { setSaving(false); }
  };

  return (
    <div className="mt-4 bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white text-sm">إضافة سؤال جديد</h4>
        <div className="flex items-center gap-2">
          <select value={type} onChange={e => onTypeChange(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1">
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#1a1030]">{t.label}</option>)}
          </select>
          <button onClick={onCancel} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">نص السؤال *</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
          placeholder="اكتب نص السؤال هنا..." />
      </div>

      {/* Type-specific inputs */}
      {type === "mcq" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">الخيارات (اختر الإجابة الصحيحة)</label>
          {["A", "B", "C", "D"].map((key, i) => (
            <div key={key} className="flex items-center gap-2">
              <button onClick={() => setMcqCorrect(key)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 transition-colors ${mcqCorrect === key ? "border-green-400 bg-green-400/10 text-green-400" : "border-white/20 text-muted-foreground hover:border-white/40"}`}>
                {key}
              </button>
              <input value={mcqChoices[i]} onChange={e => { const c = [...mcqChoices]; c[i] = e.target.value; setMcqChoices(c); }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50"
                placeholder={`الخيار ${key}`} />
            </div>
          ))}
        </div>
      )}

      {type === "true_false" && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">الإجابة الصحيحة</label>
          <div className="flex gap-3">
            {[{ v: "true", l: "✓ صح" }, { v: "false", l: "✗ خطأ" }].map(o => (
              <button key={o.v} onClick={() => setCorrectAnswer(o.v)}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${correctAnswer === o.v ? "border-green-400 bg-green-400/10 text-green-400" : "border-white/10 text-muted-foreground hover:border-white/30"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "fill_blank" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">الإجابة الصحيحة</label>
          <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="الكلمة أو العبارة الصحيحة" />
          <p className="text-[11px] text-muted-foreground mt-1">ضع ___ في نص السؤال لتحديد مكان الفراغ.</p>
        </div>
      )}

      {type === "matching" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">أزواج الوصل (يسار → يمين)</label>
          {matchLeft.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={matchLeft[i]} onChange={e => { const a = [...matchLeft]; a[i] = e.target.value; setMatchLeft(a); }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`عنصر يسار ${i + 1}`} />
              <span className="text-muted-foreground">←</span>
              <input value={matchRight[i]} onChange={e => { const a = [...matchRight]; a[i] = e.target.value; setMatchRight(a); }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`عنصر يمين ${i + 1}`} />
            </div>
          ))}
        </div>
      )}

      {type === "ordering" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">العناصر بالترتيب الصحيح</label>
          {orderItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
              <input value={item} onChange={e => { const a = [...orderItems]; a[i] = e.target.value; setOrderItems(a); }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`العنصر ${i + 1}`} />
            </div>
          ))}
        </div>
      )}

      {type === "essay" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">نموذج الإجابة (للمراجعة)</label>
          <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
            placeholder="اكتب نموذج الإجابة هنا..." />
        </div>
      )}

      {/* Score + Explanation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">الدرجة</label>
          <input type="number" value={score} onChange={e => setScore(e.target.value)} min="0.5" step="0.5"
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        </div>
        {type !== "essay" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">شرح الإجابة (اختياري)</label>
            <input value={explanation} onChange={e => setExplanation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              placeholder="توضيح..." />
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary flex-1">
          {saving ? "جاري الحفظ..." : "حفظ السؤال"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
      </div>
    </div>
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
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{exam ? "تعديل الامتحان" : "امتحان جديد"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="text-sm text-muted-foreground mb-1 block">عنوان الامتحان *</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="مثال: امتحان وزاري 2024" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm text-muted-foreground mb-1 block">المادة</label>
              <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                {subjects.map((s: any) => <option key={s.id} value={s.id} className="bg-[#1a1030]">{s.name}</option>)}
              </select></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">النوع</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#1a1030]">{t.label}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-sm text-muted-foreground mb-1 block">المدة (دقيقة)</label>
              <Input type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">المحاولات</label>
              <Input type="number" value={form.maxAttempts} onChange={e => setForm({ ...form, maxAttempts: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">درجة النجاح %</label>
              <Input type="number" value={form.passingScore} onChange={e => setForm({ ...form, passingScore: e.target.value })}
                className="bg-white/5 border-white/10 text-white" /></div>
          </div>
          <div><label className="text-sm text-muted-foreground mb-1 block">الحالة</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
              {[{ v: "draft", l: "مسودة" }, { v: "published", l: "منشور" }, { v: "archived", l: "مؤرشف" }].map(o => (
                <option key={o.v} value={o.v} className="bg-[#1a1030]">{o.l}</option>
              ))}
            </select></div>
          <div><label className="text-sm text-muted-foreground mb-1 block">التعليمات (اختياري)</label>
            <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
              placeholder="تعليمات تظهر للطالب قبل بدء الامتحان..." /></div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending} className="flex-1 bg-primary">
            {save.isPending ? "جاري الحفظ..." : exam ? "تحديث" : "إنشاء الامتحان"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
