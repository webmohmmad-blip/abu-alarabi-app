import { useState } from "react";
import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { customFetch, useListSubjects } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { BookText, Search, Eye, X, FileText, Printer, AlignLeft } from "lucide-react";

interface SummaryItem {
  id: number; title: string; description: string | null;
  subjectId: number; subjectName: string; subjectColor: string;
  grade: string; type: "text" | "pdf" | "print";
  content: string | null; fileUrl: string | null;
  views: number; createdAt: string;
}

const TYPE_META = {
  text: { icon: <AlignLeft className="w-4 h-4" />, label: "نصي", color: "bg-blue-500/10 text-blue-400" },
  pdf: { icon: <FileText className="w-4 h-4" />, label: "PDF", color: "bg-red-500/10 text-red-400" },
  print: { icon: <Printer className="w-4 h-4" />, label: "للطباعة", color: "bg-purple-500/10 text-purple-400" },
};

function SummaryModal({ summary, onClose }: { summary: SummaryItem; onClose: () => void }) {
  const meta = TYPE_META[summary.type];
  if (summary.type === "print" && summary.fileUrl) {
    window.open(summary.fileUrl, "_blank");
    onClose();
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: summary.subjectColor + "20", color: summary.subjectColor }}>{summary.subjectName}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.color}`}>{meta.icon}{meta.label}</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">{summary.title}</h2>
            {summary.description && <p className="text-sm text-gray-500 mt-0.5">{summary.description}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-4 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {summary.type === "text" ? (
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-medium text-right">
                {summary.content || "لا يوجد محتوى لهذا الملخص."}
              </div>
            </div>
          ) : summary.fileUrl ? (
            <iframe src={summary.fileUrl} title={summary.title} className="w-full h-[70vh] border-0" />
          ) : (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>الملف غير متوفر حالياً.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Summaries() {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [active, setActive] = useState<SummaryItem | null>(null);

  const { data: subjects } = useListSubjects();
  const { data: summaries, isLoading } = useQuery({
    queryKey: ["/api/summaries", subjectFilter],
    queryFn: () => customFetch<SummaryItem[]>(`/api/summaries${subjectFilter ? `?subjectId=${subjectFilter}` : ""}`, { method: "GET" }),
  });

  const filtered = (summaries ?? []).filter(s => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (search && !s.title.includes(search) && !(s.description ?? "").includes(search)) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <SEO
        title="الملخصات"
        description="ملخصات اللغة العربية للتوجيهي الأردن — مراجعة شاملة وسريعة لأهم قواعد النحو والصرف والبلاغة والأدب مع الأستاذ محمد الساحوري."
        canonical="/summaries"
        breadcrumbs={[{ name: "الرئيسية", url: "/" }, { name: "الملخصات", url: "/summaries" }]}
      />
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 mb-1">
              <BookText className="w-8 h-8 text-primary" /> مكتبة الملخصات
            </h1>
            <p className="text-muted-foreground">ملخصات أكاديمية شاملة للمادة العربية</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ابحث عن ملخص..." className="pr-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          {[{ v: "all", l: "الكل" }, { v: "text", l: "نصي" }, { v: "pdf", l: "PDF" }, { v: "print", l: "للطباعة" }].map(f => (
            <button key={f.v} onClick={() => setTypeFilter(f.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${typeFilter === f.v ? "bg-primary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}>
              {f.l}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          <button onClick={() => setSubjectFilter(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${!subjectFilter ? "bg-secondary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}>
            كل المواد
          </button>
          {(subjects as any[] ?? []).map((s: any) => (
            <button key={s.id} onClick={() => setSubjectFilter(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${subjectFilter === s.id ? "bg-primary text-white" : "bg-white border text-muted-foreground hover:bg-muted"}`}>
              {s.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <BookText className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg">{search ? "لا توجد نتائج" : "لا توجد ملخصات بعد"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((summary) => {
              const meta = TYPE_META[summary.type];
              return (
                <motion.div key={summary.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-border overflow-hidden cursor-pointer group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  onClick={() => setActive(summary)}
                  style={{ borderRightWidth: 4, borderRightColor: summary.subjectColor }}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: summary.subjectColor + "20", color: summary.subjectColor }}>
                        {summary.subjectName}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">{summary.grade}</span>
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 mr-auto ${meta.color}`}>
                        {meta.icon}<span>{meta.label}</span>
                      </div>
                    </div>
                    <h3 className="font-black text-gray-900 mb-2 leading-snug group-hover:text-primary transition-colors">
                      {summary.title}
                    </h3>
                    {summary.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{summary.description}</p>
                    )}
                    {summary.type === "text" && summary.content && (
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 font-mono bg-muted/30 p-2 rounded-lg">
                        {summary.content.slice(0, 120)}...
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {summary.views.toLocaleString("ar-JO")}
                      </span>
                      <span className="text-xs font-bold text-primary group-hover:underline">
                        {summary.type === "print" ? "🖨️ طباعة" : "اقرأ الآن ←"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {active && <SummaryModal summary={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </DashboardLayout>
  );
}
