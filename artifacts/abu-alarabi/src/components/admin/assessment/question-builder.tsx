/**
 * Shared assessment question builder.
 * Used by both the Exams admin page (type=EXAM) and
 * the Weekly Quiz admin page (type=WEEKLY_QUIZ).
 *
 * Props:
 *   assessmentId  — the exam/quiz id (quizzes live in the same exams table)
 *   listQueryKey  — the React Query key to invalidate after mutations
 *                   e.g. ["/api/admin/exams-list"] or ["/api/admin/quiz-list"]
 *   qc            — useQueryClient() instance from the calling page
 *   onToast       — callback to show a toast notification
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  Plus, Trash2, GripVertical, FileQuestion, X, AlertCircle,
} from "lucide-react";
import { DeleteDialog } from "@/components/admin/shared/delete-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  examId: number;
  text: string;
  type: string;
  order: number;
  score: string;
  imageUrl: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  choices: { id: number; choiceKey: string; text: string; order: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const QUESTION_TYPES = [
  { value: "mcq",        label: "اختيار من متعدد" },
  { value: "true_false", label: "صح وخطأ"         },
  { value: "fill_blank", label: "إكمال"            },
  { value: "matching",   label: "وصل"              },
  { value: "ordering",   label: "ترتيب"            },
  { value: "essay",      label: "مقالي"            },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useQuestions(assessmentId: number | null) {
  return useQuery<Question[]>({
    queryKey: ["/api/admin/exams", assessmentId, "questions"],
    queryFn: () =>
      customFetch<Question[]>(
        `/api/admin/exams/${assessmentId}/questions`,
        { method: "GET" }
      ),
    enabled: !!assessmentId,
  });
}

// ─── QuestionPanel ────────────────────────────────────────────────────────────

export function QuestionPanel({
  assessmentId,
  listQueryKey,
  qc,
  onToast,
}: {
  assessmentId: number;
  listQueryKey: string[];
  qc: ReturnType<typeof useQueryClient>;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const { data: questions, isLoading } = useQuestions(assessmentId);
  const [addingType,      setAddingType]      = useState<string | null>(null);
  const [confirmDeleteQ,  setConfirmDeleteQ]  = useState<Question | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/exams", assessmentId, "questions"] });
    qc.invalidateQueries({ queryKey: listQueryKey });
  };

  const deleteQ = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(`/api/admin/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setConfirmDeleteQ(null);
      onToast("تم حذف السؤال بنجاح");
    },
    onError: () => onToast("فشل حذف السؤال", "error"),
  });

  return (
    <div className="border-t border-white/10 bg-black/20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <FileQuestion className="w-4 h-4 text-primary" />
          الأسئلة ({questions?.length ?? 0})
        </h3>
        {!addingType && (
          <div className="relative group">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setAddingType("mcq")}
            >
              <Plus className="w-3.5 h-3.5" /> إضافة سؤال
            </Button>
            <div className="absolute left-0 top-full mt-1 w-44 bg-[#1a1030] border border-white/10 rounded-xl shadow-2xl hidden group-hover:block z-20">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setAddingType(t.value)}
                  className="w-full text-right px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Question list */}
      {isLoading ? (
        <Skeleton className="h-16 bg-white/5 rounded-xl" />
      ) : (
        <div className="space-y-2">
          {questions?.map((q, i) => (
            <div
              key={q.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/5 group"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              <span className="text-xs font-bold text-muted-foreground/60 w-5 shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{q.score} علامة</span>
                </div>
                <p className="text-sm text-white/90 line-clamp-1">{q.text}</p>
                {q.correctAnswer && (
                  <p className="text-[10px] text-green-400 mt-0.5">✓ {q.correctAnswer}</p>
                )}
              </div>
              <button
                onClick={() => setConfirmDeleteQ(q)}
                disabled={deleteQ.isPending && confirmDeleteQ?.id === q.id}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {questions?.length === 0 && !addingType && (
            <p className="text-sm text-muted-foreground text-center py-4">
              أضف الأسئلة باستخدام الزر أعلاه.
            </p>
          )}
        </div>
      )}

      {/* Add question form */}
      {addingType && (
        <AddQuestionForm
          assessmentId={assessmentId}
          type={addingType}
          onTypeChange={setAddingType}
          onDone={() => { setAddingType(null); invalidate(); }}
          onCancel={() => setAddingType(null)}
        />
      )}

      {/* Delete question dialog */}
      <DeleteDialog
        open={!!confirmDeleteQ}
        onClose={() => setConfirmDeleteQ(null)}
        onConfirm={() => confirmDeleteQ && deleteQ.mutate(confirmDeleteQ.id)}
        isPending={deleteQ.isPending}
        title="حذف السؤال"
        subtitle="لا يمكن التراجع عن هذا الإجراء"
        itemText={confirmDeleteQ?.text ?? ""}
        confirmText="حذف السؤال"
        zClass="z-[60]"
      />
    </div>
  );
}

// ─── AddQuestionForm ──────────────────────────────────────────────────────────

export function AddQuestionForm({
  assessmentId,
  type,
  onTypeChange,
  onDone,
  onCancel,
}: {
  assessmentId: number;
  type: string;
  onTypeChange: (t: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [text,          setText]          = useState("");
  const [score,         setScore]         = useState("1");
  const [explanation,   setExplanation]   = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [mcqChoices,    setMcqChoices]    = useState(["", "", "", ""]);
  const [mcqCorrect,    setMcqCorrect]    = useState("A");
  const [matchLeft,     setMatchLeft]     = useState(["", "", ""]);
  const [matchRight,    setMatchRight]    = useState(["", "", ""]);
  const [orderItems,    setOrderItems]    = useState(["", "", "", ""]);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const buildChoicesAndAnswer = () => {
    if (type === "mcq") {
      const keys = ["A", "B", "C", "D"];
      return {
        choices: mcqChoices
          .map((t, i) => ({ choiceKey: keys[i], text: t, order: i }))
          .filter((c) => c.text.trim()),
        correctAnswer: mcqCorrect,
      };
    }
    if (type === "true_false") {
      return {
        choices: [
          { choiceKey: "true",  text: "صح",  order: 0 },
          { choiceKey: "false", text: "خطأ", order: 1 },
        ],
        correctAnswer,
      };
    }
    if (type === "matching") {
      const choices = [
        ...matchLeft.map((t, i)  => ({ choiceKey: `L${i + 1}`, text: t, order: i      })),
        ...matchRight.map((t, i) => ({ choiceKey: `R${i + 1}`, text: t, order: i + 10 })),
      ].filter((c) => c.text.trim());
      return {
        choices,
        correctAnswer: matchLeft.map((_, i) => `L${i + 1}:R${i + 1}`).join(","),
      };
    }
    if (type === "ordering") {
      return {
        choices: orderItems
          .map((t, i) => ({ choiceKey: String(i + 1), text: t, order: i }))
          .filter((c) => c.text.trim()),
        correctAnswer: orderItems.map((_, i) => String(i + 1)).join(","),
      };
    }
    return { choices: [], correctAnswer };
  };

  const handleSave = async () => {
    if (!text.trim()) { setError("نص السؤال مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      const { choices, correctAnswer: ca } = buildChoicesAndAnswer();
      await customFetch(`/api/admin/exams/${assessmentId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          text,
          type,
          score: parseFloat(score),
          explanation: explanation || null,
          correctAnswer: ca || null,
          choices,
        }),
      });
      onDone();
    } catch {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white text-sm">إضافة سؤال جديد</h4>
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#1a1030]">
                {t.label}
              </option>
            ))}
          </select>
          <button onClick={onCancel} className="text-muted-foreground hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">نص السؤال *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
          placeholder="اكتب نص السؤال هنا..."
        />
      </div>

      {/* MCQ */}
      {type === "mcq" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">الخيارات (اختر الإجابة الصحيحة)</label>
          {["A", "B", "C", "D"].map((key, i) => (
            <div key={key} className="flex items-center gap-2">
              <button
                onClick={() => setMcqCorrect(key)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                  mcqCorrect === key
                    ? "border-green-400 bg-green-400/10 text-green-400"
                    : "border-white/20 text-muted-foreground hover:border-white/40"
                }`}
              >
                {key}
              </button>
              <input
                value={mcqChoices[i]}
                onChange={(e) => {
                  const c = [...mcqChoices];
                  c[i] = e.target.value;
                  setMcqChoices(c);
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50"
                placeholder={`الخيار ${key}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* True / False */}
      {type === "true_false" && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">الإجابة الصحيحة</label>
          <div className="flex gap-3">
            {[{ v: "true", l: "✓ صح" }, { v: "false", l: "✗ خطأ" }].map((o) => (
              <button
                key={o.v}
                onClick={() => setCorrectAnswer(o.v)}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${
                  correctAnswer === o.v
                    ? "border-green-400 bg-green-400/10 text-green-400"
                    : "border-white/10 text-muted-foreground hover:border-white/30"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill in the blank */}
      {type === "fill_blank" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">الإجابة الصحيحة</label>
          <input
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="الكلمة أو العبارة الصحيحة"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            ضع ___ في نص السؤال لتحديد مكان الفراغ.
          </p>
        </div>
      )}

      {/* Matching */}
      {type === "matching" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">أزواج الوصل (يسار ← يمين)</label>
          {matchLeft.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={matchLeft[i]}
                onChange={(e) => {
                  const a = [...matchLeft];
                  a[i] = e.target.value;
                  setMatchLeft(a);
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`عنصر يسار ${i + 1}`}
              />
              <span className="text-muted-foreground">←</span>
              <input
                value={matchRight[i]}
                onChange={(e) => {
                  const a = [...matchRight];
                  a[i] = e.target.value;
                  setMatchRight(a);
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`عنصر يمين ${i + 1}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Ordering */}
      {type === "ordering" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">العناصر بالترتيب الصحيح</label>
          {orderItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
              <input
                value={item}
                onChange={(e) => {
                  const a = [...orderItems];
                  a[i] = e.target.value;
                  setOrderItems(a);
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`العنصر ${i + 1}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Essay */}
      {type === "essay" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">نموذج الإجابة (للمراجعة)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
            placeholder="اكتب نموذج الإجابة هنا..."
          />
        </div>
      )}

      {/* Score + explanation row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">الدرجة</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            min="0.5"
            step="0.5"
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        {type !== "essay" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">شرح الإجابة (اختياري)</label>
            <input
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              placeholder="توضيح..."
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary flex-1"
        >
          {saving ? "جاري الحفظ..." : "حفظ السؤال"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
}
