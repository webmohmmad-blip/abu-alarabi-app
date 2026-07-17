import { useState } from "react";
import { useGetStudyPlan, useCompleteStudyTask, useRebuildStudyPlan } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  CalendarDays, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  BookOpen, 
  FileText, 
  PenTool,
  RefreshCcw,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

export default function StudyPlan() {
  const { data: plan, isLoading } = useGetStudyPlan();
  const completeTask = useCompleteStudyTask();
  const rebuildPlan = useRebuildStudyPlan();
  const [isRebuilding, setIsRebuilding] = useState(false);

  const handleRebuild = () => {
    setIsRebuilding(true);
    rebuildPlan.mutate(undefined, {
      onSettled: () => setIsRebuilding(false)
    });
  };

  const getTaskIcon = (type: string) => {
    switch(type) {
      case 'read_dossier': return <BookOpen className="w-5 h-5" />;
      case 'solve_worksheet': return <FileText className="w-5 h-5" />;
      case 'take_exam': return <PenTool className="w-5 h-5" />;
      default: return <PlayCircle className="w-5 h-5" />;
    }
  };

  if (isLoading || !plan) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-3xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-10 w-48" />
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header/Hero */}
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 md:p-8 shadow-xl shadow-primary/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black mb-2">الخطة الدراسية الذكية</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md"><Target className="w-4 h-4"/> الهدف: {plan.goal}</span>
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md"><Clock className="w-4 h-4"/> {plan.availableHoursPerDay} ساعات يومياً</span>
                {plan.streakDays && (
                  <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                    <Sparkles className="w-4 h-4" /> {plan.streakDays} أيام متتالية
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-48 shrink-0">
            <div className="flex justify-between text-sm font-bold mb-1">
              <span>إنجاز الأسبوع</span>
              <span className="text-primary">{plan.weeklyProgress}%</span>
            </div>
            <Progress value={plan.weeklyProgress} className="h-2.5" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Tasks List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">مهام اليوم</h2>
              <span className="text-sm font-bold text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">
                {plan.todayTasks.filter(t => t.status === 'completed').length} من {plan.todayTasks.length} منجزة
              </span>
            </div>

            {plan.todayTasks.length > 0 ? (
              <div className="space-y-4">
                {plan.todayTasks.map((task, idx) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={`overflow-hidden transition-all ${task.status === 'completed' ? 'opacity-60 bg-muted border-dashed' : 'hover:shadow-md border-white/60 bg-white/80 backdrop-blur'}`}>
                      <div className="flex items-stretch h-full">
                        <div className={`w-2 shrink-0 ${task.subjectColor || 'bg-primary'}`}></div>
                        <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: task.subjectColor || 'var(--primary)' }}>
                                {task.subjectName}
                              </span>
                              {task.priority === 'high' && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                  هام جداً
                                </span>
                              )}
                            </div>
                            <h3 className={`font-bold text-lg mt-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {task.durationMinutes} دقيقة</span>
                            </div>
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-2">
                            {task.status !== 'completed' ? (
                              <>
                                <Button variant="outline" size="sm" asChild className="bg-white">
                                  <Link href={`/study-room?taskId=${task.id}`}>
                                    <Clock className="w-4 h-4 mr-1" /> مؤقت
                                  </Link>
                                </Button>
                                <Button size="sm" asChild className="shadow-sm">
                                  <Link href={task.linkedContentId ? `/${task.linkedContentType}s/${task.linkedContentId}` : '#'}>
                                    {getTaskIcon(task.type)} ابدأ
                                  </Link>
                                </Button>
                              </>
                            ) : (
                              <div className="px-4 py-2 bg-success/10 text-success font-bold rounded-xl text-sm flex items-center gap-2 border border-success/20">
                                <CheckCircle2 className="w-5 h-5" /> مكتمل
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/50 rounded-3xl border border-white">
                <CheckCircle2 className="w-16 h-16 text-success/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">يوم راحة أو لا توجد مهام!</h3>
                <p className="text-muted-foreground">استمتع بوقتك أو قم بمراجعة حرة لما سبق.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Recommendation */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-primary">
                  <Sparkles className="w-5 h-5" /> توجيه ذكي
                </h3>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {plan.recommendation || "أداؤك في مادة الفيزياء يحتاج لتحسين طفيف. قمنا بجدولة ورقة عمل إضافية لك غداً في وحدة التفاضل لتقوية نقاط الضعف."}
                </p>
              </CardContent>
            </Card>

            {/* Overdue Alert */}
            {plan.overdueTasks && plan.overdueTasks > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <h4 className="font-bold text-destructive mb-1">مهام متأخرة ({plan.overdueTasks})</h4>
                  <p className="text-xs text-destructive/80">لديك مهام من أيام سابقة لم تنجزها. يرجى إنجازها في وقت الفراغ.</p>
                </div>
              </div>
            )}

            {/* Upcoming Exams */}
            {plan.upcomingExams && plan.upcomingExams.length > 0 && (
              <Card className="border-white/60 bg-white/50 backdrop-blur">
                <CardContent className="p-5">
                  <h3 className="font-bold mb-4">امتحانات قادمة</h3>
                  <div className="space-y-3">
                    {plan.upcomingExams.map((exam, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-black/5 shadow-sm">
                        <div>
                          <div className="font-bold text-sm">{exam.subjectName}</div>
                          <div className="text-xs text-muted-foreground">{new Date(exam.examDate).toLocaleDateString('ar-JO')}</div>
                        </div>
                        <div className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-1 rounded">
                          بعد {exam.daysLeft} أيام
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rebuild Plan */}
            <div className="pt-4 border-t border-black/5">
              <Button 
                variant="outline" 
                className="w-full text-muted-foreground hover:text-foreground gap-2 bg-white"
                onClick={handleRebuild}
                disabled={isRebuilding}
              >
                <RefreshCcw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                إعادة بناء الخطة (تحديث المواعيد)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
