import { SEO } from "@/components/SEO";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Target, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, BarChart3
} from "lucide-react";
import { motion } from "framer-motion";

interface AttemptResult {
  id: number;
  examId: number;
  examTitle: string;
  subjectName: string;
  score: number;
  totalScore: number;
  percentage: number;
  passed: boolean;
  timeTakenMinutes: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  rank: number | null;
  completedAt: string | null;
}

function useAttemptResult(attemptId: number) {
  return useQuery<AttemptResult>({
    queryKey: ["/api/exams/attempts", attemptId, "result"],
    queryFn: () =>
      customFetch<AttemptResult>(`/api/exams/attempts/${attemptId}/result`, {
        method: "GET",
      }),
    enabled: !!attemptId,
    staleTime: Infinity,
  });
}

export default function ExamResult() {
  const [location] = useLocation();
  const params = useParams<{
    examId?: string;
    quizId?: string;
    attemptId?: string;
  }>();
  const isWeeklyQuiz = location.startsWith("/weekly-quiz/");
  const attemptId = parseInt(params.attemptId || "0", 10);

  const { data: result, isLoading, isError } = useAttemptResult(attemptId);

  // SVG circle calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((result?.percentage ?? 0) / 100) * circumference;

  if (!attemptId) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]" dir="rtl">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">معرّف المحاولة مفقود</h2>
            <p className="text-muted-foreground mb-4">يرجى العودة لقائمة الامتحانات.</p>
            <Button asChild><Link href="/exams">العودة للامتحانات</Link></Button>
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
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !result) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]" dir="rtl">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">تعذّر تحميل النتيجة</h2>
            <p className="text-muted-foreground mb-4">يرجى المحاولة مرة أخرى.</p>
            <Button asChild><Link href={isWeeklyQuiz ? "/weekly-quiz" : "/exams"}>العودة</Link></Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const backPath = isWeeklyQuiz ? "/weekly-quiz" : "/exams";
  const backLabel = isWeeklyQuiz ? "العودة للكويز الأسبوعي" : "العودة لقائمة الامتحانات";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
        <Button variant="ghost" asChild className="mb-2 -ml-4 hover:bg-transparent">
          <Link href={backPath} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" /> {backLabel}
          </Link>
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Result Hero Card */}
          <Card className="md:col-span-3 border-white/60 shadow-xl overflow-hidden relative">
            <div
              className={`absolute top-0 left-0 w-full h-3 ${result.passed ? "bg-green-500" : "bg-destructive"}`}
            />
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                {/* Score circle */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative flex-shrink-0"
                >
                  <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
                    <motion.circle
                      cx="80" cy="80" r={radius} fill="none"
                      stroke={result.passed ? "#22c55e" : "#ef4444"}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-foreground">
                      {Math.round(result.percentage)}%
                    </span>
                    <span className={`text-sm font-bold mt-1 ${result.passed ? "text-green-500" : "text-destructive"}`}>
                      {result.passed ? "ناجح" : "راسب"}
                    </span>
                  </div>
                </motion.div>

                {/* Exam info */}
                <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                    {result.passed
                      ? <Trophy className="w-6 h-6 text-amber-400" />
                      : <Target className="w-6 h-6 text-muted-foreground" />
                    }
                    <h1 className="text-2xl font-black text-foreground">{result.examTitle}</h1>
                  </div>
                  {result.subjectName && (
                    <p className="text-muted-foreground mb-4">{result.subjectName}</p>
                  )}
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="w-4 h-4" />
                      <span>
                        {result.score.toFixed(1)} / {result.totalScore.toFixed(1)} درجة
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{result.timeTakenMinutes} دقيقة</span>
                    </div>
                    {result.rank && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="w-4 h-4" />
                        <span>المركز {result.rank}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats cards */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-green-500">{result.correctCount}</p>
                <p className="text-sm text-muted-foreground mt-1">إجابات صحيحة</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 text-center">
                <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-3xl font-black text-destructive">{result.wrongCount}</p>
                <p className="text-sm text-muted-foreground mt-1">إجابات خاطئة</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-amber-500">{result.unansweredCount}</p>
                <p className="text-sm text-muted-foreground mt-1">لم تُجب عليها</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button asChild size="lg">
            <Link href={backPath}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
