/**
 * صفحة إدارة الكويز الأسبوعي
 * الأستاذ ينشئ الكويز ويربطه بامتحان موجود ويحدد الجوائز والتواريخ
 */
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useListSubjects } from "@workspace/api-client-react";
import {
  Trophy, Plus, Trash2, Pencil, X, Clock, Calendar,
  Gift, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WeeklyQuiz {
  id: number;
  title: string;
  description: string | null;
  subjectId: number;
  subjectName: string | null;
  examId: number | null;
  startsAt: string;
  endsAt: string;
  prizes: string | null;
  isActive: boolean;
  createdAt: string;
}
interface Exam { id: number; title: string; subjectId: number; questionCount: number; }

const useQuizzes = () => useQuery<{ items: WeeklyQuiz[] }>({
  queryKey: ["/api/admin/quiz"],
  queryFn: () => customFetch("/api/admin/quiz"),
});
const useExams = () => useQuery<{ items: Exam[] }>({
  queryKey: ["/api/admin/exams-list"],
  queryFn: () => customFetch("/api/exams?limit=200&includeAll=true"),
});

const toLocalInput = (iso: string) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
const isLive = (q: WeeklyQuiz) => {
  const now = Date.now();
  return new Date(q.startsAt).getTime() <= now && new Date(q.endsAt).getTime() >= now;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminQuiz() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuizzes();
  const { data: examsData } = useExams();
  const { data: subjects } = useListSubjects();
  const quizzes = data?.items ?? [];
  const exams = examsData?.items ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WeeklyQuiz | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/quiz/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/quiz"] }),
  });
  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      customFetch(`/api/admin/quiz/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/quiz"] }),
  });

  const stats = {
    total: quizzes.length,
    live: quizzes.filter(isLive).length,
    active: quizzes.filter(q => q.isActive).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-accent" /> الكويز الأسبوعي
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">إنشاء وجدولة الكويزات الأسبوعية مع الجوائز</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-primary gap-2">
            <Plus className="w-4 h-4" /> كويز جديد
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "الكل", value: stats.total, color: "text-white" },
            { label: "مباشر الآن", value: stats.live, color: "text-green-400" },
            { label: "مفعّل", value: stats.active, color: "text-accent" },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-2xl" />)}</div>
        ) : quizzes.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">لا يوجد كويز بعد — أنشئ أول كويز أسبوعي</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((q, i) => {
              const live = isLive(q);
              const exam = exams.find(e => e.id === q.examId);
              const prizes = q.prizes ? JSON.parse(q.prizes) : [];
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={`border overflow-hidden ${live ? "border-green-500/30 bg-green-500/5" : "bg-white/5 border-white/10"}`}>
                    <div className="p-4 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${live ? "bg-green-500/20" : "bg-accent/10"}`}>
                        <Trophy className={`w-5 h-5 ${live ? "text-green-400" : "text-accent"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white truncate">{q.title}</span>
                          {live && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">🔴 مباشر</span>}
                          {!q.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">متوقف</span>}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {q.subjectName && <div>{q.subjectName}</div>}
                          {exam && <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />الامتحان: {exam.title} ({exam.questionCount} س)</div>}
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(q.startsAt).toLocaleDateString("ar-JO")}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />حتى {new Date(q.endsAt).toLocaleDateString("ar-JO")}</span>
                          </div>
                          {prizes.length > 0 && (
                            <div className="flex items-center gap-1 text-amber-400">
                              <Gift className="w-3 h-3" />
                              {prizes.map((p: any) => p.description).join(" • ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleActive.mutate({ id: q.id, isActive: !q.isActive })}
                          className={`p-1.5 rounded-lg transition-colors ${q.isActive ? "text-green-400 hover:bg-green-500/10" : "text-white/30 hover:bg-white/10"}`}
                          title={q.isActive ? "إيقاف" : "تفعيل"}>
                          {q.isActive ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setEditing(q); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`حذف "${q.title}"؟`)) del.mutate(q.id); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <QuizFormModal
          quiz={editing}
          subjects={subjects as any[] ?? []}
          exams={exams}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ["/api/admin/quiz"] }); }}
        />
      )}
    </AdminLayout>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function QuizFormModal({ quiz, subjects, exams, onClose, onSuccess }: {
  quiz: WeeklyQuiz | null;
  subjects: any[];
  exams: Exam[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const [form, setForm] = useState({
    title: quiz?.title ?? "",
    description: quiz?.description ?? "",
    subjectId: quiz?.subjectId ?? subjects[0]?.id ?? 0,
    examId: quiz?.examId ?? "",
    startsAt: quiz ? toLocalInput(quiz.startsAt) : now.toISOString().slice(0, 16),
    endsAt: quiz ? toLocalInput(quiz.endsAt) : nextWeek.toISOString().slice(0, 16),
    isActive: quiz?.isActive ?? true,
  });
  // Prizes: up to 3 ranks
  const initPrizes = quiz?.prizes ? JSON.parse(quiz.prizes) : [
    { rank: 1, description: "" },
    { rank: 2, description: "" },
    { rank: 3, description: "" },
  ];
  const [prizes, setPrizes] = useState<{ rank: number; description: string }[]>(initPrizes);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        subjectId: parseInt(String(form.subjectId)),
        examId: form.examId ? parseInt(String(form.examId)) : null,
        prizes: JSON.stringify(prizes.filter(p => p.description.trim())),
      };
      return quiz
        ? customFetch(`/api/admin/quiz/${quiz.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : customFetch("/api/admin/quiz", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess,
    onError: () => setError("حدث خطأ أثناء الحفظ"),
  });

  const filteredExams = exams.filter(e => !form.subjectId || e.subjectId === parseInt(String(form.subjectId)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{quiz ? "تعديل الكويز" : "كويز أسبوعي جديد"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">عنوان الكويز *</label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="مثال: كويز الأسبوع الأول — اللغة العربية" />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">الوصف (اختياري)</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
            placeholder="وصف قصير يظهر للطلاب..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">المادة</label>
            <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: parseInt(e.target.value), examId: "" })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
              {subjects.map((s: any) => <option key={s.id} value={s.id} className="bg-[#1a1030]">{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">الامتحان المرتبط</label>
            <select value={form.examId} onChange={e => setForm({ ...form, examId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
              <option value="" className="bg-[#1a1030]">— اختر امتحان —</option>
              {filteredExams.map(e => <option key={e.id} value={e.id} className="bg-[#1a1030]">{e.title} ({e.questionCount}س)</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">تاريخ البداية</label>
            <Input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })}
              className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">تاريخ الانتهاء</label>
            <Input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })}
              className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>

        {/* Prizes */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
            <Gift className="w-3.5 h-3.5" /> الجوائز (اختياري)
          </label>
          <div className="space-y-2">
            {prizes.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-xs font-black w-6 text-center ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-orange-400"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </span>
                <input value={p.description} onChange={e => { const np = [...prizes]; np[i] = { ...np[i], description: e.target.value }; setPrizes(np); }}
                  className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50"
                  placeholder={`جائزة المركز ${i === 0 ? "الأول" : i === 1 ? "الثاني" : "الثالث"}...`} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
            className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-white/20"} relative`}>
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.isActive ? "right-1" : "left-1"}`} />
          </button>
          <span className="text-sm text-muted-foreground">الكويز مفعّل ويظهر للطلاب</span>
        </div>

        {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button onClick={() => { if (!form.title.trim()) { setError("العنوان مطلوب"); return; } save.mutate(); }}
            disabled={save.isPending} className="flex-1 bg-primary">
            {save.isPending ? "جاري الحفظ..." : quiz ? "تحديث" : "إنشاء الكويز"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
