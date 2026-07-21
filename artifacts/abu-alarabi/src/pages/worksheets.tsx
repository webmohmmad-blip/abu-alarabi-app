import { useState } from "react";
import { Link, useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import { useListWorksheets, useListSubjects } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, Filter, Clock, BookOpen, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Worksheets() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);

  const { data: subjects } = useListSubjects();
  const { data: worksheetsData, isLoading } = useListWorksheets({
    search: search.length > 2 ? search : undefined,
    subjectId: subjectId,
    limit: 20,
  });

  return (
    <DashboardLayout>
      <SEO
        title="أوراق العمل"
        description="أوراق عمل اللغة العربية للتوجيهي — تدريبات مستهدفة على النحو والصرف والبلاغة. إعداد الأستاذ محمد الساحوري — أبو العربي."
        canonical="/worksheets"
        breadcrumbs={[{ name: "الرئيسية", url: "/" }, { name: "أوراق العمل", url: "/worksheets" }]}
      />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              أوراق العمل
            </h1>
            <p className="text-muted-foreground mt-2">
              ملفات PDF تعليمية يمكنك تحميلها أو دراستها في غرفة الدراسة مع ميزات الكتابة والتظليل.
            </p>
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

        {/* Subject filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={subjectId === undefined ? "default" : "outline"}
            className={`rounded-full shrink-0 ${subjectId === undefined ? "" : "bg-white"}`}
            onClick={() => setSubjectId(undefined)}
            size="sm"
          >
            الكل
          </Button>
          {subjects?.map((subject) => (
            <Button
              key={subject.id}
              variant={subjectId === subject.id ? "default" : "outline"}
              className={`rounded-full shrink-0 ${subjectId === subject.id ? "" : "bg-white"}`}
              onClick={() => setSubjectId(subject.id)}
              size="sm"
            >
              {subject.name}
            </Button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
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
            {worksheetsData?.items.map((ws, idx) => (
              <WorksheetCard key={ws.id} ws={ws} idx={idx} onOpenDetail={() => setLocation(`/worksheets/${ws.id}`)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Worksheet Card ───────────────────────────────────────────────────────────

type WorksheetItem = {
  id: number;
  title: string;
  description?: string | null;
  subjectName?: string;
  grade?: string;
  estimatedMinutes?: number | null;
  fileUrl?: string | null;
  coverUrl?: string | null;
  downloads?: number;
};

function WorksheetCard({ ws, idx, onOpenDetail }: { ws: WorksheetItem; idx: number; onOpenDetail: () => void }) {
  const [, setLocation] = useLocation();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await fetch(`/api/worksheets/${ws.id}/download`);
      if (!response.ok) throw new Error("failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ws.title}.pdf`;
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

  const handleStudyRoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/study-room?worksheetId=${ws.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card
        className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-white/60 cursor-pointer overflow-hidden"
        onClick={onOpenDetail}
      >
        {/* Cover image */}
        <div className="aspect-[16/7] bg-gradient-to-br from-secondary/10 to-secondary/5 relative overflow-hidden">
          {ws.coverUrl && !coverFailed ? (
            <img
              src={ws.coverUrl}
              alt={`غلاف ${ws.title}`}
              className="w-full h-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-secondary/30" />
            </div>
          )}
          {/* Grade badge */}
          {ws.grade && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-secondary text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              الصف {ws.grade}
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Subject */}
          {ws.subjectName && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 mb-3 text-xs">
              {ws.subjectName}
            </Badge>
          )}

          {/* Title */}
          <h3 className="font-bold text-base leading-tight mb-2 line-clamp-2">{ws.title}</h3>

          {/* Description */}
          {ws.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{ws.description}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            {ws.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {ws.estimatedMinutes} دقيقة
              </span>
            )}
            {ws.fileUrl && (
              <span className="flex items-center gap-1 text-green-600">
                <BookOpen className="w-3.5 h-3.5" /> PDF متاح
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Primary: Study Room */}
            <Button
              className="w-full bg-secondary hover:bg-secondary/90 shadow-secondary/20 gap-2 text-sm"
              onClick={handleStudyRoom}
              disabled={!ws.fileUrl}
            >
              <BookOpen className="w-4 h-4" />
              حلّ في غرفتي الدراسية
            </Button>

            {/* Secondary: Download */}
            {ws.fileUrl ? (
              <Button
                variant="outline"
                className="w-full gap-2 text-sm bg-white"
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
              <Button variant="outline" className="w-full gap-2 text-sm bg-white opacity-50" disabled>
                <Download className="w-4 h-4" /> الملف غير متاح
              </Button>
            )}
          </div>

          {downloadError && (
            <p className="text-destructive text-xs mt-2 text-center font-medium">
              تعذر تحميل ورقة العمل، حاول مرة أخرى
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
