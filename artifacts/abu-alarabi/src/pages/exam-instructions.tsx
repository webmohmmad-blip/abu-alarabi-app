import { useParams, Link, useLocation } from "wouter";
import { useGetExam, useStartExam } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Clock, 
  FileQuestion, 
  Target, 
  ChevronRight, 
  PenTool,
  ShieldAlert,
  HelpCircle,
  RefreshCcw
} from "lucide-react";

export default function ExamInstructions() {
  // Support both /exams/:examId/instructions and /weekly-quiz/:quizId/instructions
  const params = useParams<{ examId?: string; id?: string; quizId?: string }>();
  const rawId = params.examId || params.id || params.quizId || "0";
  const examId = parseInt(rawId, 10);
  const isWeeklyQuiz = !!params.quizId;

  const [, setLocation] = useLocation();
  
  const { data: exam, isLoading } = useGetExam(examId, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: !!examId } as any,
  });

  const startExam = useStartExam();

  const handleStart = () => {
    if (startExam.isPending) return; // prevent double-click
    startExam.mutate(
      { id: examId },
      {
        onSuccess: (data) => {
          if (isWeeklyQuiz) {
            setLocation(`/weekly-quiz/${examId}/attempt/${data.id}`);
          } else {
            setLocation(`/exams/${examId}/attempt/${data.id}`);
          }
        },
        onError: () => {
          // error is surfaced via startExam.isError / startExam.error below
        },
      }
    );
  };

  if (isLoading || !exam) {
    return (
      <DashboardLayout>
        <Skeleton className="w-24 h-8 rounded-lg mb-8" />
        <Card className="max-w-3xl mx-auto border-white/60 shadow-xl">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isMaxAttemptsReached = exam.maxAttempts !== undefined && exam.userAttempts !== undefined && exam.userAttempts >= exam.maxAttempts;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" asChild className="mb-2 -ml-4 hover:bg-transparent">
          <Link href="/exams" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" /> العودة لقائمة الامتحانات
          </Link>
        </Button>

        <Card className="border-white/60 shadow-xl shadow-primary/5 bg-white/70 backdrop-blur-xl overflow-hidden">
          <div className="h-3 w-full bg-gradient-to-r from-primary via-secondary to-accent"></div>
          <CardContent className="p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-sm py-1">
                {exam.subjectName}
              </Badge>
              <Badge variant="secondary" className="text-sm py-1">
                الامتحان {exam.type === 'ministerial' ? 'الوزاري' : 'الشامل'}
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black mb-8">{exam.title}</h1>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm text-muted-foreground mb-1">المدة الزمنية</div>
                <div className="font-bold text-lg">{exam.durationMinutes} دقيقة</div>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                <FileQuestion className="w-6 h-6 mx-auto mb-2 text-secondary" />
                <div className="text-sm text-muted-foreground mb-1">عدد الأسئلة</div>
                <div className="font-bold text-lg">{exam.questionCount}</div>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                <Target className="w-6 h-6 mx-auto mb-2 text-accent" />
                <div className="text-sm text-muted-foreground mb-1">العلامة الكلية</div>
                <div className="font-bold text-lg">{exam.totalScore || 100}</div>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                <RefreshCcw className="w-6 h-6 mx-auto mb-2 text-success" />
                <div className="text-sm text-muted-foreground mb-1">المحاولات</div>
                <div className="font-bold text-lg" dir="ltr">{exam.userAttempts || 0} / {exam.maxAttempts || '∞'}</div>
              </div>
            </div>

            <div className="space-y-6 mb-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" /> تعليمات هامة قبل البدء
              </h3>
              
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-primary-foreground/90 space-y-4">
                <p className="leading-relaxed text-foreground whitespace-pre-wrap">
                  {exam.instructions || "يرجى قراءة الأسئلة بعناية قبل الإجابة. تأكد من استقرار اتصالك بالإنترنت أثناء تقديم الامتحان. لا تقم بتحديث الصفحة أو إغلاق المتصفح حتى لا تفقد تقدمك."}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-xl border border-black/5 bg-white/50">
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold mb-1">التنقل بين الأسئلة</h4>
                    <p className="text-sm text-muted-foreground">
                      {exam.canGoBack 
                        ? "يمكنك العودة للأسئلة السابقة وتعديل إجاباتك قبل التسليم النهائي."
                        : "لا يمكنك العودة للأسئلة السابقة بمجرد الانتقال للسؤال التالي."}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-xl border border-black/5 bg-white/50">
                  <HelpCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold mb-1">تخطي الأسئلة</h4>
                    <p className="text-sm text-muted-foreground">
                      {exam.canSkip 
                        ? "يمكنك تخطي الأسئلة الصعبة والعودة إليها لاحقاً."
                        : "يجب الإجابة على كل سؤال قبل الانتقال للتالي."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-black/5">
              {isMaxAttemptsReached ? (
                <div className="w-full bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-4 text-center font-bold">
                  لقد استنفدت جميع محاولاتك لهذا الامتحان.
                </div>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto px-12 text-lg gap-2"
                    onClick={handleStart}
                    disabled={startExam.isPending}
                  >
                    <PenTool className="w-5 h-5" />
                    {startExam.isPending ? "جارٍ بدء الامتحان..." : "ابدأ الامتحان الآن"}
                  </Button>
                  {startExam.isError && (
                    <p className="text-destructive text-sm font-medium mt-2 text-center">
                      {(startExam.error as any)?.message ?? "الامتحان غير متاح حالياً"}
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
