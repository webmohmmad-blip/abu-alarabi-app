import { useState, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetDossier, 
  useToggleDossierFavorite, 
  useUpdateDossierProgress,
  getGetDossierQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  Heart, 
  BookOpen, 
  Download, 
  Star, 
  FileText, 
  Share2, 
  CheckCircle2,
  ChevronLeft
} from "lucide-react";

export default function DossierDetail() {
  const { id } = useParams();
  const dossierId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: dossier, isLoading } = useGetDossier(dossierId, {
    query: { enabled: !!dossierId }
  });

  const toggleFavorite = useToggleDossierFavorite();
  const updateProgress = useUpdateDossierProgress();

  const handleToggleFavorite = () => {
    toggleFavorite.mutate(
      { id: dossierId },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetDossierQueryKey(dossierId), (old: any) => 
            old ? { ...old, isFavorite: data.isFavorite } : old
          );
        }
      }
    );
  };

  const handleStartReading = () => {
    setIsReading(true);
    setCurrentPage(dossier?.lastReadPage || 1);
  };

  const saveProgressRef = useRef(updateProgress.mutate);
  saveProgressRef.current = updateProgress.mutate;

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Debounce this in a real app, but for now just call it
    saveProgressRef.current({ 
      id: dossierId, 
      data: { currentPage: newPage } 
    });
  }, [dossierId]);

  if (isLoading || !dossier) {
    return (
      <DashboardLayout>
        <Skeleton className="w-24 h-8 rounded-lg mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="h-[400px] rounded-2xl" />
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-14 w-48" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isReading) {
    return (
      <div className="min-h-screen bg-black/95 text-white flex flex-col">
        {/* PDF Viewer Topbar */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-black">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsReading(false)}>
              <ChevronRight className="w-6 h-6" />
            </Button>
            <h1 className="font-bold truncate max-w-xs md:max-w-md">{dossier.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold opacity-70">
              صفحة {currentPage} من {dossier.pageCount}
            </span>
          </div>
        </div>
        
        {/* Mock PDF Area */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white aspect-[1/1.4] rounded-sm shadow-2xl relative flex items-center justify-center text-black/20">
            <div className="text-center">
              <BookOpen className="w-24 h-24 mx-auto mb-4 opacity-50" />
              <p className="text-2xl font-bold">محتوى الصفحة {currentPage}</p>
              <p className="text-sm mt-2 opacity-60">محاكاة لعارض الملفات PDF</p>
            </div>
          </div>
          
          {/* Pagination Controls */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-white/20 p-2 rounded-full flex items-center gap-4 shadow-2xl">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 rounded-full"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
            
            <div className="w-32 px-4">
              <Progress value={(currentPage / dossier.pageCount) * 100} className="h-1.5 bg-white/20 [&>div]:bg-primary" />
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 rounded-full"
              disabled={currentPage >= dossier.pageCount}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <Button variant="ghost" asChild className="mb-4 -ml-4 hover:bg-transparent">
          <Link href="/dossiers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" /> العودة للمكتبة
          </Link>
        </Button>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-primary/5">
          <div className="grid md:grid-cols-[1fr_2fr] gap-8 md:gap-12">
            
            {/* Cover Column */}
            <div className="space-y-4">
              <div className="aspect-[1/1.4] bg-muted rounded-2xl overflow-hidden shadow-lg border border-black/5 relative">
                {dossier.coverUrl ? (
                  <img src={dossier.coverUrl} alt={dossier.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                    <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                    <span className="font-bold px-4 text-center">{dossier.subjectName}</span>
                  </div>
                )}
                {dossier.isFree && (
                  <div className="absolute top-4 left-4 bg-success text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">مجاني</div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="lg" 
                  className="flex-1 gap-2 text-lg shadow-primary/30"
                  onClick={handleStartReading}
                >
                  <BookOpen className="w-5 h-5" /> ابدأ القراءة
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={`w-14 shrink-0 transition-colors ${dossier.isFavorite ? 'border-destructive text-destructive bg-destructive/10' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={toggleFavorite.isPending}
                >
                  <Heart className={`w-6 h-6 ${dossier.isFavorite ? 'fill-destructive' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Info Column */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="px-3 py-1 text-sm">{dossier.subjectName}</Badge>
                <Badge variant="outline" className="px-3 py-1 text-sm bg-white/50">{dossier.grade}</Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight">{dossier.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground mb-8 pb-8 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent fill-accent" />
                  <span className="text-foreground">{dossier.rating}</span> التقييم
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{dossier.pageCount}</span> صفحة
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-secondary" />
                  <span className="text-foreground">{dossier.downloads}</span> تحميل
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-3">وصف الدوسية</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {dossier.description || "لا يوجد وصف متاح لهذه الدوسية. الدوسية تشمل شرحاً وافياً للمادة مع أمثلة وتدريبات عملية لتسهيل الفهم والتحضير للامتحانات."}
                  </p>
                </div>

                {dossier.readingProgress !== undefined && dossier.readingProgress > 0 && (
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" /> تقدمك في القراءة
                      </h4>
                      <span className="font-bold text-primary">{Math.round(dossier.readingProgress)}%</span>
                    </div>
                    <Progress value={dossier.readingProgress} className="h-2 bg-primary/20" />
                    <p className="text-xs text-muted-foreground mt-3">
                      آخر صفحة قرأتها: {dossier.lastReadPage} من {dossier.pageCount}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4">
                  <Button variant="outline" className="gap-2 bg-white">
                    <Download className="w-4 h-4" /> تحميل PDF
                  </Button>
                  <Button variant="outline" className="gap-2 bg-white">
                    <Share2 className="w-4 h-4" /> مشاركة
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
