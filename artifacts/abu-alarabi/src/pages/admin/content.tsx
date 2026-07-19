import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState, type ChangeEvent } from "react";
import {
  BookOpen, FileText, PenTool, Plus, Trash2, Pencil,
  ChevronDown, ChevronRight, Search, GripVertical, Layers,
  X, Check, AlertCircle, Video, Eye, ExternalLink,
  Upload, Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subject {
  id: number;
  name: string;
  grade: string;
  field: string | null;
  color: string | null;
  iconUrl: string | null;
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
  fileUrl: string | null;
  createdAt: string;
}

interface Worksheet {
  id: number;
  title: string;
  subjectId: number;
  grade: string;
  difficulty: string | null;
  questionCount: number | null;
  estimatedMinutes: number | null;
  fileUrl: string | null;
  downloads: number;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const useSubjects = () =>
  useQuery({ queryKey: ["/api/subjects"], queryFn: () => customFetch<Subject[]>("/api/subjects", { method: "GET" }) });

const useUnits = (subjectId: number | null) =>
  useQuery({
    queryKey: ["/api/admin/subjects", subjectId, "units"],
    queryFn: () => customFetch<Unit[]>(`/api/admin/subjects/${subjectId}/units`, { method: "GET" }),
    enabled: subjectId !== null,
  });

const useDossiers = (subjectId: number) =>
  useQuery({
    queryKey: ["/api/dossiers", subjectId],
    queryFn: () => customFetch<{ items: Dossier[]; total: number }>(`/api/dossiers?subjectId=${subjectId}&limit=100`, { method: "GET" }),
  });

const useWorksheets = (subjectId: number) =>
  useQuery({
    queryKey: ["/api/worksheets", subjectId],
    queryFn: () => customFetch<{ items: Worksheet[]; total: number }>(`/api/worksheets?subjectId=${subjectId}&limit=100`, { method: "GET" }),
  });

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Video types & hooks ─────────────────────────────────────────────────────

interface AdminVideo {
  id: number;
  title: string;
  subjectId: number;
  subjectName: string;
  grade: string;
  provider: string;
  videoUrl: string;
  embedUrl: string;
  durationMinutes: number | null;
  coverUrl: string | null;
  views: number;
  isPublished: boolean;
  createdAt: string;
}

const useAdminVideos = () =>
  useQuery({ queryKey: ["/api/admin/videos"], queryFn: () => customFetch<AdminVideo[]>("/api/admin/videos", { method: "GET" }) });

const providerLabel = (p: string) => ({ youtube: "YouTube", vimeo: "Vimeo", bunny: "Bunny Stream", cloudflare: "Cloudflare", other: "خارجي" }[p] ?? p);

export default function AdminContent() {
  const { data: subjects, isLoading } = useSubjects();
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"units" | "dossiers" | "worksheets" | "exams">("units");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddDossier, setShowAddDossier] = useState<number | null>(null);
  const [showAddWorksheet, setShowAddWorksheet] = useState<number | null>(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videosExpanded, setVideosExpanded] = useState(false);
  const qc = useQueryClient();

  const deleteSubject = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/subjects"] }),
  });

  const filtered = subjects?.filter(s =>
    search ? s.name.includes(search) || s.grade.includes(search) : true
  );

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة المحتوى</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              المسارات الأكاديمية للغة العربية — وحداتها، دوسياتها، وأوراق العمل
            </p>
          </div>
          <Button onClick={() => setShowAddSubject(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> إضافة مسار جديد
          </Button>
        </motion.div>

        {/* Videos section */}
        <VideosSection
          expanded={videosExpanded}
          onToggle={() => setVideosExpanded(!videosExpanded)}
          onAdd={() => setShowAddVideo(true)}
          qc={qc}
        />

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
        {!isLoading && filtered?.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">لا توجد مسارات بعد</h3>
              <p className="text-muted-foreground text-sm mb-6">
                أضف مساراتك الأكاديمية ثم أضف وحداتها، دوسياتها، وأوراق العمل.
              </p>
              <Button onClick={() => setShowAddSubject(true)} className="gap-2">
                <Plus className="w-4 h-4" /> إضافة أول مسار
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subjects list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full bg-white/5 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered?.map((subject, i) => {
              const isExpanded = expandedSubject === subject.id;
              return (
                <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="bg-white/5 border-white/10 overflow-hidden">

                    {/* Row */}
                    <div
                      onClick={() => { setExpandedSubject(isExpanded ? null : subject.id); setActiveTab("units"); }}
                      className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-colors cursor-pointer select-none"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-base"
                        style={{ backgroundColor: subject.color ?? "#5A2D82" }}>
                        {subject.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="font-semibold text-white">{subject.name}</div>
                        <div className="text-sm text-muted-foreground">
                          الصف {subject.grade}{subject.field ? ` • ${subject.field}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm(`حذف مسار "${subject.name}"؟`)) deleteSubject.mutate(subject.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-black/10">
                        <div className="flex gap-1 px-5 pt-4">
                          {[
                            { key: "units" as const, label: "الوحدات", icon: Layers },
                            { key: "dossiers" as const, label: "الدوسيات", icon: BookOpen },
                            { key: "worksheets" as const, label: "أوراق العمل", icon: FileText },
                            { key: "exams" as const, label: "الامتحانات", icon: PenTool },
                          ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}>
                              <tab.icon className="w-3.5 h-3.5" />{tab.label}
                            </button>
                          ))}
                        </div>
                        <div className="p-5">
                          {activeTab === "units" && <UnitsPanel subjectId={subject.id} qc={qc} />}
                          {activeTab === "dossiers" && (
                            <DossiersPanel
                              subjectId={subject.id}
                              qc={qc}
                              onAdd={() => setShowAddDossier(subject.id)}
                            />
                          )}
                          {activeTab === "worksheets" && (
                            <WorksheetsPanel
                              subjectId={subject.id}
                              qc={qc}
                              onAdd={() => setShowAddWorksheet(subject.id)}
                            />
                          )}
                          {activeTab === "exams" && (
                            <p className="text-sm text-muted-foreground py-4 text-center">إدارة الامتحانات ستُضاف قريباً.</p>
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

      {showAddSubject && (
        <AddSubjectModal
          onClose={() => setShowAddSubject(false)}
          onSuccess={() => { setShowAddSubject(false); qc.invalidateQueries({ queryKey: ["/api/subjects"] }); }}
        />
      )}
      {showAddDossier !== null && (
        <AddDossierModal
          subjectId={showAddDossier}
          onClose={() => setShowAddDossier(null)}
          onSuccess={() => { setShowAddDossier(null); qc.invalidateQueries({ queryKey: ["/api/dossiers", showAddDossier] }); }}
        />
      )}
      {showAddWorksheet !== null && (
        <AddWorksheetModal
          subjectId={showAddWorksheet}
          onClose={() => setShowAddWorksheet(null)}
          onSuccess={() => { setShowAddWorksheet(null); qc.invalidateQueries({ queryKey: ["/api/worksheets", showAddWorksheet] }); }}
        />
      )}
      {showAddVideo && (
        <AddVideoModal
          subjects={subjects ?? []}
          onClose={() => setShowAddVideo(false)}
          onSuccess={() => { setShowAddVideo(false); qc.invalidateQueries({ queryKey: ["/api/admin/videos"] }); }}
        />
      )}
    </AdminLayout>
  );
}

// ─── Units Panel ──────────────────────────────────────────────────────────────

function UnitsPanel({ subjectId, qc }: { subjectId: number; qc: ReturnType<typeof useQueryClient> }) {
  const { data: units, isLoading } = useUnits(subjectId);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const addUnit = useMutation({
    mutationFn: (title: string) => customFetch(`/api/admin/subjects/${subjectId}/units`, { method: "POST", body: JSON.stringify({ title }) }),
    onSuccess: () => { setNewTitle(""); qc.invalidateQueries({ queryKey: ["/api/admin/subjects", subjectId, "units"] }); },
  });
  const updateUnit = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => customFetch(`/api/admin/units/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
    onSuccess: () => { setEditingId(null); qc.invalidateQueries({ queryKey: ["/api/admin/subjects", subjectId, "units"] }); },
  });
  const deleteUnit = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/units/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/subjects", subjectId, "units"] }),
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">الوحدات هي التصنيفات الداخلية للمسار (مثال: النحو، البلاغة، الأدب...).</p>
      {isLoading ? <Skeleton className="h-24 bg-white/5 rounded-xl" /> :
        units?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">أضف أول وحدة أدناه.</p> : (
          <div className="space-y-2">
            {units?.map((unit, idx) => (
              <div key={unit.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 group">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-bold text-muted-foreground/60 w-6 shrink-0">{idx + 1}</span>
                {editingId === unit.id ? (
                  <>
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="flex-1 h-8 bg-white/10 border-white/20 text-white text-sm" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") updateUnit.mutate({ id: unit.id, title: editTitle }); if (e.key === "Escape") setEditingId(null); }} />
                    <button onClick={() => updateUnit.mutate({ id: unit.id, title: editTitle })} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:text-white rounded transition-colors"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white">{unit.title}</span>
                    <button onClick={() => { setEditingId(unit.id); setEditTitle(unit.title); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm(`حذف "${unit.title}"؟`)) deleteUnit.mutate(unit.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      <div className="flex gap-2 mt-4">
        <Input placeholder="اسم الوحدة الجديدة..." value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && newTitle.trim()) addUnit.mutate(newTitle.trim()); }}
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />
        <Button onClick={() => { if (newTitle.trim()) addUnit.mutate(newTitle.trim()); }} disabled={!newTitle.trim() || addUnit.isPending} size="sm" className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> إضافة
        </Button>
      </div>
    </div>
  );
}

// ─── Dossiers Panel ───────────────────────────────────────────────────────────

function DossiersPanel({ subjectId, qc, onAdd }: { subjectId: number; qc: ReturnType<typeof useQueryClient>; onAdd: () => void }) {
  const { data, isLoading } = useDossiers(subjectId);
  const items = data?.items ?? [];

  const del = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/dossiers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dossiers", subjectId] }),
  });

  return (
    <div className="space-y-2">
      <button onClick={onAdd} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-3 transition-colors font-medium">
        <Plus className="w-4 h-4" /> إضافة دوسيه جديد
      </button>
      {isLoading ? <Skeleton className="h-20 bg-white/5 rounded-xl" /> :
        items.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">لا توجد دوسيات لهذا المسار بعد.</p> : (
          <div className="space-y-2">
            {items.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-primary/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.pageCount} صفحة • {(d.downloads ?? 0).toLocaleString("ar")} تنزيل</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {d.fileUrl && (
                    <a href={d.fileUrl} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary transition-colors text-xs opacity-0 group-hover:opacity-100">
                      فتح
                    </a>
                  )}
                  <button onClick={() => { if (confirm(`حذف "${d.title}"؟`)) del.mutate(d.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Worksheets Panel ─────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const DIFFICULTY_COLOR: Record<string, string> = { easy: "text-green-400", medium: "text-yellow-400", hard: "text-red-400" };

function WorksheetsPanel({ subjectId, qc, onAdd }: { subjectId: number; qc: ReturnType<typeof useQueryClient>; onAdd: () => void }) {
  const { data, isLoading } = useWorksheets(subjectId);
  const items = data?.items ?? [];

  const del = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/worksheets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/worksheets", subjectId] }),
  });

  return (
    <div className="space-y-2">
      <button onClick={onAdd} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-3 transition-colors font-medium">
        <Plus className="w-4 h-4" /> إضافة ورقة عمل جديدة
      </button>
      {isLoading ? <Skeleton className="h-20 bg-white/5 rounded-xl" /> :
        items.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">لا توجد أوراق عمل لهذا المسار بعد.</p> : (
          <div className="space-y-2">
            {items.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-secondary/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{w.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {w.difficulty && <span className={DIFFICULTY_COLOR[w.difficulty] ?? ""}>{DIFFICULTY_LABEL[w.difficulty] ?? w.difficulty}</span>}
                      {w.questionCount && <span>• {w.questionCount} سؤال</span>}
                      {w.estimatedMinutes && <span>• {w.estimatedMinutes} دقيقة</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {w.fileUrl && (
                    <a href={w.fileUrl} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary transition-colors text-xs opacity-0 group-hover:opacity-100">
                      فتح
                    </a>
                  )}
                  <button onClick={() => { if (confirm(`حذف "${w.title}"؟`)) del.mutate(w.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Add Subject Modal ────────────────────────────────────────────────────────

const PALETTE = ["#5A2D82", "#0D9BB5", "#C79A2D", "#2FA84F", "#E05252", "#6366F1", "#F59E0B", "#10B981"];

function AddSubjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", grade: "12", field: "all", color: "#5A2D82" });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => customFetch("/api/admin/subjects", { method: "POST", body: JSON.stringify(form) }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ في الحفظ"),
  });

  return (
    <Modal title="إضافة مسار دراسي جديد" onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم المسار">
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="مثال: توجيهي، دورة الإعراب..." autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الصف الدراسي">
            <Select value={form.grade} onChange={v => setForm({ ...form, grade: v })}
              options={["7","8","9","10","11","12","توجيهي","عام"].map(g => ({ value: g, label: g }))} />
          </Field>
          <Field label="الفرع">
            <Select value={form.field} onChange={v => setForm({ ...form, field: v })}
              options={[
                { value: "all", label: "جميع الفروع" },
                { value: "علمي", label: "علمي" },
                { value: "أدبي", label: "أدبي" },
                { value: "صناعي", label: "صناعي" },
                { value: "زراعي", label: "زراعي" },
              ]} />
          </Field>
        </div>
        <Field label="اللون">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map(color => (
              <button key={color} onClick={() => setForm({ ...form, color })}
                className={`w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1030] scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
        </Field>
        {error && <ErrorMsg>{error}</ErrorMsg>}
      </div>
      <ModalActions>
        <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending} className="flex-1 bg-primary hover:bg-primary/90">
          {save.isPending ? "جاري الحفظ..." : "حفظ المسار"}
        </Button>
        <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
      </ModalActions>
    </Modal>
  );
}

// ─── Add Dossier Modal ────────────────────────────────────────────────────────

function AddDossierModal({ subjectId, onClose, onSuccess }: { subjectId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", grade: "12", pageCount: 0, fileUrl: "", coverUrl: "" });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState("");

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) { setError("الرجاء اختيار ملف PDF فقط"); return; }
    setError(""); setUploading(true);

    try {
      // 1. Request presigned upload URL
      const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
        "/api/storage/uploads/request-url",
        {
          method: "POST",
          body: JSON.stringify({ name: file.name, size: file.size, contentType: "application/pdf" }),
        }
      );

      // 2. Upload file directly to GCS
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      if (!uploadRes.ok) throw new Error("فشل رفع الملف");

      // 3. Set fileUrl to serving path
      const servingUrl = `/api/storage${objectPath}`;
      setForm((prev) => ({ ...prev, fileUrl: servingUrl }));
      setUploadedName(file.name);
    } catch (err: any) {
      setError(err.message ?? "خطأ في رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: () => customFetch("/api/admin/dossiers", {
      method: "POST",
      body: JSON.stringify({ ...form, subjectId, pageCount: Number(form.pageCount) }),
    }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ"),
  });

  return (
    <Modal title="إضافة دوسيه جديد" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عنوان الدوسيه">
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="عنوان الدوسيه..." autoFocus />
        </Field>
        <Field label="الوصف (اختياري)">
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none h-20"
            placeholder="وصف مختصر..." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الصف">
            <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="12" />
          </Field>
          <Field label="عدد الصفحات">
            <Input type="number" value={form.pageCount || ""}
              onChange={e => setForm({ ...form, pageCount: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-white/10 text-white" placeholder="0" />
          </Field>
        </div>

        {/* File Upload */}
        <Field label="ملف PDF">
          <div className="space-y-2">
            <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${
              uploadedName ? "border-green-500/40 bg-green-500/10" : "border-white/10 hover:border-white/30"
            }`}>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-white/70">جاري الرفع...</span>
                </>
              ) : uploadedName ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 truncate max-w-[200px]">{uploadedName}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-white/50" />
                  <span className="text-sm text-white/50">اضغط لرفع ملف PDF</span>
                </>
              )}
            </label>
            {/* Or paste URL manually */}
            <Input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-xs" placeholder="أو أدخل رابطاً مباشراً للملف" dir="ltr" />
          </div>
        </Field>

        <Field label="رابط الغلاف (اختياري)">
          <Input value={form.coverUrl} onChange={e => setForm({ ...form, coverUrl: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="https://..." dir="ltr" />
        </Field>
        {error && <ErrorMsg>{error}</ErrorMsg>}
      </div>
      <ModalActions>
        <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending || uploading} className="flex-1 bg-primary hover:bg-primary/90">
          {save.isPending ? "جاري الحفظ..." : "حفظ الدوسيه"}
        </Button>
        <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
      </ModalActions>
    </Modal>
  );
}

// ─── Add Worksheet Modal ──────────────────────────────────────────────────────

function AddWorksheetModal({ subjectId, onClose, onSuccess }: { subjectId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", grade: "12", difficulty: "medium", questionCount: 0, estimatedMinutes: 0, fileUrl: "" });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => customFetch("/api/admin/worksheets", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        subjectId,
        questionCount: Number(form.questionCount) || null,
        estimatedMinutes: Number(form.estimatedMinutes) || null,
      }),
    }),
    onSuccess,
    onError: (e: any) => setError(e.message ?? "خطأ"),
  });

  return (
    <Modal title="إضافة ورقة عمل جديدة" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عنوان ورقة العمل">
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="عنوان ورقة العمل..." autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الصف">
            <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="12" />
          </Field>
          <Field label="مستوى الصعوبة">
            <Select value={form.difficulty} onChange={v => setForm({ ...form, difficulty: v })}
              options={[
                { value: "easy", label: "سهل" },
                { value: "medium", label: "متوسط" },
                { value: "hard", label: "صعب" },
              ]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عدد الأسئلة">
            <Input type="number" value={form.questionCount || ""}
              onChange={e => setForm({ ...form, questionCount: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-white/10 text-white" placeholder="0" />
          </Field>
          <Field label="الوقت المقدر (دقيقة)">
            <Input type="number" value={form.estimatedMinutes || ""}
              onChange={e => setForm({ ...form, estimatedMinutes: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-white/10 text-white" placeholder="0" />
          </Field>
        </div>
        <Field label="رابط الملف (PDF)">
          <Input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="https://..." dir="ltr" />
        </Field>
        {error && <ErrorMsg>{error}</ErrorMsg>}
      </div>
      <ModalActions>
        <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending} className="flex-1 bg-primary hover:bg-primary/90">
          {save.isPending ? "جاري الحفظ..." : "حفظ ورقة العمل"}
        </Button>
        <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
      </ModalActions>
    </Modal>
  );
}

// ─── Videos Section ───────────────────────────────────────────────────────────

function VideosSection({
  expanded, onToggle, onAdd, qc,
}: {
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { data: videos, isLoading } = useAdminVideos();

  const del = useMutation({
    mutationFn: (id: number) => customFetch(`/api/admin/videos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/videos"] }),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) =>
      customFetch(`/api/admin/videos/${id}`, { method: "PATCH", body: JSON.stringify({ isPublished }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/videos"] }),
  });

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden">
      {/* Header row */}
      <div
        onClick={onToggle}
        className="flex items-center gap-4 p-5 hover:bg-white/5 transition-colors cursor-pointer select-none"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/20">
          <Video className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white">مكتبة الفيديوهات</div>
          <div className="text-sm text-muted-foreground">
            فيديوهات مضمّنة من YouTube / Vimeo / Bunny / Cloudflare — {videos?.length ?? 0} فيديو
          </div>
        </div>
        <Button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          size="sm"
          className="gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary shrink-0 border-0"
        >
          <Plus className="w-4 h-4" /> إضافة فيديو
        </Button>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10 bg-black/10 p-5">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-white/5 rounded-xl" />)}
            </div>
          ) : videos?.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد فيديوهات بعد — أضف أول فيديو من الزر أعلاه.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {videos?.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors group">
                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                    {v.coverUrl ? (
                      <img src={v.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{v.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{v.subjectName}</span>
                      <span>·</span>
                      <span className="capitalize">{providerLabel(v.provider)}</span>
                      {v.durationMinutes && <><span>·</span><span>{v.durationMinutes} د</span></>}
                      <span>·</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.views}</span>
                    </div>
                  </div>

                  {/* Published badge */}
                  <button
                    onClick={() => togglePublish.mutate({ id: v.id, isPublished: !v.isPublished })}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${v.isPublished ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
                  >
                    {v.isPublished ? "منشور" : "مسودة"}
                  </button>

                  {/* Actions */}
                  <a href={v.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white transition-all"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => { if (confirm(`حذف "${v.title}"؟`)) del.mutate(v.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Add Video Modal ──────────────────────────────────────────────────────────

interface Subject { id: number; name: string; grade: string; field: string | null; color: string | null; iconUrl: string | null; }

function AddVideoModal({ subjects, onClose, onSuccess }: { subjects: Subject[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", subjectId: subjects[0]?.id ?? 0, grade: "",
    provider: "youtube" as string, videoUrl: "", durationMinutes: "", coverUrl: "",
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => customFetch("/api/admin/videos", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : undefined,
      }),
    }),
    onSuccess,
    onError: () => setError("حدث خطأ أثناء الحفظ. تأكد من صحة البيانات."),
  });

  const providerOptions = [
    { value: "youtube", label: "YouTube" },
    { value: "vimeo", label: "Vimeo" },
    { value: "bunny", label: "Bunny Stream" },
    { value: "cloudflare", label: "Cloudflare Stream" },
    { value: "other", label: "مزود آخر" },
  ];

  const placeholders: Record<string, string> = {
    youtube: "https://www.youtube.com/watch?v=xxxx أو https://youtu.be/xxxx",
    vimeo: "https://vimeo.com/123456789",
    bunny: "https://iframe.mediadelivery.net/embed/libraryId/videoId",
    cloudflare: "https://iframe.cloudflarestream.com/videoId",
    other: "https://...",
  };

  return (
    <Modal title="إضافة فيديو جديد" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عنوان الفيديو *">
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="مثال: شرح درس الفاعل" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="المادة الدراسية *">
            <Select value={String(form.subjectId)} onChange={v => setForm({ ...form, subjectId: parseInt(v) })}
              options={subjects.map(s => ({ value: String(s.id), label: `${s.name} (${s.grade})` }))} />
          </Field>
          <Field label="الصف *">
            <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="مثال: الثاني عشر" />
          </Field>
        </div>

        <Field label="مزوّد الفيديو *">
          <Select value={form.provider} onChange={v => setForm({ ...form, provider: v })} options={providerOptions} />
        </Field>

        <Field label="رابط الفيديو *">
          <Input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
            className="bg-white/5 border-white/10 text-white font-mono text-xs" placeholder={placeholders[form.provider]}
            dir="ltr" />
          <p className="text-[11px] text-muted-foreground mt-1">
            {form.provider === "youtube"
              ? "أدخل رابط المشاهدة العادي أو المختصر — سيتم تحويله تلقائياً لرابط تضمين."
              : form.provider === "bunny" || form.provider === "cloudflare"
              ? "أدخل رابط الـ embed مباشرةً من لوحة تحكم المزوّد."
              : "أدخل رابط الفيديو المباشر."}
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="مدة الفيديو (دقيقة)">
            <Input type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })}
              className="bg-white/5 border-white/10 text-white" placeholder="45" />
          </Field>
          <Field label="رابط صورة الغلاف (اختياري)">
            <Input value={form.coverUrl} onChange={e => setForm({ ...form, coverUrl: e.target.value })}
              className="bg-white/5 border-white/10 text-white font-mono text-xs" placeholder="https://..." dir="ltr" />
          </Field>
        </div>

        <Field label="وصف مختصر (اختياري)">
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="bg-white/5 border-white/10 text-white" placeholder="ملخص محتوى الفيديو" />
        </Field>

        {form.provider === "youtube" && form.videoUrl && (
          <p className="text-[11px] text-muted-foreground bg-white/5 rounded-lg p-2 font-mono" dir="ltr">
            💡 YouTube thumbnails تُولَّد تلقائياً — لا حاجة لرابط غلاف.
          </p>
        )}

        {error && <ErrorMsg>{error}</ErrorMsg>}
      </div>
      <ModalActions>
        <Button
          onClick={() => save.mutate()}
          disabled={!form.title.trim() || !form.videoUrl.trim() || !form.grade.trim() || save.isPending}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {save.isPending ? "جاري الحفظ..." : "إضافة الفيديو"}
        </Button>
        <Button variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">إلغاء</Button>
      </ModalActions>
    </Modal>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1030] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 mt-6">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
      {options.map(o => <option key={o.value} value={o.value} className="bg-[#1a1030]">{o.label}</option>)}
    </select>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{children}
    </div>
  );
}
