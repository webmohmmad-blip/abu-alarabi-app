import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useGetDashboard } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Flame, 
  Target, 
  BookOpen, 
  ChevronLeft, 
  PlayCircle,
  FileText,
  PenTool,
  Clock,
  Calendar,
  CheckCircle2,
  Trophy
} from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard({ query: { enabled: true } });

  if (isLoading || !dashboard) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-10 w-48" />
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Greeting Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-primary to-primary/80 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-primary/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 text-white/80 font-medium">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-3">{dashboard.greeting}</h1>
              <p className="text-lg text-white/90 max-w-lg">
                جاهز لتحقيق أهدافك اليوم؟ أكمل مهامك لزيادة سلسلة أيام دراستك.
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center min-w-[120px] border border-white/20">
                <div className="flex items-center justify-center gap-2 text-white/80 font-bold text-sm mb-1">
                  <Flame className="w-4 h-4 text-orange-400" /> سلسلة الأيام
                </div>
                <div className="text-3xl font-black tabular-nums">{dashboard.streakDays}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center min-w-[120px] border border-white/20">
                <div className="flex items-center justify-center gap-2 text-white/80 font-bold text-sm mb-1">
                  <Target className="w-4 h-4 text-green-400" /> هدف اليوم
                </div>
                <div className="text-3xl font-black tabular-nums">
                  {Math.round((dashboard.todayDoneMinutes / dashboard.todayGoalMinutes) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Today's Tasks */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" /> مهام اليوم
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/study-plan">خطة الأسبوع <ChevronLeft className="w-4 h-4" /></Link>
              </Button>
            </div>

            {dashboard.todayTasks?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.todayTasks.map((task, idx) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={`overflow-hidden transition-all hover:shadow-md ${task.status === 'completed' ? 'opacity-60 bg-muted' : ''}`}>
                      <div className="flex items-stretch h-full">
                        <div className={`w-2 shrink-0 ${task.subjectColor || 'bg-primary'}`}></div>
                        <div className="p-4 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                              {task.type === 'read_dossier' ? <BookOpen className="w-6 h-6" /> :
                               task.type === 'solve_worksheet' ? <FileText className="w-6 h-6" /> :
                               task.type === 'take_exam' ? <PenTool className="w-6 h-6" /> :
                               <PlayCircle className="w-6 h-6" />
                              }
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                  {task.subjectName}
                                </span>
                                {task.priority === 'high' && (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                    أولوية عالية
                                  </span>
                                )}
                              </div>
                              <h3 className={`font-bold text-lg ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {task.durationMinutes} دقيقة</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="shrink-0">
                            {task.status !== 'completed' ? (
                              <Button asChild className="w-full md:w-auto shadow-sm">
                                <Link href={task.linkedContentId ? `/${task.linkedContentType}s/${task.linkedContentId}` : '/study-room'}>
                                  {task.type === 'take_exam' ? 'ابدأ الامتحان' : 'ابدأ الدراسة'}
                                </Link>
                              </Button>
                            ) : (
                              <div className="px-4 py-2 bg-success/10 text-success font-bold rounded-xl text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> مكتمل
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
              <Card className="p-12 text-center border-dashed border-2 bg-transparent shadow-none">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">لا توجد مهام اليوم!</h3>
                <p className="text-muted-foreground mb-6">لقد أنهيت جميع مهامك، يمكنك أخذ قسط من الراحة أو الدراسة الحرة.</p>
                <Button asChild variant="outline">
                  <Link href="/study-room">جلسة دراسة حرة</Link>
                </Button>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Weekly Quiz Promo */}
            {dashboard.currentQuiz && (
              <Card className="bg-gradient-to-br from-secondary to-[#097b91] text-white border-none shadow-lg shadow-secondary/20 overflow-hidden relative">
                <div className="absolute -right-10 -top-10 opacity-20 rotate-12">
                  <Trophy className="w-32 h-32" />
                </div>
                <CardContent className="p-6 relative z-10">
                  <h3 className="font-black text-xl mb-2 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" /> كويز الأسبوع
                  </h3>
                  <p className="text-white/80 text-sm mb-4 leading-relaxed">
                    {dashboard.currentQuiz.title} متاح الآن. شارك واربح جوائز قيمة!
                  </p>
                  <Button asChild size="sm" variant="secondary" className="w-full bg-white text-secondary-foreground hover:bg-white/90">
                    <Link href="/quiz">شارك الآن</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="bg-white/50 backdrop-blur border border-white/60 rounded-2xl p-4">
              <h3 className="font-bold mb-4 px-2">الوصول السريع</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dossiers" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-black/5 hover:shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-center">الدوسيات</span>
                </Link>
                <Link href="/exams" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-black/5 hover:shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-center">الامتحانات</span>
                </Link>
                <Link href="/study-room" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-black/5 hover:shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-center">مؤقت بومودورو</span>
                </Link>
                <Link href="/notes" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-black/5 hover:shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-center">الملاحظات</span>
                </Link>
              </div>
            </div>
            
            {/* Latest Dossiers Mini List */}
            {dashboard.latestDossiers && dashboard.latestDossiers.length > 0 && (
              <div className="bg-white/50 backdrop-blur border border-white/60 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold">أحدث الملازم</h3>
                  <Link href="/dossiers" className="text-xs text-primary font-bold hover:underline">الكل</Link>
                </div>
                <div className="space-y-3">
                  {dashboard.latestDossiers.slice(0, 3).map(dossier => (
                    <Link key={dossier.id} href={`/dossiers/${dossier.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors group">
                      <div className="w-12 h-16 rounded-md bg-muted overflow-hidden shrink-0">
                        {dossier.coverUrl ? (
                          <img src={dossier.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{dossier.title}</h4>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="text-secondary">{dossier.subjectName}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}