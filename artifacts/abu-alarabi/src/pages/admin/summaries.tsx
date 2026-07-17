import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useListSubjects } from "@workspace/api-client-react";
import { BookText, Plus, Trash2, Pencil, Eye, EyeOff, Archive, Search, X, FileText, Printer, AlignLeft } from "lucide-react";

interface Summary {
  id: number; title: string; description: string | null;
  subjectId: number; subjectName: string; grade: string;
  type: "text" | "pdf" | "print"; content: string | null; fileUrl: string | null;
  status: string; views: number; createdAt: string;
}

const typeIcons = { text: <AlignLeft className="w-3.5 h-3.5" />, pdf: <FileText className="w-3.5 h-3.5" />, print: <Printer className="w-3.5 h-3.5" /> };
const typeLabels = { text: "نصي", pdf: "PDF", print: "للطباعة" };
const statusBadge = (s: string) => {
  const m: Record<string, string> = { published: "bg-green-500/10 text-green-400 border-green-500/20", draft: "bg-white/10 text-white/60 border-white/10", archived: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
  const l: Record<string, string> = { published: "منشور", draft: "مسودة", archived: "مؤرشف" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m[s] ?? "bg-white/10 text-white/60 border-white/10"}`}>{l[s] ?? s}</span>;
};

const useSummaries = () => useQuery<Summary[]>({
  queryKey: ["/api/admin/summaries"],
  queryFn: () => customFetch<Summary[]>("/api/admin/summaries", { method: "GET" }),
});

export default function AdminSummaries() {
  const qc = useQueryClient();
  const { data: summaries, isLoading } = useSummaries();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Summary | null>(null);
  const { data: subjects } = useListSubjects();

  const del = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/summaries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/summaries"] }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      customFetch(`/api/admin/summaries/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/summaries"] }),
  });

  const filtered = (summaries ?? []).filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search && !s.title.includes(search)) return false;
    return true;
  });

  const stats = { total: summaries?.length ?? 0, published: summaries?.filter(s => s.status === "published").length ?? 0, draft: summaries?.filter(s => s.status === "draft").length ?? 0 };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BookText className="w-6 h-6 text-primary" /> إدارة الملخصات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">إنشاء ملخصات نصية وPDF للطلاب</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> ملخص جديد
          </Button>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[{ l: "الكل", v: stats.total, c: "text-white" }, { l: "منشور", v: stats.published, c: "text-green-400" }, { l: "مسودة", v: stats.draft, c: "text-white/60" }].map(s => (
            <Card key={s.l} className="bg-white/5 border-white/10"><CardContent className="p-4 text-center">
              <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="البحث في الملخصات..." value={search} onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-1">
            {[{ v: "all", l: "الكل" }, { v: "draft", l: "مسودة" }, { v: "published", l: "منشور" }, { v: "archived", l: "مؤرشف" }].map(f => (
              <button key={f.v} onClick={() => setStatusFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === f.v ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-white/5 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border-white/10"><CardContent className="p-12 text-center">
            <BookText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">{search ? "لا توجد نتائج" : "لا توجد ملخصات بعد"}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="bg-white/5 border-white/10">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      {typeIcons[s.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-white truncate">{s.title}</span>
                        {statusBadge(s.status)}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{typeLabels[s.type]}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex gap-3">
                        <span>{s.subjectName}</span><span>{s.grade}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{s.views}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {s.status === "draft" && (
                        <button onClick={() => setStatus.mutate({ id: s.id, status: "published" })}
                          className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="نشر">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {s.status === "published" && (
                        <button onClick={() => setStatus.mutate({ id: s.id, status: "draft" })}
                          className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="إلغاء النشر">
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      {s.status !== "archived" && (
                        <button onClick={() => setStatus.mutate({ id: s.id, status: "archived" })}
                          className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors" title="أرشفة">
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditing(s); setShowModal(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`حذف "${s.title}"؟`)) del.mutate(s.id); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <SummaryModal
          summary={editing}
          subjects={subjects as any[] ?? []}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSuccess={() => { setShowModal(false); setEditing(null); qc.invalidateQueries({ queryKey: ["/api/admin/summaries"] }); }}
        />
      )}
    </AdminLayout>
  );
}

function SummaryModal({ summary, subjects, onClose, onSuccess }: {
  summary: Summary | null; subjects: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: summary?.title ?? "",
    description: summary?.description ?? "",
    subjectId: summary?.subjectId ?? subjects[0]?.id ?? 0,
    grade: summary?.grade ?? "",
    type: summary?.type ?? "text",
    content: summary?.content ?? "",
    fileUrl: summary?.fileUrl ?? "",
    status: summary?.status ?? "draft",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => summary
      ? customFetch(`/api/admin/summaries/${summary.id}`, { method: "PATCH", body: JSON.stringify(form) })
      : customFetch("/api/admin/summaries", { method: "POST", body: JSON.stringify(form) }),
    onSuccess, onError: () => setError("حدث خطأ أثناء الحفظ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{summary ? "تعديل ملخص" : "ملخص جديد"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="text-sm text-muted-foreground mb-1 block">العنوان *</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="عنوان الملخص" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm text-muted-foreground mb-1 block">المادة *</label>
              <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                {subjects.map((s: any) => <option key={s.id} value={s.id} className="bg-[#1a1030]">{s.name}</option>)}
              </select></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">الصف *</label>
              <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                className="bg-white/5 border-white/10 text-white" placeholder="مثال: الثاني عشر" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm text-muted-foreground mb-1 block">النوع</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                <option value="text" className="bg-[#1a1030]">نصي</option>
                <option value="pdf" className="bg-[#1a1030]">PDF</option>
                <option value="print" className="bg-[#1a1030]">للطباعة</option>
              </select></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">الحالة</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                <option value="draft" className="bg-[#1a1030]">مسودة</option>
                <option value="published" className="bg-[#1a1030]">منشور</option>
                <option value="archived" className="bg-[#1a1030]">مؤرشف</option>
              </select></div>
          </div>
          {form.type === "text" ? (
            <div><label className="text-sm text-muted-foreground mb-1 block">المحتوى</label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none font-mono"
                placeholder="اكتب محتوى الملخص هنا..." /></div>
          ) : (
            <div><label className="text-sm text-muted-foreground mb-1 block">رابط ملف PDF</label>
              <Input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })}
                className="bg-white/5 border-white/10 text-white font-mono text-xs" placeholder="https://..." dir="ltr" /></div>
          )}
          <div><label className="text-sm text-muted-foreground mb-1 block">وصف (اختياري)</label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="وصف مختصر..." /></div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.grade.trim() || save.isPending} className="flex-1 bg-primary">
            {save.isPending ? "جاري الحفظ..." : summary ? "تحديث" : "إنشاء الملخص"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
