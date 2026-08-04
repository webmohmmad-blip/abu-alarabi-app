import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { SEO } from "@/components/SEO";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Clock,
  Calendar,
  Lightbulb,
  FileSearch,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";

interface ChoiceReview {
  id: string;
  choiceKey: string;
  text: string;
  imageUrl?: string | null;
  isStudentAnswer: boolean;
  isCorrectAnswer: boolean;
}

interface QuestionReview {
  id: number;
  order: number;
  text: string;
  type: string;
  score: number;
  imageUrl?: string | null;
  explanation?: string | null;
  studentAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  isAnswered: boolean;
  choices: ChoiceReview[];
}

interface AttemptReviewData {
  attempt: {
    id: number;
    examId: number;
    status: string;
    score: number;
    totalScore: number;
    percentage: number;
    passed: boolean;
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    startedAt: string;
    submittedAt: string;
    durationMinutes: number;
  };
  exam: {
    id: number;
    title: string;
    subjectName: string;
    passingScore: number;
    totalScore: number;
  };
  questions: QuestionReview[];
}

function useExamReview(attemptId: number) {
  return useQuery<AttemptReviewData>({
    queryKey: ["/api/exams/attempts", attemptId, "review"],
    queryFn: () =>
      customFetch<AttemptReviewData>(`/api/exams/attempts/${attemptId}/review`, {
        method: "GET",
      }),
    enabled: !!attemptId,
    staleTime: Infinity,
  });
}

type FilterType = "all" | "correct" | "wrong" | "unanswered";

export default function ExamReview() {
  const params = useParams<{ examId?: string; attemptId?: string }>();
  const attemptId = parseInt(params.attemptId || "0", 10);
  const examId = parseInt(params.examId || "0", 10);

  const { data: reviewData, isLoading, isError, error } = useExamReview(attemptId);
  const [filter, setFilter] = useState<FilterType>("all");

  if (!attemptId) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]" dir="rtl">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">معرّف المحاولة مفقود</h2>
            <p className="text-muted-foreground mb-4">يرجى العودة لقائمة الامتحانات.</p>
            <Button asChild>
              <Link href="/exams">العودة للامتحانات</Link>
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !reviewData) {
    const errorMsg =
      (error as { error?: string })?.error ||
      "تعذر تحميل مراجعة الامتحان، حاول مرة أخرى";
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]" dir="rtl">
          <Card className="p-8 text-center max-w-md shadow-lg border-destructive/20">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">خطأ في المراجعة</h2>
            <p className="text-muted-foreground mb-6">{errorMsg}</p>
            <Button asChild>
              <Link href="/exams">العودة للامتحانات</Link>
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { attempt, exam, questions } = reviewData;

  const filteredQuestions = questions.filter((q) => {
    if (filter === "correct") return q.isCorrect;
    if (filter === "wrong") return q.isAnswered && !q.isCorrect;
    if (filter === "unanswered") return !q.isAnswered;
    return true;
  });

  const formattedDate = attempt.submittedAt
    ? new Date(attempt.submittedAt).toLocaleDateString("ar-JO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <DashboardLayout>
      <SEO
        title={`مراجعة: ${exam.title}`}
        description={`مراجعة إجابات امتحان ${exam.title}`}
      />
      <div className="max-w-4xl mx-auto space-y-6 pb-16 overflow-hidden" dir="rtl">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="-mr-3 hover:bg-transparent">
            <Link
              href={`/exams/${examId || attempt.examId}/result/${attempt.id}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium"
            >
              <ChevronRight className="w-5 h-5" />
              العودة للنتيجة
            </Link>
          </Button>

          <Badge variant="outline" className="gap-1 px-3 py-1 text-xs">
            <FileSearch className="w-3.5 h-3.5" />
            وضع المراجعة فقط (القراءة فقط)
          </Badge>
        </div>

        {/* Exam Review Summary Card */}
        <Card className="border-border shadow-md overflow-hidden relative">
          <div
            className={`h-2.5 w-full ${
              attempt.passed ? "bg-green-500" : "bg-destructive"
            }`}
          />
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
              <div>
                <span className="text-xs font-bold text-primary tracking-wider uppercase">
                  {exam.subjectName || "مراجعة الامتحان"}
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-foreground mt-1">
                  {exam.title}
                </h1>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>تاريخ التسليم: {formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>المدة المستغرقة: {attempt.durationMinutes} دقيقة</span>
                  </div>
                </div>
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/50 self-start md:self-auto">
                <div className="text-center">
                  <div className="text-3xl font-black text-foreground">
                    {attempt.score.toFixed(1)}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      / {attempt.totalScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mt-0.5">
                    الدرجة الكلية ({Math.round(attempt.percentage)}%)
                  </div>
                </div>
                <Badge
                  className={`text-sm font-bold px-3 py-1.5 rounded-xl ${
                    attempt.passed
                      ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
                      : "bg-destructive/15 text-destructive border-destructive/30"
                  }`}
                  variant="outline"
                >
                  {attempt.passed ? "ناجح" : "راسب"}
                </Badge>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <div className="text-2xl font-black text-green-600 dark:text-green-400">
                  {attempt.correctCount}
                </div>
                <div className="text-xs font-bold text-muted-foreground">إجابات صحيحة</div>
              </div>

              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <XCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                <div className="text-2xl font-black text-destructive">
                  {attempt.wrongCount}
                </div>
                <div className="text-xs font-bold text-muted-foreground">إجابات خاطئة</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {attempt.unansweredCount}
                </div>
                <div className="text-xs font-bold text-muted-foreground">لم تتم الإجابة</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            <span>تصفية الأسئلة:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="rounded-xl font-bold text-xs"
            >
              جميع الأسئلة ({questions.length})
            </Button>

            <Button
              variant={filter === "correct" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("correct")}
              className="rounded-xl font-bold text-xs gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              الصحيحة ({attempt.correctCount})
            </Button>

            <Button
              variant={filter === "wrong" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("wrong")}
              className="rounded-xl font-bold text-xs gap-1"
            >
              <XCircle className="w-3.5 h-3.5 text-destructive" />
              الخاطئة ({attempt.wrongCount})
            </Button>

            <Button
              variant={filter === "unanswered" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unanswered")}
              className="rounded-xl font-bold text-xs gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              غير المجابة ({attempt.unansweredCount})
            </Button>
          </div>
        </div>

        {/* Questions List (Strict Read-Only) */}
        <div className="space-y-6">
          {filteredQuestions.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-muted-foreground font-bold">
                لا توجد أسئلة تطابق التصفية المحددة.
              </p>
            </Card>
          ) : (
            filteredQuestions.map((q) => {
              // Determine Question Card Border Accent
              let cardBorderClass = "border-border";
              if (q.isCorrect) {
                cardBorderClass = "border-green-500/40 bg-green-500/[0.02]";
              } else if (q.isAnswered && !q.isCorrect) {
                cardBorderClass = "border-destructive/40 bg-destructive/[0.02]";
              } else if (!q.isAnswered) {
                cardBorderClass = "border-amber-500/40 bg-amber-500/[0.02]";
              }

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`border ${cardBorderClass} shadow-md rounded-2xl overflow-hidden`}>
                    <CardContent className="p-6 md:p-8 space-y-6">
                      {/* Question Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                            {q.order}
                          </span>
                          <span className="font-bold text-foreground text-sm md:text-base">
                            السؤال رقم {q.order}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {q.isCorrect && (
                            <Badge variant="outline" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 gap-1.5 px-3 py-1 font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              إجابتك صحيحة
                            </Badge>
                          )}

                          {q.isAnswered && !q.isCorrect && (
                            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 gap-1.5 px-3 py-1 font-bold text-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              إجابتك خاطئة
                            </Badge>
                          )}

                          {!q.isAnswered && (
                            <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 px-3 py-1 font-bold text-xs">
                              <AlertCircle className="w-3.5 h-3.5" />
                              لم تتم الإجابة
                            </Badge>
                          )}

                          <Badge variant="secondary" className="font-bold text-xs">
                            {q.score} {q.score === 1 ? "درجة" : "درجات"}
                          </Badge>
                        </div>
                      </div>

                      {/* Question Text & Image */}
                      <div className="space-y-4">
                        <p className="text-base md:text-lg font-bold text-foreground leading-relaxed whitespace-pre-line">
                          {q.text}
                        </p>

                        {q.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-border bg-muted/20 max-w-xl">
                            <img
                              src={q.imageUrl}
                              alt={`صورة السؤال ${q.order}`}
                              className="w-full h-auto object-contain max-h-80"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>

                      {/* Read-Only Answer Choices */}
                      <div className="space-y-3 pt-2">
                        <div className="text-xs font-bold text-muted-foreground mb-2">
                          الخيارات والإجابة:
                        </div>

                        {q.choices.map((choice) => {
                          let choiceBoxClass =
                            "border-border bg-card text-foreground opacity-80";
                          let badgeText = null;
                          let badgeClass = "";
                          let IconComponent = null;

                          if (choice.isStudentAnswer && choice.isCorrectAnswer) {
                            // Student selected the correct answer
                            choiceBoxClass =
                              "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300 font-bold shadow-sm";
                            badgeText = "إجابتك (صحيحة)";
                            badgeClass = "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/40";
                            IconComponent = CheckCircle2;
                          } else if (choice.isStudentAnswer && !choice.isCorrectAnswer) {
                            // Student selected a wrong answer
                            choiceBoxClass =
                              "border-destructive bg-destructive/10 text-destructive font-bold shadow-sm";
                            badgeText = "إجابتك (خاطئة)";
                            badgeClass = "bg-destructive/20 text-destructive border-destructive/40";
                            IconComponent = XCircle;
                          } else if (!choice.isStudentAnswer && choice.isCorrectAnswer) {
                            // The actual correct answer when student got it wrong or didn't answer
                            choiceBoxClass =
                              "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300 font-bold shadow-sm";
                            badgeText = "الإجابة الصحيحة";
                            badgeClass = "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/40";
                            IconComponent = CheckCircle2;
                          }

                          return (
                            <div
                              key={choice.id}
                              className={`flex items-center justify-between p-4 rounded-xl border min-h-[48px] transition-all pointer-events-none select-none ${choiceBoxClass}`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
                                <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-black shrink-0 border border-border">
                                  {choice.choiceKey}
                                </span>

                                <span className="text-sm md:text-base leading-snug break-words">
                                  {choice.text}
                                </span>
                              </div>

                              {badgeText && (
                                <Badge variant="outline" className={`shrink-0 gap-1.5 px-3 py-1 font-bold text-xs ${badgeClass}`}>
                                  {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                                  {badgeText}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Question Explanation Box */}
                      {q.explanation && (
                        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 text-primary-foreground space-y-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-primary">
                            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>الشرح والتوضيح:</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed pr-6 whitespace-pre-line">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-center pt-6">
          <Button asChild size="lg" variant="outline" className="gap-2 font-bold px-8">
            <Link href={`/exams/${examId || attempt.examId}/result/${attempt.id}`}>
              <ChevronRight className="w-5 h-5" />
              العودة ملخص النتيجة
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
