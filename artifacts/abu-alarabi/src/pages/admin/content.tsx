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
  BookOpen,
  FileText,
  PenTool,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";

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

interface Dossier {
  id: number;
  title: string;
  subjectId: number;
  grade: string;
  pageCount: number;
  downloads: number;
  createdAt: string;
}

function useSubjects() {
  return useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => customFetch<Subject[]>("/api/subjects", { method: "GET" }),
  });
}

function useDossiers(subjectId?: number) {
  return useQuery({
    queryKey: ["/api/dossiers", subjectId],
    queryFn: () =>
      customFetch<{ items: Dossier[]; total: number }>(`/api/dossiers?${subjectId ? `subjectId=${subjectId}&` : ""}limit=100`, { method: "GET" }),
    enabled: true,
  });
}

export default function AdminContent() {
  const { data: subjects, isLoading } = useSubjects();
  const { data: dossierData } = useDossiers();
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dossiers" | "worksheets" | "exams">("dossiers");
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

  const filteredSubjects = subjects?.filter((s) =>
    search ? s.name.includes(search) || s.grade.includes(search) : true
  );

  const dossiersForSubject = (subjectId: number) =>
    dossierData?.items.filter((d) => d.subjectId === subjectId) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة المحتوى</h1>
            <p className="text-muted-foreground text-sm mt-0.5">المواد الدراسية والدوسيات والامتحانات</p>
          </div>
        </motion.div>

        {/* Search */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المواد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {/* Subjects tree */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full bg-white/5 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubjects?.map((subject, i) => {
              const isExpanded = expandedSubject === subject.id;
              const dossiers = dossiersForSubject(subject.id);

              return (
                <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="bg-white/5 border-white/10 overflow-hidden">
                    {/* Subject header */}
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                      className="w-full flex items-center gap-4 p-5 hover:bg-white/3 transition-colors text-right"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: subject.color ?? "#5A2D82" }}
                      >
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="font-semibold text-white">{subject.name}</div>
                        <div className="text-sm text-muted-foreground">
                          الصف {subject.grade}
                          {subject.field ? ` • ${subject.field}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{subject.dossierCount ?? 0}</span>
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{subject.worksheetCount ?? 0}</span>
                        <span className="flex items-center gap-1"><PenTool className="w-3.5 h-3.5" />{subject.examCount ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 mr-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`حذف مادة "${subject.name}"؟`)) deleteSubject.mutate(subject.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-white/3">
                        {/* Tabs */}
                        <div className="flex gap-1 px-5 pt-4 pb-0">
                          {[
                            { key: "dossiers" as const, label: "الدوسيات", icon: BookOpen },
                            { key: "worksheets" as const, label: "أوراق العمل", icon: FileText },
                            { key: "exams" as const, label: "الامتحانات", icon: PenTool },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                                activeTab === tab.key ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                              }`}
                            >
                              <tab.icon className="w-3.5 h-3.5" />
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          {activeTab === "dossiers" && (
                            <div className="space-y-2">
                              <button
                                onClick={() => setShowAddDossier(subject.id)}
                                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-3 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                إضافة دوسيه
                              </button>
                              {dossiers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">لا توجد دوسيات لهذه المادة</p>
                              ) : (
                                dossiers.map((d) => (
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
                          {activeTab === "worksheets" && (
                            <p className="text-sm text-muted-foreground">سيتم إضافة إدارة أوراق العمل قريبًا</p>
                          )}
                          {activeTab === "exams" && (
                            <p className="text-sm text-muted-foreground">سيتم إضافة إدارة الامتحانات قريبًا</p>
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

function AddDossierModal({ subjectId, onClose, onSuccess }: { subjectId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", grade: "12", pageCount: 0, fileUrl: "", coverUrl: "" });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      customFetch("/api/admin/dossiers", { method: "POST", body: JSON.stringify({ ...form, subjectId, pageCount: Number(form.pageCount) }) }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">إضافة دوسيه جديد</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">العنوان</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="عنوان الدوسيه..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none h-20" placeholder="وصف مختصر..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">الصف</label>
              <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="12" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">عدد الصفحات</label>
              <Input type="number" value={form.pageCount} onChange={(e) => setForm({ ...form, pageCount: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">رابط الملف (PDF)</label>
            <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="https://..." dir="ltr" />
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
