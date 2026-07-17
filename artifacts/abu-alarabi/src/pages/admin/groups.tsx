import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState } from "react";
import { Plus, Users2, Pencil, Trash2, UserPlus } from "lucide-react";

interface Group {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  memberCount: number;
  teacherName: string | null;
  createdAt: string;
}

const groupColors = ["#5A2D82", "#0D9BB5", "#C79A2D", "#e74c3c", "#27ae60", "#2980b9", "#8e44ad", "#16a085"];

function useGroups() {
  return useQuery({
    queryKey: ["/api/admin/groups"],
    queryFn: () => customFetch<Group[]>("/api/admin/groups", { method: "GET" }),
  });
}

export default function AdminGroups() {
  const { data: groups, isLoading } = useGroups();
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const qc = useQueryClient();

  const deleteGroup = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/groups"] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة المجموعات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{groups?.length ?? 0} مجموعة</p>
          </div>
          <Button
            onClick={() => { setEditGroup(null); setShowModal(true); }}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            مجموعة جديدة
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : groups?.length === 0 ? (
          <div className="text-center py-20">
            <Users2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد مجموعات. أنشئ مجموعة جديدة.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups?.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/8 transition-colors">
                  <div
                    className="h-1.5"
                    style={{ backgroundColor: group.color ?? "#5A2D82" }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditGroup(group); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`حذف مجموعة "${group.name}"؟`)) deleteGroup.mutate(group.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users2 className="w-4 h-4" />
                        <span>{group.memberCount} عضو</span>
                      </div>
                      {group.teacherName && (
                        <span className="text-xs text-primary">{group.teacherName}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <GroupModal
          group={editGroup}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ["/api/admin/groups"] });
          }}
        />
      )}
    </AdminLayout>
  );
}

function GroupModal({ group, onClose, onSuccess }: { group: Group | null; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: group?.name ?? "",
    description: group?.description ?? "",
    color: group?.color ?? groupColors[0],
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      group
        ? customFetch(`/api/admin/groups/${group.id}`, { method: "PATCH", body: JSON.stringify(form) })
        : customFetch("/api/admin/groups", { method: "POST", body: JSON.stringify(form) }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-xl font-bold text-white mb-6">
          {group ? "تعديل المجموعة" : "مجموعة جديدة"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">اسم المجموعة</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="مثال: طلاب الصف الثاني عشر" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الوصف (اختياري)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none h-20"
              placeholder="وصف مختصر للمجموعة..."
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">اللون</label>
            <div className="flex gap-2 flex-wrap">
              {groupColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
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
