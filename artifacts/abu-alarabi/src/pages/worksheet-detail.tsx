import { SEO } from "@/components/SEO";
import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  BookOpen,
  Download,
  FileText,
  Clock,
  Calendar,
  Loader2,
} from "lucide-react";

interface WorksheetDetail {
  id: number;
  title: string;
  description?: string | null;
  subjectId?: number;
  subjectName?: string;
  grade?: string;
  estimatedMinutes?: number | null;
  fileUrl?: string | null;
  coverUrl?: string | null;
  downloads?: number;
  status?: string;
  publishedAt?: string | null;
  createdAt?: string;
}

export default function WorksheetDetail() {
  const { id } = useParams();
  const worksheetId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [coverFailed, setCoverFailed] = useState(false);

  const { data: worksheet, isLoading } = useQuery<WorksheetDetail>({
    queryKey: [`/api/worksheets/${worksheetId}`],
    queryFn: () => customFetch<WorksheetDetail>(`/api/worksheets/${worksheetId}`),
    enabled: !!worksheetId,
  });

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await fetch(`/api/worksheets/${worksheetId}/download`);
      if (!response.ok) throw new Error("failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${worksheet?.title ?? "worksheet"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !worksheet) {
    return (
      <DashboardLayout>
        <Skeleton className="w-24 h-8 rounded-lg mb-8" />
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1">
            <Skeleton className="aspect-[1/1.4] rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <Skeleton className="h-6 w-1/2 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Quick-read mode (inline PDF iframe)
  if (isReading) {
    return (
      <div className="h-screen flex flex-col bg-muted/30" dir="rtl">
        {/* Mini toolbar */}
        <div className="h-12 bg-white border-b flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setIsReading(false)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" /> العودة
          </button>
          <span className="font-bold text-sm flex-1 truncate">{worksheet.title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground">صفحة {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <iframe
            src={`/api/worksheets/${worksheetId}/view#toolbar=0&navpanes=0&page=${currentPage}`}
            title={worksheet.title}
            className="w-full h-full border-0"
            style={{ minHeight: "calc(100vh - 48px)" }}
          />
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <SEO
        title={worksheet.title}
        description={`${worksheet.title} — ورقة عمل في اللغة العربية إعداد الأستاذ محمد الساحوري. تدريبات مستهدفة لطلاب التوجيهي الأردن.`}
        canonical={`/worksheets/${worksheetId}`}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "أوراق العمل", url: "/worksheets" },
          { name: worksheet.title, url: `/worksheets/${worksheetId}` },
        ]}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/worksheets" className="hover:text-foreground transition-colors">
          أوراق العمل
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{worksheet.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Cover column */}
        <div className="lg:col-span-1">
          <div className="aspect-[1/1.4] bg-muted rounded-2xl overflow-hidden shadow-lg border border-black/5 sticky top-4">
            {worksheet.coverUrl && !coverFailed ? (
              <img
                src={worksheet.coverUrl}
                alt={`غلاف ${worksheet.title}`}
                className="w-full h-full object-cover"
                onError={() => setCoverFailed(true)}
              />
            ) : null}
            <div
              className="w-full h-full flex-col items-center justify-center bg-gradient-to-br from-secondary/10 to-secondary/5 text-secondary"
              style={{ display: worksheet.coverUrl && !coverFailed ? "none" : "flex" }}
            >
              <FileText className="w-16 h-16 mb-4 opacity-40" />
              <span className="font-bold px-4 text-center text-sm">{worksheet.subjectName}</span>
            </div>
          </div>
        </div>

        {/* Content column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject + grade badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {worksheet.subjectName && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {worksheet.subjectName}
              </Badge>
            )}
            {worksheet.grade && (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                الصف {worksheet.grade}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black leading-tight">{worksheet.title}</h1>

          {/* Description */}
          {worksheet.description && (
            <p className="text-muted-foreground leading-relaxed">{worksheet.description}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-6 flex-wrap text-sm text-muted-foreground">
            {worksheet.estimatedMinutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {worksheet.estimatedMinutes} دقيقة تقريباً
              </span>
            )}
            {worksheet.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(worksheet.publishedAt).toLocaleDateString("ar-JO", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            {worksheet.fileUrl ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <BookOpen className="w-4 h-4" />
                PDF متاح للدراسة والتحميل
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground/60">
                <FileText className="w-4 h-4" />
                الملف قيد الإعداد
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Primary action: Download */}
          <div className="space-y-3">
            {worksheet.fileUrl ? (
              <Button
                className="w-full h-14 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-3"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloading ? "جاري التحميل…" : "تحميل PDF"}
              </Button>
            ) : (
              <Button variant="outline" className="w-full h-12 gap-2 bg-white opacity-50" disabled>
                <Download className="w-4 h-4" /> الملف غير متاح
              </Button>
            )}

            {downloadError && (
              <p className="text-destructive text-sm text-center font-medium">
                تعذر تحميل ورقة العمل، حاول مرة أخرى
              </p>
            )}

            {/* Tertiary: Quick preview */}
            {worksheet.fileUrl && (
              <Button
                variant="ghost"
                className="w-full h-10 gap-2 text-muted-foreground text-sm"
                onClick={() => setIsReading(true)}
              >
                <FileText className="w-4 h-4" />
                معاينة سريعة
              </Button>
            )}

            <Link href="/worksheets">
              <Button variant="ghost" className="w-full h-10 gap-2 text-muted-foreground text-sm">
                <ChevronRight className="w-4 h-4" />
                العودة إلى أوراق العمل
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
