import { SEO } from "@/components/SEO";
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
import { useLocation } from "wouter";
import { 
  ChevronRight, 
  Heart, 
  BookOpen, 
  Download, 
  Star, 
  FileText, 
  Share2, 
  CheckCircle2,
  ChevronLeft,
  Pencil
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

export default function DossierDetail() {
  const { id } = useParams();
  const dossierId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  
  const { data: dossier, isLoading } = useGetDossier(dossierId, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: !!dossierId } as any,
  });

  const toggleFavorite = useToggleDossierFavorite();
  const updateProgress = useUpdateDossierProgress();

  const handleShare = async () => {
    if (!dossier) return;

    // Public canonical URL format (stripping any internal query parameters)
    const publicUrl = `${window.location.origin}/dossiers/${dossier.id}`;

    const shareData = {
      title: dossier.title,
      text: dossier.description || "دوسية تعليمية من منصة أبو العربي",
      url: publicUrl,
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl);
        toast({
          title: "تم نسخ رابط الدوسية",
        });
      } else {
        toast({
          title: "تعذر مشاركة الدوسية، حاول مرة أخرى",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(publicUrl);
          toast({
            title: "تم نسخ رابط الدوسية",
          });
          return;
        }
      } catch {
        // Fallback failed as well
      }

      toast({
        title: "تعذر مشاركة الدوسية، حاول مرة أخرى",
        variant: "destructive",
      });
    }
  };

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
        
        {/* Real PDF viewer */}
        <div className="flex-1 overflow-hidden relative">
          {dossier.fileUrl ? (
            <iframe
              src={`/api/dossiers/${dossierId}/view#toolbar=0&navpanes=0&page=${currentPage}`}
              title={dossier.title}
              className="w-full h-full border-0"
              style={{ minHeight: "calc(100vh - 128px)" }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/40 bg-gray-900">
              <BookOpen className="w-24 h-24 mb-4 opacity-40" />
              <p className="text-xl font-bold">لا يوجد ملف PDF لهذه الدوسية</p>
              <p className="text-sm mt-2 opacity-60">يرجى التواصل مع الأستاذ</p>
            </div>
          )}

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
      <SEO
        title={dossier.title}
        description={`${dossier.title} — دوسية إعداد الأستاذ محمد الساحوري في اللغة العربية للتوجيهي الأردن. محتوى تعليمي شامل ومنظم.`}
        canonical={`/dossiers/${dossierId}`}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "الدوسيات", url: "/dossiers" },
          { name: dossier.title, url: `/dossiers/${dossierId}` },
        ]}
      />
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
                  <img
                    src={dossier.coverUrl}
                    alt={`غلاف دوسية ${dossier.title}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken image and show fallback
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary"
                  style={{ display: dossier.coverUrl ? "none" : "flex" }}
                >
                  <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                  <span className="font-bold px-4 text-center">{dossier.subjectName}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    size="lg"
                    className="flex-1 gap-2 text-base font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                    onClick={handleStartReading}
                  >
                    <BookOpen className="w-5 h-5" /> قراءة الدوسية
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
                  {dossier.fileUrl ? (
                    <Button
                      variant="outline"
                      className="gap-2 bg-white"
                      disabled={downloading}
                      onClick={async () => {
                        if (downloading) return;
                        setDownloading(true);
                        setDownloadError(false);
                        try {
                          // Use fetch so the JWT Bearer token is sent automatically,
                          // then trigger a blob download — works on all browsers including Safari/iOS
                          const response = await fetch(`/api/dossiers/${dossierId}/download`);
                          if (!response.ok) throw new Error("download_failed");
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${dossier.title}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch {
                          setDownloadError(true);
                        } finally {
                          setDownloading(false);
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                      {downloading ? "جاري التحميل…" : "تحميل PDF"}
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-2 bg-white opacity-50" disabled>
                      <Download className="w-4 h-4" /> الملف غير متاح
                    </Button>
                  )}
                  {downloadError && (
                    <span className="text-destructive text-sm font-medium">
                      تعذر تحميل الملف، حاول مرة أخرى
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 bg-white min-h-[44px]"
                    onClick={handleShare}
                    aria-label="مشاركة الدوسية"
                  >
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
