import { useState } from "react";
import { Link } from "wouter";
import { useListWorksheets, useListSubjects } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, Filter, Target, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function Worksheets() {
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  
  const { data: subjects } = useListSubjects();
  const { data: worksheetsData, isLoading } = useListWorksheets({
    search: search.length > 2 ? search : undefined,
    subjectId: subjectId,
    limit: 20
  });

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-accent/10 text-accent border-accent/20';
      case 'hard': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'سهل';
      case 'medium': return 'متوسط';
      case 'hard': return 'صعب';
      default: return difficulty;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              أوراق العمل
            </h1>
            <p className="text-muted-foreground mt-2">تدرب على أوراق عمل تغطي كافة المستويات والدروس.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن ورقة عمل..." 
                className="pr-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="shrink-0 gap-2 bg-white">
              <Filter className="w-4 h-4" /> تصفية
            </Button>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={subjectId === undefined ? "default" : "outline"}
            className={`rounded-full shrink-0 ${subjectId === undefined ? '' : 'bg-white'}`}
            onClick={() => setSubjectId(undefined)}
            size="sm"
          >
            الكل
          </Button>
          {subjects?.map(subject => (
            <Button 
              key={subject.id}
              variant={subjectId === subject.id ? "default" : "outline"}
              className={`rounded-full shrink-0 ${subjectId === subject.id ? '' : 'bg-white'}`}
              onClick={() => setSubjectId(subject.id)}
              size="sm"
            >
              {subject.name}
            </Button>
          ))}
        </div>

        {/* Worksheets Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : worksheetsData?.items.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">لم نجد أوراق عمل</h3>
            <p className="text-muted-foreground">جرب تغيير كلمات البحث أو التصنيف.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {worksheetsData?.items.map((worksheet, idx) => (
              <motion.div
                key={worksheet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-white/60">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {worksheet.subjectName}
                      </Badge>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDifficultyColor(worksheet.difficulty)}`}>
                        {getDifficultyLabel(worksheet.difficulty)}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-4 line-clamp-2 min-h-[56px] leading-tight">
                      {worksheet.title}
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-2 mb-6 p-3 bg-muted/30 rounded-xl">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex justify-center"><Target className="w-3.5 h-3.5" /></div>
                        <div className="font-bold text-sm">{worksheet.questionCount} سؤال</div>
                      </div>
                      <div className="text-center border-r border-black/5">
                        <div className="text-xs text-muted-foreground mb-1 flex justify-center"><Clock className="w-3.5 h-3.5" /></div>
                        <div className="font-bold text-sm">{worksheet.estimatedMinutes || 15} دقيقة</div>
                      </div>
                      <div className="text-center border-r border-black/5">
                        <div className="text-xs text-muted-foreground mb-1 flex justify-center"><Users className="w-3.5 h-3.5" /></div>
                        <div className="font-bold text-sm">{worksheet.solvers || 0} طالب</div>
                      </div>
                    </div>
                    
                    <Button className="w-full bg-secondary hover:bg-secondary/90 shadow-secondary/20">
                      ابدأ الحل
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
