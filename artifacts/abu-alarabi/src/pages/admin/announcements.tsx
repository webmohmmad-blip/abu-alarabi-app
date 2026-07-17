import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  description: string | null;
  type: string;
  targetGrade: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  general: "عام",
  exam: "امتحان",
  maintenance: "صيانة",
  holiday: "عطلة",
  event: "فعالية",
};

const typeColors: Record<string, string> = {
  general: "bg-sky-500/20 text-sky-300",
  exam: "bg-rose-500/20 text-rose-300",
  maintenance: "bg-amber-500/20 text-amber-300",
  holiday: "bg-emerald-500/20 text-emerald-300",
  event: "bg-violet-500/20 text-violet-300",
};

function useAnnouncements() {
  return useQuery({
    queryKey: ["/api/admin/announcements"],
    queryFn: () => customFetch<Announcement[]>("/api/admin/announcements", { method: "GET" }),
  });
}

export default function AdminAnnouncements() {
  const { data, isLoading } = useAnnouncements();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: (item: Announcement) =>
      customFetch(`/api/admin/announcements/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !item.isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">الإعلانات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{data?.length ?? 0} إعلان</p>
          </div>
          <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            إعلان جديد
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full bg-white/5 rounded-2xl" />)}
          </div>
        ) : data?.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد إعلانات. أنشئ إعلانًا جديدًا.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={`border-white/10 overflow-hidden transition-colors ${item.isActive ? "bg-white/5" : "bg-white/2 opacity-60"}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type] ?? "bg-gray-500/20 text-gray-300"}`}>
                            {typeLabels[item.type] ?? item.type}
                          </span>
                          {item.targetGrade && (
                            <span className="text-xs text-muted-foreground">الصف {item.targetGrade}</span>
                          )}
                          {!item.isActive && <span className="text-xs text-muted-foreground">(مُعطّل)</span>}
                        </div>
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{new Date(item.createdAt).toLocaleDateString("ar-JO")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggle.mutate(item)}
                          className={`transition-colors ${item.isActive ? "text-primary" : "text-muted-foreground"} hover:scale-110`}
                          title={item.isActive ? "تعطيل" : "تفعيل"}
                        >
                          {item.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                        </button>
                        <button onClick={() => { setEditItem(item); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`حذف إعلان "${item.title}"؟`)) deleteItem.mutate(item.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AnnouncementModal
          item={editItem}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] }); }}
        />
      )}
    </AdminLayout>
  );
}

function AnnouncementModal({ item, onClose, onSuccess }: { item: Announcement | null; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: item?.title ?? "", description: item?.description ?? "", type: item?.type ?? "general", targetGrade: item?.targetGrade ?? "", isActive: item?.isActive ?? true });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      item
        ? customFetch(`/api/admin/announcements/${item.id}`, { method: "PATCH", body: JSON.stringify(form) })
        : customFetch("/api/admin/announcements", { method: "POST", body: JSON.stringify(form) }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">{item ? "تعديل الإعلان" : "إعلان جديد"}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">العنوان</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="عنوان الإعلان..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">التفاصيل</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none h-24" placeholder="تفاصيل الإعلان..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm">
                {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v} className="bg-[#1a1030]">{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">الصف (اختياري)</label>
              <Input value={form.targetGrade} onChange={(e) => setForm({ ...form, targetGrade: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="12 / 11 / ..." />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 bg-primary hover:bg-primary/90">
            {save.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
