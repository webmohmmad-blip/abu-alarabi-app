import { useState } from "react";
import { Link } from "wouter";
import { useListExams, useListSubjects } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PenTool, Filter, Clock, FileQuestion, Users, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { motion } from "framer-motion";

export default function Exams() {
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  
  const { data: subjects } = useListSubjects();
  const { data: exams, isLoading } = useListExams({
    subjectId,
    type
  });

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-accent/10 text-accent border-accent/20';
      case 'hard': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'ministerial': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'سهل';
      case 'medium': return 'متوسط';
      case 'hard': return 'صعب';
      case 'ministerial': return 'وزاري';
      default: return difficulty;
    }
  };

  const getTypeLabel = (t: string) => {
    switch(t) {
      case 'full': return 'شامل';
      case 'unit': return 'وحدة';
      case 'lesson': return 'درس';
      case 'weekly': return 'أسبوعي';
      case 'diagnostic': return 'تشخيصي';
      case 'ministerial': return 'وزاري سابق';
      default: return t;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-sm">
                <PenTool className="w-6 h-6" />
              </div>
              الامتحانات
            </h1>
            <p className="text-muted-foreground mt-2">اختبر جاهزيتك من خلال مجموعة واسعة من الامتحانات الوزارية والتجريبية.</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide shrink-0">
            <Button 
              variant={type === undefined ? "default" : "outline"}
              className="rounded-full bg-white"
              onClick={() => setType(undefined)}
            >
              الكل
            </Button>
            <Button 
              variant={type === 'ministerial' ? "default" : "outline"}
              className="rounded-full bg-white"
              onClick={() => setType('ministerial')}
            >
              وزاري
            </Button>
            <Button 
              variant={type === 'full' ? "default" : "outline"}
              className="rounded-full bg-white"
              onClick={() => setType('full')}
            >
              شامل
            </Button>
            <Button 
              variant={type === 'unit' ? "default" : "outline"}
              className="rounded-full bg-white"
              onClick={() => setType('unit')}
            >
              وحدة
            </Button>
          </div>
        </div>

        {/* Subjects Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-black/5">
          <Button 
            variant={subjectId === undefined ? "default" : "ghost"}
            className="rounded-full shrink-0"
            onClick={() => setSubjectId(undefined)}
            size="sm"
          >
            جميع المواد
          </Button>
          {subjects?.map(subject => (
            <Button 
              key={subject.id}
              variant={subjectId === subject.id ? "default" : "ghost"}
              className="rounded-full shrink-0"
              onClick={() => setSubjectId(subject.id)}
              size="sm"
            >
              {subject.name}
            </Button>
          ))}
        </div>

        {/* Info Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-primary">نصيحة:</strong> للحصول على تقييم دقيق لمستواك، حاول إجراء الامتحانات في بيئة هادئة وضمن الوقت المحدد تماماً كما في الامتحان الوزاري الفعلي.
          </p>
        </div>

        {/* Exams Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : exams?.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
            <PenTool className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">لا توجد امتحانات متاحة</h3>
            <p className="text-muted-foreground">لم نجد امتحانات تطابق خيارات التصفية.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {exams?.map((exam, idx) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-white/60 relative overflow-hidden ${!exam.isAvailable ? 'opacity-70 grayscale-[30%]' : ''}`}>
                  {!exam.isAvailable && (
                    <div className="absolute top-4 left-4 bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold z-10 flex items-center gap-1 shadow-sm">
                      <Clock className="w-3 h-3" /> غير متاح حالياً
                    </div>
                  )}
                  {exam.userAttempts && exam.userAttempts > 0 && (
                    <div className="absolute top-4 left-4 bg-success/20 text-success px-3 py-1 rounded-full text-xs font-bold z-10 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> تم تقديمه ({exam.userAttempts})
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {exam.subjectName}
                      </Badge>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDifficultyColor(exam.difficulty)}`}>
                        {getDifficultyLabel(exam.difficulty)}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 min-h-[56px] leading-tight">
                      {exam.title}
                    </h3>
                    
                    <Badge variant="secondary" className="mb-6">{getTypeLabel(exam.type)}</Badge>
                    
                    <div className="grid grid-cols-3 gap-2 mb-6 p-3 bg-muted/30 rounded-xl">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex justify-center"><FileQuestion className="w-3.5 h-3.5" /></div>
                        <div className="font-bold text-sm">{exam.questionCount} سؤال</div>
                      </div>
                      <div className="text-center border-r border-black/5">
                        <div className="text-xs text-muted-foreground mb-1 flex justify-center"><Clock className="w-3.5 h-3.5" /></div>
                        <div className="font-bold text-sm">{exam.durationMinutes} دقيقة</div>
                      </div>
                      <div className="text-center border-r border-black/5">
                        <div className="text-xs text-muted-foreground mb-1 flex justify-center"><Users className="w-3.5 h-3.5" /></div>
                        <div className="font-bold text-sm">{exam.totalParticipants || 0} طالب</div>
                      </div>
                    </div>
                    
                    <Button 
                      className={`w-full ${exam.type === 'ministerial' ? 'bg-primary' : 'bg-secondary hover:bg-secondary/90'}`}
                      disabled={!exam.isAvailable}
                      asChild={exam.isAvailable}
                    >
                      {exam.isAvailable ? (
                        <Link href={`/exams/${exam.id}`}>ابدأ الامتحان</Link>
                      ) : (
                        <span>مغلق حالياً</span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
