import { useState } from "react";
import { Link } from "wouter";
import { useListDossiers, useListSubjects } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, Star, FileText, Download, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function Dossiers() {
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  
  const { data: subjects } = useListSubjects();
  const { data: dossiersData, isLoading } = useListDossiers({
    search: search.length > 2 ? search : undefined,
    subjectId: subjectId,
    limit: 20
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black mb-2">مكتبة الدوسيات</h1>
            <p className="text-muted-foreground">تصفح وحمل أقوى الدوسيات والملخصات لجميع المواد.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن دوسية..." 
                className="pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="shrink-0 gap-2">
              <Filter className="w-4 h-4" /> تصفية
            </Button>
          </div>
        </div>

        {/* Categories/Subjects Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={subjectId === undefined ? "default" : "outline"}
            className="rounded-full shrink-0"
            onClick={() => setSubjectId(undefined)}
            size="sm"
          >
            الكل
          </Button>
          {subjects?.map(subject => (
            <Button 
              key={subject.id}
              variant={subjectId === subject.id ? "default" : "outline"}
              className="rounded-full shrink-0"
              onClick={() => setSubjectId(subject.id)}
              size="sm"
            >
              {subject.name}
            </Button>
          ))}
        </div>

        {/* Dossiers Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : dossiersData?.items.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-white">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">لم نجد أي دوسيات</h3>
            <p className="text-muted-foreground">جرب تغيير كلمات البحث أو التصنيف.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dossiersData?.items.map((dossier, idx) => (
              <motion.div
                key={dossier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className="h-48 bg-muted relative overflow-hidden flex items-center justify-center shrink-0">
                    {dossier.coverUrl ? (
                      <img src={dossier.coverUrl} alt={dossier.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <BookOpen className="w-16 h-16 text-primary/20" />
                    )}
                    <Badge className="absolute top-3 right-3 shadow-sm bg-white/90 text-primary hover:bg-white backdrop-blur">
                      {dossier.subjectName}
                    </Badge>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight" title={dossier.title}>{dossier.title}</h3>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 mt-auto pt-4">
                      <div className="flex items-center gap-1"><FileText className="w-4 h-4"/> {dossier.pageCount} صفحة</div>
                      <div className="flex items-center gap-1"><Download className="w-4 h-4"/> {dossier.downloads}</div>
                      <div className="flex items-center gap-1"><Star className="w-4 h-4 text-accent fill-accent"/> {dossier.rating}</div>
                    </div>
                    
                    <Button className="w-full group-hover:bg-primary" asChild>
                      <Link href={`/dossiers/${dossier.id}`}>عرض الدوسية</Link>
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
