import { useParams, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

// Mock Data
const mockResult = {
  examTitle: "امتحان وزاري 2023 - الدورة الصيفية",
  subjectName: "الرياضيات",
  score: 85,
  totalScore: 100,
  percentage: 85,
  passed: true,
  timeTakenMinutes: 105,
  correctCount: 17,
  wrongCount: 3,
  unansweredCount: 0,
  rank: 14,
  performanceBySkill: [
    { name: "التفاضل", score: 90 },
    { name: "التكامل", score: 75 },
    { name: "المتجهات", score: 100 },
  ]
};

export default function ExamResult() {
  const { id } = useParams();

  // Create SVG circle calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (mockResult.percentage / 100) * circumference;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" asChild className="mb-2 -ml-4 hover:bg-transparent">
          <Link href="/exams" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" /> العودة لقائمة الامتحانات
          </Link>
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Result Hero Card */}
          <Card className="md:col-span-3 border-white/60 shadow-xl overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-full h-3 ${mockResult.passed ? 'bg-success' : 'bg-destructive'}`}></div>
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="text-center md:text-right flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4">
                    <Trophy className="w-4 h-4" /> النتيجة النهائية
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black mb-4">{mockResult.examTitle}</h1>
                  <p className="text-xl text-muted-foreground mb-6">مادة {mockResult.subjectName}</p>
                  
                  {mockResult.passed ? (
                    <div className="bg-success/10 text-success border border-success/20 p-4 rounded-xl font-bold flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6" /> مبروك! لقد اجتزت الامتحان بنجاح. استمر في هذا الأداء الرائع!
                    </div>
                  ) : (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl font-bold flex items-center gap-3">
                      <AlertCircle className="w-6 h-6" /> لم توفق هذه المرة. راجع أخطائك وحاول مرة أخرى، أنت قادر على التحسن!
                    </div>
                  )}
                </div>

                {/* Score Circle */}
                <div className="relative shrink-0 flex flex-col items-center">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle 
                      cx="80" cy="80" r={radius} 
                      stroke="currentColor" strokeWidth="12" fill="transparent" 
                      className="text-muted/30"
                    />
                    <motion.circle 
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      cx="80" cy="80" r={radius} 
                      stroke="currentColor" strokeWidth="12" fill="transparent" 
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      className={mockResult.passed ? 'text-success' : 'text-destructive'}
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="text-4xl font-black tabular-nums">{mockResult.percentage}%</div>
                    <div className="text-sm font-bold text-muted-foreground">{mockResult.score}/{mockResult.totalScore}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <Card className="md:col-span-2 border-white/60 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-xl mb-6">تفاصيل الأداء</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
                  <div className="text-sm text-muted-foreground mb-1">إجابة صحيحة</div>
                  <div className="font-bold text-xl text-success">{mockResult.correctCount}</div>
                </div>
                <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                  <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
                  <div className="text-sm text-muted-foreground mb-1">إجابة خاطئة</div>
                  <div className="font-bold text-xl text-destructive">{mockResult.wrongCount}</div>
                </div>
                <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                  <div className="text-sm text-muted-foreground mb-1">لم يتم الإجابة</div>
                  <div className="font-bold text-xl text-orange-400">{mockResult.unansweredCount}</div>
                </div>
                <div className="bg-muted/40 rounded-2xl p-4 text-center border border-white">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-sm text-muted-foreground mb-1">الوقت المستغرق</div>
                  <div className="font-bold text-xl text-primary">{mockResult.timeTakenMinutes}د</div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-black/5">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> الأداء حسب المهارة/الوحدة
                </h4>
                <div className="space-y-4">
                  {mockResult.performanceBySkill.map((skill, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm font-bold mb-1">
                        <span>{skill.name}</span>
                        <span className={skill.score < 80 ? 'text-destructive' : 'text-success'}>{skill.score}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${skill.score < 80 ? 'bg-destructive' : 'bg-success'}`}
                          style={{ width: `${skill.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card className="border-white/60 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-6 flex flex-col h-full">
              <h3 className="font-bold text-xl mb-4">الخطوات القادمة</h3>
              
              <div className="space-y-4 flex-1">
                {mockResult.rank && (
                  <div className="bg-white rounded-xl p-4 border border-black/5 shadow-sm text-center">
                    <div className="text-sm text-muted-foreground mb-1">ترتيبك بين الطلاب</div>
                    <div className="text-3xl font-black text-accent flex items-center justify-center gap-2">
                      <Target className="w-6 h-6" /> #{mockResult.rank}
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  بناءً على نتيجتك، ننصحك بمراجعة وحدة "التكامل" وتقديم ورقة العمل الخاصة بها قبل الانتقال للدرس التالي.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <Button className="w-full gap-2">
                  <CheckCircle2 className="w-4 h-4" /> مراجعة الإجابات
                </Button>
                <Button variant="outline" asChild className="w-full bg-white">
                  <Link href="/study-plan">تحديث خطة الدراسة</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
