import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  ChevronLeft,
  Flag,
  Clock,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExamQuestion {
  id: number;
  text: string;
  type: string;
  order: number;
  score: number;
  imageUrl?: string;
  choices: { id: string; text: string; imageUrl?: string }[];
}

interface ExamAttempt {
  id: number;
  examId: number;
  title: string;
  durationMinutes: number;
  questions: ExamQuestion[];
  savedAnswers: Record<number, string>;
}

function useExamAttempt(attemptId: number) {
  return useQuery<ExamAttempt>({
    queryKey: ["/api/exams/attempts", attemptId],
    queryFn: () =>
      customFetch<ExamAttempt>(`/api/exams/attempts/${attemptId}`, { method: "GET" }),
    enabled: !!attemptId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export default function ExamTake() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const attemptId = parseInt(params.get("attemptId") || "0", 10);

  const { data: attempt, isLoading, isError } = useExamAttempt(attemptId);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialise state from attempt data
  useEffect(() => {
    if (attempt) {
      setAnswers(attempt.savedAnswers || {});
      setTimeLeft(attempt.durationMinutes * 60);
    }
  }, [attempt]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft !== null && timeLeft > 0]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = async (choiceId: string) => {
    if (!attempt) return;
    const currentQ = attempt.questions[currentQIndex];
    setAnswers((prev) => ({ ...prev, [currentQ.id]: choiceId }));
    // Save to server async (fire and forget)
    try {
      await customFetch(`/api/exams/attempts/${attempt.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ questionId: currentQ.id, answer: choiceId }),
      });
    } catch {}
  };

  const toggleFlag = () => {
    if (!attempt) return;
    const currentQ = attempt.questions[currentQIndex];
    setFlagged((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleFinalSubmit = useCallback(async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await customFetch<{ id: number }>(`/api/exams/attempts/${attempt.id}/submit`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setLocation(`/exams/results/${attempt.id}`);
    } catch {
      setLocation(`/exams/results/${attempt.id}`);
    }
  }, [attempt, isSubmitting, setLocation]);

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (!attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">معرّف المحاولة مفقود</h2>
          <p className="text-muted-foreground mb-4">يرجى البدء من صفحة الامتحان.</p>
          <Button onClick={() => setLocation("/exams")}>العودة للامتحانات</Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <div className="h-16 bg-white border-b flex items-center px-6">
          <Skeleton className="h-6 w-48" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex-1 flex gap-4 p-8 max-w-4xl mx-auto w-full">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">تعذّر تحميل الامتحان</h2>
          <p className="text-muted-foreground mb-4">يرجى التحقق من اتصالك والمحاولة مجدداً.</p>
          <Button onClick={() => setLocation("/exams")}>العودة للامتحانات</Button>
        </Card>
      </div>
    );
  }

  const questions = attempt.questions;
  const currentQ = questions[currentQIndex];
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowNav(!showNav)} className="md:hidden">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{attempt.title}</h1>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:block w-32">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
              <span>التقدم</span>
              <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {timeLeft !== null && (
            <div
              className={`flex items-center gap-2 font-mono font-bold text-lg px-3 py-1 rounded-lg border ${
                timeLeft < 300
                  ? "text-red-600 bg-red-50 border-red-200 animate-pulse"
                  : "text-primary bg-primary/5 border-primary/20"
              }`}
              dir="ltr"
            >
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}

          <Button variant="default" className="hidden md:flex shadow-none" onClick={() => setShowSubmitConfirm(true)}>
            إنهاء الامتحان
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-bold text-lg">
                سؤال {currentQ.order} من {questions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlag}
                className={`gap-2 ${flagged[currentQ.id] ? "bg-orange-50 text-orange-600 border-orange-200" : ""}`}
              >
                <Flag className={`w-4 h-4 ${flagged[currentQ.id] ? "fill-orange-600" : ""}`} />
                {flagged[currentQ.id] ? "محدد للمراجعة" : "تحديد للمراجعة"}
              </Button>
            </div>

            <Card className="border-gray-200 shadow-sm mb-6 bg-white">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold leading-relaxed mb-8 text-gray-900">
                  {currentQ.text}
                </h2>

                {currentQ.imageUrl && (
                  <img src={currentQ.imageUrl} alt="صورة السؤال" className="w-full max-h-64 object-contain rounded-xl mb-6 border" />
                )}

                <div className="space-y-3">
                  {currentQ.choices?.map((choice) => {
                    const isSelected = answers[currentQ.id] === choice.id;
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleSelectAnswer(choice.id)}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "border-primary" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                        <div className="flex-1 text-right">
                          <span className={`text-lg ${isSelected ? "font-bold" : "font-medium"}`}>
                            {choice.id}. {choice.text}
                          </span>
                          {choice.imageUrl && (
                            <img src={choice.imageUrl} alt="" className="mt-2 max-h-32 object-contain rounded-lg" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
              >
                <ChevronRight className="w-5 h-5" /> السابق
              </Button>

              {!isLastQuestion ? (
                <Button
                  size="lg"
                  className="gap-2 px-8"
                  onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                >
                  التالي <ChevronLeft className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="gap-2 px-8 bg-success hover:bg-success/90 text-white"
                  onClick={() => setShowSubmitConfirm(true)}
                >
                  تسليم الامتحان <CheckCircle2 className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Navigation Sidebar */}
        <aside
          className={`w-72 bg-white border-r border-gray-200 flex flex-col absolute md:relative inset-y-0 right-0 z-30
            transform transition-transform duration-300 ease-in-out
            ${showNav ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
        >
          <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-900">خريطة الأسئلة</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowNav(false)} className="md:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged[q.id];
                const isCurrent = i === currentQIndex;
                let cls =
                  "w-full aspect-square rounded-lg border flex items-center justify-center font-bold text-sm transition-all relative";
                if (isCurrent) cls += " ring-2 ring-primary ring-offset-2 border-primary bg-primary text-white";
                else if (isFlagged) cls += " border-orange-300 bg-orange-50 text-orange-700";
                else if (isAnswered) cls += " border-gray-300 bg-gray-100 text-gray-900";
                else cls += " border-gray-200 bg-white text-gray-500 hover:bg-gray-50";

                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentQIndex(i); if (window.innerWidth < 768) setShowNav(false); }}
                    className={cls}
                  >
                    {q.order}
                    {isFlagged && <div className="absolute w-2 h-2 bg-orange-500 rounded-full top-1 right-1" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" /> مجاب ({answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border border-gray-200" /> غير مجاب ({questions.length - answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-50 border border-orange-300 relative">
                  <div className="absolute w-1.5 h-1.5 bg-orange-500 rounded-full top-0.5 right-0.5" />
                </div>{" "}محدد للمراجعة
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 md:hidden shrink-0">
            <Button className="w-full" onClick={() => setShowSubmitConfirm(true)}>إنهاء الامتحان</Button>
          </div>
        </aside>

        {showNav && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setShowNav(false)} />
        )}
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">تأكيد التسليم</h3>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <ul className="space-y-2 text-sm font-bold text-gray-700">
                  <li className="flex justify-between">
                    <span>إجمالي الأسئلة:</span> <span>{questions.length}</span>
                  </li>
                  <li className="flex justify-between text-success">
                    <span>الأسئلة المجابة:</span> <span>{answeredCount}</span>
                  </li>
                  <li className="flex justify-between text-destructive">
                    <span>غير مجاب:</span> <span>{questions.length - answeredCount}</span>
                  </li>
                </ul>
              </div>

              <p className="text-center text-gray-500 mb-6 text-sm">
                هل أنت متأكد من رغبتك في تسليم الامتحان؟ لن تتمكن من تعديل إجاباتك بعد التسليم.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  عودة للامتحان
                </Button>
                <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="bg-primary">
                  {isSubmitting ? "جاري التسليم..." : "تأكيد التسليم"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
