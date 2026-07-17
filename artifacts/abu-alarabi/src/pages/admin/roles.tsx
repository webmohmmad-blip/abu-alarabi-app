import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState } from "react";
import { ShieldCheck, ShieldX, Plus, Trash2, Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  memberCount: number;
  permissionCount: number;
  permissions: string[];
  createdAt: string;
}

interface Permission {
  id: number;
  name: string;
  group: string;
  description: string | null;
}

const ALL_PERMISSIONS = [
  { group: "المستخدمون", perms: ["users:view", "users:create", "users:edit", "users:delete", "users:suspend", "users:import"] },
  { group: "المحتوى", perms: ["content:view", "content:create", "content:edit", "content:delete"] },
  { group: "التعليقات", perms: ["comments:view", "comments:hide", "comments:delete", "comments:pin", "comments:approve"] },
  { group: "الإعلانات", perms: ["announcements:create", "announcements:edit", "announcements:delete"] },
  { group: "التقارير", perms: ["reports:view", "reports:resolve"] },
  { group: "الإعدادات", perms: ["settings:view", "settings:edit"] },
  { group: "سجل المراجعة", perms: ["audit:view"] },
];

function useRoles() {
  return useQuery({
    queryKey: ["/api/admin/roles"],
    queryFn: () => customFetch<Role[]>("/api/admin/roles", { method: "GET" }),
  });
}

export default function AdminRoles() {
  const { data: roles, isLoading } = useRoles();
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const qc = useQueryClient();

  const deleteRole = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/roles"] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة الصلاحيات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">الأدوار والصلاحيات المخصصة</p>
          </div>
          <Button onClick={() => { setEditRole(null); setShowModal(true); }} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            دور جديد
          </Button>
        </motion.div>

        {/* Built-in roles info */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">الأدوار الأساسية (طالب، معلم، مدير) مدمجة في النظام ولا يمكن حذفها. يمكنك إنشاء أدوار مخصصة إضافية.</p>
          </CardContent>
        </Card>

        {/* Built-in roles */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "super_admin", label: "مدير عام", desc: "صلاحيات كاملة على المنصة", color: "from-rose-600 to-rose-500" },
            { name: "admin", label: "مدير", desc: "إدارة المحتوى والمستخدمين", color: "from-violet-600 to-violet-500" },
            { name: "teacher", label: "معلم", desc: "إدارة محتوى المادة", color: "from-emerald-600 to-emerald-500" },
            { name: "assistant_teacher", label: "معلم مساعد", desc: "مساعدة المعلم في المحتوى", color: "from-teal-600 to-teal-500" },
            { name: "moderator", label: "مشرف", desc: "مراجعة التعليقات والبلاغات", color: "from-orange-600 to-orange-500" },
            { name: "student", label: "طالب", desc: "وصول محدود للمحتوى", color: "from-sky-600 to-sky-500" },
          ].map((role, i) => (
            <motion.div key={role.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="bg-white/5 border-white/10 overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${role.color}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${role.color} shrink-0`}>
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{role.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{role.desc}</div>
                      <div className="text-xs text-amber-400 mt-2">دور مدمج في النظام</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Custom roles */}
        {!isLoading && roles && roles.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">الأدوار المخصصة</h3>
            <div className="space-y-3">
              {roles.map((role) => (
                <Card key={role.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{role.name}</div>
                        {role.description && <div className="text-sm text-muted-foreground">{role.description}</div>}
                        <div className="text-xs text-muted-foreground mt-1">{role.permissionCount} صلاحية</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditRole(role); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`حذف دور "${role.name}"؟`)) deleteRole.mutate(role.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <RoleModal
          role={editRole}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ["/api/admin/roles"] }); }}
        />
      )}
    </AdminLayout>
  );
}

function RoleModal({ role, onClose, onSuccess }: { role: Role | null; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [error, setError] = useState("");

  const togglePerm = (perm: string) => {
    const next = new Set(selected);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    setSelected(next);
  };

  const save = useMutation({
    mutationFn: () =>
      role
        ? customFetch(`/api/admin/roles/${role.id}`, { method: "PATCH", body: JSON.stringify({ name, description, permissions: Array.from(selected) }) })
        : customFetch("/api/admin/roles", { method: "POST", body: JSON.stringify({ name, description, permissions: Array.from(selected) }) }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        <h2 className="text-xl font-bold text-white mb-5">{role ? "تعديل الدور" : "دور جديد"}</h2>
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">اسم الدور</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="مثال: مشرف المحتوى" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الوصف</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="وصف مختصر للدور..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-3 block">الصلاحيات</label>
            <div className="space-y-4">
              {ALL_PERMISSIONS.map((group) => (
                <div key={group.group}>
                  <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">{group.group}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.perms.map((perm) => (
                      <button
                        key={perm}
                        onClick={() => togglePerm(perm)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selected.has(perm)
                            ? "bg-primary text-white"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {selected.has(perm) && <Check className="w-3 h-3" />}
                        {perm.split(":")[1]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5 pt-4 border-t border-white/10">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 bg-primary hover:bg-primary/90">
            {save.isPending ? "جاري الحفظ..." : "حفظ الدور"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
