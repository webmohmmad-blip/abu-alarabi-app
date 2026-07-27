import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  UserCheck,
  UserX,
  Key,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type UserRole = "student" | "teacher" | "assistant_teacher" | "moderator" | "admin" | "super_admin";
type UserStatus = "active" | "suspended" | "frozen" | "pending" | "deleted";

interface AdminUser {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  totalSessions: number;
  totalExams: number;
  lastLoginAt: string | null;
  tawjihiYear?: number | null;
}

const roleLabels: Record<UserRole, string> = {
  student: "طالب",
  teacher: "معلم",
  assistant_teacher: "معلم مساعد",
  moderator: "مشرف",
  admin: "مدير",
  super_admin: "مدير عام",
};

const roleColors: Record<UserRole, string> = {
  student: "bg-sky-500/20 text-sky-300",
  teacher: "bg-emerald-500/20 text-emerald-300",
  assistant_teacher: "bg-teal-500/20 text-teal-300",
  moderator: "bg-orange-500/20 text-orange-300",
  admin: "bg-violet-500/20 text-violet-300",
  super_admin: "bg-rose-500/20 text-rose-300",
};

const statusColors: Record<UserStatus, string> = {
  active: "bg-emerald-500/20 text-emerald-300",
  suspended: "bg-amber-500/20 text-amber-300",
  frozen: "bg-sky-500/20 text-sky-300",
  pending: "bg-gray-500/20 text-gray-300",
  deleted: "bg-red-500/20 text-red-300",
};

const statusLabels: Record<UserStatus, string> = {
  active: "نشط",
  suspended: "معلق",
  frozen: "مجمد",
  pending: "قيد الانتظار",
  deleted: "محذوف",
};

function useAdminUsers(params: { search?: string; role?: string; page?: number }) {
  const qs = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: "20",
    ...(params.search ? { search: params.search } : {}),
    ...(params.role ? { role: params.role } : {}),
  }).toString();
  return useQuery({
    queryKey: ["/api/admin/users", qs],
    queryFn: () =>
      customFetch<{ items: AdminUser[]; total: number; page: number; limit: number }>(
        `/api/admin/users?${qs}`,
        { method: "GET" }
      ),
  });
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleExport() {
    if (exporting === "loading") return;
    setExporting("loading");
    try {
      const qs = new URLSearchParams();
      if (search)     qs.set("search", search);
      if (roleFilter) qs.set("role",   roleFilter);
      // Forward the token — customFetch adds it automatically but fetch + blob needs it manually
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/admin/users/export?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `users-export-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExporting("done");
      setTimeout(() => setExporting("idle"), 3000);
    } catch {
      setExporting("error");
      setTimeout(() => setExporting("idle"), 4000);
    }
  }

  const qc = useQueryClient();
  const { data, isLoading } = useAdminUsers({ search, role: roleFilter, page });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      customFetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      customFetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة المستخدمين</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {data?.total ? `${data.total.toLocaleString("ar")} مستخدم` : "تحميل..."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export button — admin/super_admin only (already on admin page) */}
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting === "loading"}
              className={`gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 ${
                exporting === "done"  ? "border-emerald-500/40 text-emerald-400" :
                exporting === "error" ? "border-red-500/40 text-red-400" : ""
              }`}
              title={search || roleFilter ? "سيتم تصدير جميع النتائج المطابقة للفلاتر الحالية" : "سيتم تصدير جميع المستخدمين"}
            >
              {exporting === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : exporting === "done" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {exporting === "loading" ? "جاري تجهيز الملف..." :
               exporting === "done"    ? "تم التصدير بنجاح" :
               exporting === "error"   ? "تعذر التصدير" :
               "تصدير إلى Excel"}
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة مستخدم
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو الهاتف..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">جميع الأدوار</option>
              {Object.entries(roleLabels).map(([v, l]) => (
                <option key={v} value={v} className="bg-[#1a1030]">{l}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right px-5 py-3.5 text-muted-foreground font-medium">المستخدم</th>
                  <th className="text-right px-4 py-3.5 text-muted-foreground font-medium">الهاتف</th>
                  <th className="text-right px-4 py-3.5 text-muted-foreground font-medium">الدور</th>
                  <th className="text-right px-4 py-3.5 text-muted-foreground font-medium">جيل الطالب</th>
                  <th className="text-right px-4 py-3.5 text-muted-foreground font-medium">الحالة</th>
                  <th className="text-right px-4 py-3.5 text-muted-foreground font-medium">تاريخ الإنشاء</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-5 py-3">
                          <Skeleton className="h-10 w-full bg-white/5" />
                        </td>
                      </tr>
                    ))
                  : data?.items.map((user) => (
                      <tr key={user.id} className="hover:bg-white/3 transition-colors relative">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {user.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-white">{user.fullName}</div>
                              {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground font-mono text-xs">{user.phone}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-white/80">
                          {user.role === "student" && user.tawjihiYear ? `جيل ${user.tawjihiYear}` : "-"}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                            {statusLabels[user.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground text-xs">
                          {new Date(user.createdAt).toLocaleDateString("ar-JO")}
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {activeMenu === user.id && (
                              <div className="absolute left-0 top-8 z-50 bg-[#1a1030] border border-white/10 rounded-xl shadow-xl py-1 w-44">
                                {user.status === "active" ? (
                                  <button
                                    onClick={() => { changeStatus.mutate({ id: user.id, status: "suspended" }); setActiveMenu(null); }}
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-amber-400 hover:bg-white/5 transition-colors"
                                  >
                                    <UserX className="w-4 h-4" /> تعليق الحساب
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { changeStatus.mutate({ id: user.id, status: "active" }); setActiveMenu(null); }}
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-emerald-400 hover:bg-white/5 transition-colors"
                                  >
                                    <UserCheck className="w-4 h-4" /> تفعيل الحساب
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const pwd = prompt("كلمة المرور الجديدة (8 أحرف على الأقل):");
                                    if (pwd && pwd.length >= 8) resetPassword.mutate({ id: user.id, newPassword: pwd });
                                    setActiveMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-sky-400 hover:bg-white/5 transition-colors"
                                >
                                  <Key className="w-4 h-4" /> إعادة تعيين كلمة المرور
                                </button>
                                <hr className="border-white/10 my-1" />
                                <button
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من حذف ${user.fullName}؟`)) {
                                      deleteUser.mutate(user.id);
                                    }
                                    setActiveMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> حذف المستخدم
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Click outside to close menu */}
      {activeMenu !== null && (
        <div className="fixed inset-0 z-30" onClick={() => setActiveMenu(null)} />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onSuccess={() => {
          setShowAddModal(false);
          qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
        }} />
      )}
    </AdminLayout>
  );
}

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ fullName: "", phone: "", password: "", role: "student", email: "" });
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () =>
      customFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ في إنشاء المستخدم"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-xl font-bold text-white mb-6">إضافة مستخدم جديد</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الاسم الكامل</label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">رقم الهاتف</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="07xxxxxxxx" dir="ltr" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">كلمة المرور</label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الدور</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm">
              <option value="student" className="bg-[#1a1030]">طالب</option>
              <option value="teacher" className="bg-[#1a1030]">معلم</option>
              <option value="assistant_teacher" className="bg-[#1a1030]">معلم مساعد</option>
              <option value="moderator" className="bg-[#1a1030]">مشرف</option>
              <option value="admin" className="bg-[#1a1030]">مدير</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="flex-1 bg-primary hover:bg-primary/90">
            {create.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
