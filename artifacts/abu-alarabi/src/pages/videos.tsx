import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch, useListSubjects } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, Search, Video, X, Eye } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoItem {
  id: number;
  title: string;
  description?: string;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  grade: string;
  provider: string;
  videoUrl: string;
  embedUrl: string;
  durationMinutes?: number;
  coverUrl?: string;
  views: number;
  createdAt: string;
}

// ─── Embedded Video Player ────────────────────────────────────────────────────

function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 text-white">
          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block"
              style={{ backgroundColor: video.subjectColor + "33", color: video.subjectColor }}>
              {video.subjectName}
            </span>
            <h2 className="text-xl font-black leading-snug">{video.title}</h2>
            {video.description && <p className="text-sm text-white/60 mt-1">{video.description}</p>}
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl"
          style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={video.embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-3 text-white/50 text-xs">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {video.views.toLocaleString("ar-JO")} مشاهدة</span>
          {video.durationMinutes && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {video.durationMinutes} دقيقة</span>
          )}
          <span className="capitalize">{providerLabel(video.provider)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video, onClick }: { video: VideoItem; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 mb-3"
        style={{ paddingBottom: "56.25%" }}>
        {video.coverUrl ? (
          <img
            src={video.coverUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Video className="w-10 h-10 text-white/40" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl">
            <Play className="w-6 h-6 text-primary fill-primary mr-[-2px]" />
          </div>
        </div>

        {/* Provider badge */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded-md">
            {providerLabel(video.provider)}
          </span>
        </div>

        {/* Duration badge */}
        {video.durationMinutes && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded-md flex items-center gap-1">
              <Clock className="w-3 h-3" /> {video.durationMinutes} د
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ backgroundColor: video.subjectColor + "20", color: video.subjectColor }}>
            {video.subjectName}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" /> {video.views.toLocaleString("ar-JO")}
          </span>
        </div>
        <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {video.title}
        </h3>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Videos() {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<number | undefined>();
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const { data: subjects } = useListSubjects();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/videos", subjectFilter],
    queryFn: () =>
      customFetch<{ items: VideoItem[]; total: number }>(
        `/api/videos${subjectFilter ? `?subjectId=${subjectFilter}` : ""}`,
        { method: "GET" }
      ),
  });

  const filtered = (data?.items ?? []).filter(
    (v) => !search || v.title.includes(search) || (v.description ?? "").includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 mb-1">
              <Video className="w-8 h-8 text-primary" /> مكتبة الفيديوهات
            </h1>
            <p className="text-muted-foreground">دروس مرئية من الأستاذ محمد الساحوري</p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن فيديو..."
              className="pr-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Subject filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSubjectFilter(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${!subjectFilter ? "bg-primary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}
          >
            الكل
          </button>
          {subjects?.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSubjectFilter(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${subjectFilter === s.id ? "bg-primary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="w-full rounded-2xl" style={{ paddingBottom: "56.25%" }} />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Video className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg">
              {search ? "لا توجد نتائج للبحث" : "لا توجد فيديوهات بعد"}
            </p>
            {!search && <p className="text-sm mt-1 opacity-70">ترقّب إضافة دروس مرئية قريباً</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((video) => (
              <VideoCard key={video.id} video={video} onClick={() => setActiveVideo(video)} />
            ))}
          </div>
        )}
      </div>

      {/* Video modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    youtube: "YouTube",
    vimeo: "Vimeo",
    bunny: "Bunny Stream",
    cloudflare: "Cloudflare",
    other: "خارجي",
  };
  return map[provider] ?? provider;
}
