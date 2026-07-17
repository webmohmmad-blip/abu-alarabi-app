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
  BookOpen, FileText, PenTool, Plus, Trash2, Pencil,
  ChevronDown, ChevronRight, Search, GripVertical, Layers,
  X, Check,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Subject {
  id: number;
  name: string;
  grade: string;
  field: string | null;
  color: string | null;
  iconUrl: string | null;
  dossierCount: number;
  worksheetCount: number;
  examCount: number;
}

interface Unit {
  id: number;
  subjectId: number;
  title: string;
  order: number;
}

interface Dossier {
  id: number;
  title: string;
  subjectId: number;
  grade: string;
  pageCount: number;
  downloads: number;
  createdAt: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useSubjects() {
  return useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => customFetch<Subject[]>("/api/subjects", { method: "GET" }),
  });
}

function useUnits(subjectId: number | null) {
  return useQuery({
    queryKey: ["/api/admin/subjects", subjectId, "units"],
    queryFn: () =>
      customFetch<Unit[]>(`/api/admin/subjects/${subjectId}/units`, { method: "GET" }),
    enabled: subjectId !== null,
  });
}

function useDossiers() {
  return useQuery({
    queryKey: ["/api/dossiers"],
    queryFn: () =>
      customFetch<{ items: Dossier[]; total: number }>(`/api/dossiers?limit=100`, { method: "GET" }),
  });
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminContent() {
  const { data: subjects, isLoading } = useSubjects();
  const { data: dossierData } = useDossiers();
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"units" | "dossiers" | "worksheets" | "exams">("units");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddDossier, setShowAddDossier] = useState<number | null>(null);
  const qc = useQueryClient();

  const deleteSubject = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/subjects"] }),
  });

  const deleteDossier = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/dossiers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dossiers"] }),
  });

  const filteredSubjects = subjects?.filter(s =>
    search ? s.name.includes(search) || s.grade.includes(search) : true
  );

  const dossiersForSubject = (subjectId: number) =>
    dossierData?.items.filter(d => d.subjectId === subjectId) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة المحتوى</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              المسارات الأكاديمية للغة العربية — وحداتها، دوسياتها، وامتحاناتها
            </p>
          </div>
          <Button
            onClick={() => setShowAddSubject(true)}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة مسار جديد
          </Button>
        </motion.div>

        {/* Search */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المسارات..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!isLoading && filteredSubjects?.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">لا توجد مسارات بعد</h3>
              <p className="text-muted-foreground text-sm mb-6">
                أضف مساراتك الأكاديمية (توجيهي، أول ثانوي، دورات...) ثم أضف الوحدات والمحتوى داخل كل مسار.
              </p>
              <Button onClick={() => setShowAddSubject(true)} className="gap-2">
                <Plus className="w-4 h-4" /> إضافة أول مسار
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subjects tree */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full bg-white/5 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubjects?.map((subject, i) => {
              const isExpanded = expandedSubject === subject.id;
              const dossiers = dossiersForSubject(subject.id);

              return (
                <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="bg-white/5 border-white/10 overflow-hidden">

                    {/* Subject row */}
                    <button
                      onClick={() => {
                        setExpandedSubject(isExpanded ? null : subject.id);
                        setActiveTab("units");
                      }}
                      className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-colors text-right"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-base"
                        style={{ backgroundColor: subject.color ?? "#5A2D82" }}
                      >
                        {subject.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="font-semibold text-white">{subject.name}</div>
                        <div className="text-sm text-muted-foreground">
                          الصف {subject.grade}{subject.field ? ` • ${subject.field}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{subject.dossierCount ?? 0}</span>
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{subject.worksheetCount ?? 0}</span>
                        <span className="flex items-center gap-1"><PenTool className="w-3.5 h-3.5" />{subject.examCount ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm(`حذف مسار "${subject.name}"؟`)) deleteSubject.mutate(subject.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-black/10">
                        {/* Tabs */}
                        <div className="flex gap-1 px-5 pt-4">
                          {[
                            { key: "units" as const, label: "الوحدات والمواد", icon: Layers },
                            { key: "dossiers" as const, label: "الدوسيات", icon: BookOpen },
                            { key: "worksheets" as const, label: "أوراق العمل", icon: FileText },
                            { key: "exams" as const, label: "الامتحانات", icon: PenTool },
                          ].map(tab => (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                              <tab.icon className="w-3.5 h-3.5" />
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-5">
                          {activeTab === "units" && (
                            <UnitsPanel subjectId={subject.id} qc={qc} />
                          )}
                          {activeTab === "dossiers" && (
                            <div className="space-y-2">
                              <button
                                onClick={() => setShowAddDossier(subject.id)}
                                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-3 transition-colors"
                              >
                                <Plus className="w-4 h-4" />إضافة دوسيه
                              </button>
                              {dossiers.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">لا توجد دوسيات لهذا المسار بعد.</p>
                              ) : (
                                dossiers.map(d => (
                                  <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div>
                                      <p className="text-sm font-medium text-white">{d.title}</p>
                                      <p className="text-xs text-muted-foreground">{d.pageCount} صفحة • {d.downloads.toLocaleString("ar")} تنزيل</p>
                                    </div>
                                    <button
                                      onClick={() => { if (confirm(`حذف "${d.title}"؟`)) deleteDossier.mutate(d.id); }}
                                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          {(activeTab === "worksheets" || activeTab === "exams") && (
                            <p className="text-sm text-muted-foreground py-4 text-center">سيتم إضافة هذه الإدارة قريبًا.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddSubject && (
        <AddSubjectModal
          onClose={() => setShowAddSubject(false)}
          onSuccess={() => {
            setShowAddSubject(false);
            qc.invalidateQueries({ queryKey: ["/api/subjects"] });
          }}
        />
      )}
      {showAddDossier !== null && (
        <AddDossierModal
          subjectId={showAddDossier}
          onClose={() => setShowAddDossier(null)}
          onSuccess={() => {
            setShowAddDossier(null);
            qc.invalidateQueries({ queryKey: ["/api/dossiers"] });
          }}
        />
      )}
    </AdminLayout>
  );
}

// ─── Units Panel ─────────────────────────────────────────────────────────────

function UnitsPanel({ subjectId, qc }: { subjectId: number; qc: ReturnType<typeof useQueryClient> }) {
  const { data: units, isLoading } = useUnits(subjectId);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const addUnit = useMutation({
    mutationFn: (title: string) =>
      customFetch(`/api/admin/subjects/${subjectId}/units`, {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      setNewTitle("");
      qc.invalidateQueries({ queryKey: ["/api/admin/subjects", subjectId, "units"] });
    },
  });

  const updateUnit = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      customFetch(`/api/admin/units/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/subjects", subjectId, "units"] });
    },
  });

  const deleteUnit = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/admin/units/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["/api/admin/subjects", subjectId, "units"] }),
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-3">
        الوحدات والمواد هي التصنيفات الداخلية لهذا المسار (مثل: النحو والصرف، البلاغة، الأدب والنصوص...).
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full bg-white/5 rounded-lg" />)}
        </div>
      ) : units?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد وحدات بعد. أضف أول وحدة أدناه.</p>
      ) : (
        <div className="space-y-2">
          {units?.map((unit, idx) => (
            <div key={unit.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 group">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <span className="text-xs font-bold text-muted-foreground/60 w-6 shrink-0">{idx + 1}</span>

              {editingId === unit.id ? (
                <>
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="flex-1 h-8 bg-white/10 border-white/20 text-white text-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") updateUnit.mutate({ id: unit.id, title: editTitle });
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => updateUnit.mutate({ id: unit.id, title: editTitle })}
                    className="p-1.5 text-success hover:bg-success/10 rounded transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-muted-foreground hover:text-white rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{unit.title}</span>
                  <button
                    onClick={() => { setEditingId(unit.id); setEditTitle(unit.title); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`حذف وحدة "${unit.title}"؟`)) deleteUnit.mutate(unit.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add unit input */}
      <div className="flex gap-2 mt-4">
        <Input
          placeholder="اسم الوحدة الجديدة (مثال: النحو والصرف)..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && newTitle.trim()) addUnit.mutate(newTitle.trim()); }}
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
        />
        <Button
          onClick={() => { if (newTitle.trim()) addUnit.mutate(newTitle.trim()); }}
          disabled={!newTitle.trim() || addUnit.isPending}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          إضافة
        </Button>
      </div>
    </div>
  );
}

// ─── Add Subject Modal ────────────────────────────────────────────────────────

const PALETTE = ["#5A2D82", "#0D9BB5", "#C79A2D", "#2FA84F", "#E05252", "#6366F1", "#F59E0B", "#10B981"];

function AddSubjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    grade: "12",
    field: "all",
    color: "#5A2D82",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      customFetch("/api/admin/subjects", { method: "POST", body: JSON.stringify(form) }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ في الحفظ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">إضافة مسار دراسي جديد</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">اسم المسار</label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="مثال: توجيهي، أول ثانوي، دورة الإعراب..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">الصف الدراسي</label>
              <select
                value={form.grade}
                onChange={e => setForm({ ...form, grade: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                {["7","8","9","10","11","12","توجيهي","عام"].map(g => (
                  <option key={g} value={g} className="bg-[#1a1030]">{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">الفرع</label>
              <select
                value={form.field}
                onChange={e => setForm({ ...form, field: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="all" className="bg-[#1a1030]">جميع الفروع</option>
                <option value="علمي" className="bg-[#1a1030]">علمي</option>
                <option value="أدبي" className="bg-[#1a1030]">أدبي</option>
                <option value="صناعي" className="bg-[#1a1030]">صناعي</option>
                <option value="زراعي" className="bg-[#1a1030]">زراعي</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">اللون</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1030] scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {save.isPending ? "جاري الحفظ..." : "حفظ المسار"}
          </Button>
          <Button variant="outline" onClick={onClose}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            إلغاء
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Dossier Modal ────────────────────────────────────────────────────────

function AddDossierModal({ subjectId, onClose, onSuccess }: { subjectId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", grade: "12", pageCount: 0, fileUrl: "", coverUrl: "" });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      customFetch("/api/admin/dossiers", {
        method: "POST",
        body: JSON.stringify({ ...form, subjectId, pageCount: Number(form.pageCount) }),
      }),
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">إضافة دوسيه جديد</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">العنوان</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="عنوان الدوسيه..." autoFocus />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الوصف</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none h-20"
              placeholder="وصف مختصر..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">الصف</label>
              <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                className="bg-white/5 border-white/10 text-white" placeholder="12" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">عدد الصفحات</label>
              <Input type="number" value={form.pageCount}
                onChange={e => setForm({ ...form, pageCount: parseInt(e.target.value) || 0 })}
                className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">رابط الملف (PDF)</label>
            <Input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="https://..." dir="ltr" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending}
            className="flex-1 bg-primary hover:bg-primary/90">
            {save.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
          <Button variant="outline" onClick={onClose}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
