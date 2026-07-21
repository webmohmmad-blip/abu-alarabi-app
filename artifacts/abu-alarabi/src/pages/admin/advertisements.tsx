/**
 * Admin — Homepage Advertisement Management
 * Route: /admin/advertisements
 */
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Edit2, Trash2, Eye, Power, PowerOff, Upload,
  X, Image as ImageIcon, ExternalLink, ChevronUp, ChevronDown,
  Loader2,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Ad {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageKey: string;
  mobileImageUrl: string | null;
  mobileImageKey: string | null;
  tabletImageUrl: string | null;
  tabletImageKey: string | null;
  linkUrl: string | null;
  openInNewTab: boolean;
  ctaText: string | null;
  displayStyle: string;
  isActive: boolean;
  position: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdForm {
  title: string;
  description: string;
  imageKey: string;
  imagePreview: string;
  mobileImageKey: string;
  mobileImagePreview: string;
  tabletImageKey: string;
  tabletImagePreview: string;
  linkUrl: string;
  openInNewTab: boolean;
  ctaText: string;
  displayStyle: string;
  isActive: boolean;
  position: string;
  startAt: string;
  endAt: string;
}

const emptyForm = (): AdForm => ({
  title: "",
  description: "",
  imageKey: "",
  imagePreview: "",
  mobileImageKey: "",
  mobileImagePreview: "",
  tabletImageKey: "",
  tabletImagePreview: "",
  linkUrl: "",
  openInNewTab: false,
  ctaText: "",
  displayStyle: "image_only",
  isActive: true,
  position: "0",
  startAt: "",
  endAt: "",
});

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchAllAds(): Promise<Ad[]> {
  const data = await customFetch<{ ok: boolean; items: Ad[] }>("/api/admin/advertisements");
  return data.items ?? [];
}

async function uploadImage(file: File): Promise<{ objectPath: string; previewUrl: string }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP.");
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`حجم الملف يجب أن يكون أقل من ${MAX_SIZE_MB} ميغابايت.`);
  }
  const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
    "/api/storage/uploads/request-url",
    { method: "POST", body: JSON.stringify({ contentType: file.type, name: file.name, size: file.size }) },
  );
  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return { objectPath, previewUrl: `/api/storage${objectPath}` };
}

// ── Image upload field ────────────────────────────────────────────────────────

function ImageUploadField({
  label, hint, previewUrl, uploading, error,
  onChange, onClear,
}: {
  label: string; hint: string; previewUrl: string; uploading: boolean; error?: string;
  onChange: (file: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm font-bold text-foreground mb-1">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{hint}</p>
      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt={label}
            className="h-28 rounded-xl object-cover border border-border"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-2 -left-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/80 transition-colors"
            aria-label="إزالة الصورة"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span className="text-xs">{uploading ? "جارٍ الرفع…" : "اختر صورة"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminAdvertisements() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState<AdForm>(emptyForm());
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin", "advertisements"],
    queryFn: fetchAllAds,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "advertisements"] });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch<{ ok: boolean }>("/api/admin/advertisements", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      customFetch<{ ok: boolean }>(`/api/admin/advertisements/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      customFetch(`/api/admin/advertisements/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/admin/advertisements/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); setDeleteId(null); },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: number; position: number }[]) =>
      customFetch("/api/admin/advertisements/reorder", {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
    onSuccess: invalidate,
  });

  function openCreate() {
    setForm(emptyForm());
    setEditing(null);
    setFormError("");
    setModal("create");
  }

  function openEdit(ad: Ad) {
    setForm({
      title: ad.title,
      description: ad.description ?? "",
      imageKey: ad.imageKey,
      imagePreview: ad.imageUrl ?? "",
      mobileImageKey: ad.mobileImageKey ?? "",
      mobileImagePreview: ad.mobileImageUrl ?? "",
      tabletImageKey: ad.tabletImageKey ?? "",
      tabletImagePreview: ad.tabletImageUrl ?? "",
      linkUrl: ad.linkUrl ?? "",
      openInNewTab: ad.openInNewTab,
      ctaText: ad.ctaText ?? "",
      displayStyle: ad.displayStyle,
      isActive: ad.isActive,
      position: String(ad.position),
      startAt: ad.startAt ? ad.startAt.slice(0, 16) : "",
      endAt: ad.endAt ? ad.endAt.slice(0, 16) : "",
    });
    setEditing(ad);
    setFormError("");
    setModal("edit");
  }

  function closeModal() {
    setModal("closed");
    setEditing(null);
    setUploadErrors({});
    setUploading({});
  }

  async function handleImageUpload(
    field: "image" | "mobileImage" | "tabletImage",
    file: File,
  ) {
    setUploading(u => ({ ...u, [field]: true }));
    setUploadErrors(e => ({ ...e, [field]: "" }));
    try {
      const { objectPath, previewUrl } = await uploadImage(file);
      const keyField = field + "Key" as "imageKey" | "mobileImageKey" | "tabletImageKey";
      const previewField = field + "Preview" as "imagePreview" | "mobileImagePreview" | "tabletImagePreview";
      setForm(f => ({ ...f, [keyField]: objectPath, [previewField]: previewUrl }));
    } catch (e) {
      setUploadErrors(u => ({ ...u, [field]: (e as Error).message }));
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  }

  function clearImage(field: "image" | "mobileImage" | "tabletImage") {
    const keyField = field + "Key" as "imageKey" | "mobileImageKey" | "tabletImageKey";
    const previewField = field + "Preview" as "imagePreview" | "mobileImagePreview" | "tabletImagePreview";
    setForm(f => ({ ...f, [keyField]: "", [previewField]: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) return setFormError("يرجى إدخال عنوان الإعلان");
    if (!form.imageKey) return setFormError("صورة الإعلان مطلوبة");
    if (form.linkUrl && !/^(https?:\/\/|\/)/.test(form.linkUrl))
      return setFormError("الرابط غير صالح");
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt))
      return setFormError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");

    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      imageKey: form.imageKey,
      mobileImageKey: form.mobileImageKey || null,
      tabletImageKey: form.tabletImageKey || null,
      linkUrl: form.linkUrl.trim() || null,
      openInNewTab: form.openInNewTab,
      ctaText: form.ctaText.trim() || null,
      displayStyle: form.displayStyle,
      isActive: form.isActive,
      position: parseInt(form.position) || 0,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    };

    if (modal === "edit" && editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function moveAd(id: number, dir: -1 | 1) {
    const sorted = [...ads].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(a => a.id === id);
    if (idx < 0) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const items = sorted.map((a, i) => {
      if (i === idx) return { id: a.id, position: sorted[swapIdx].position };
      if (i === swapIdx) return { id: a.id, position: sorted[idx].position };
      return { id: a.id, position: a.position };
    });
    reorderMutation.mutate(items);
  }

  function isCurrentlyActive(ad: Ad): boolean {
    if (!ad.isActive) return false;
    const n = Date.now();
    if (ad.startAt && new Date(ad.startAt).getTime() > n) return false;
    if (ad.endAt && new Date(ad.endAt).getTime() <= n) return false;
    return true;
  }

  const sorted = [...ads].sort((a, b) => a.position - b.position);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div dir="rtl" className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">إعلانات الصفحة الرئيسية</h1>
            <p className="text-muted-foreground text-sm mt-1">
              أضف وأدر اللافتات الإعلانية التي تظهر في الصفحة الرئيسية للطلاب.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة إعلان
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ImageIcon className="w-14 h-14 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">لا توجد إعلانات مضافة بعد</h3>
            <p className="text-muted-foreground text-sm mb-6">أضف إعلانك الأول ليظهر في الصفحة الرئيسية.</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة إعلان جديد
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs font-bold">
                    <th className="px-4 py-3 text-right">الترتيب</th>
                    <th className="px-4 py-3 text-right">الصورة</th>
                    <th className="px-4 py-3 text-right">العنوان</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">البداية</th>
                    <th className="px-4 py-3 text-right">النهاية</th>
                    <th className="px-4 py-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((ad, idx) => (
                    <tr key={ad.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      {/* Order */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveAd(ad.id, -1)}
                            disabled={idx === 0 || reorderMutation.isPending}
                            aria-label="رفع"
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveAd(ad.id, 1)}
                            disabled={idx === sorted.length - 1 || reorderMutation.isPending}
                            aria-label="خفض"
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        {ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-20 h-12 object-cover rounded-lg border border-border"
                          />
                        ) : (
                          <div className="w-20 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </td>

                      {/* Title + link */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-bold text-foreground truncate">{ad.title}</p>
                        {ad.linkUrl && (
                          <a
                            href={ad.linkUrl}
                            target={ad.openInNewTab ? "_blank" : "_self"}
                            rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
                            className="text-xs text-secondary flex items-center gap-1 hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {ad.linkUrl}
                          </a>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isCurrentlyActive(ad) ? (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs font-bold">
                            نشط
                          </Badge>
                        ) : ad.isActive ? (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-xs font-bold">
                            مجدول
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground text-xs font-bold">
                            معطّل
                          </Badge>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {ad.startAt ? new Date(ad.startAt).toLocaleDateString("ar-JO") : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {ad.endAt ? new Date(ad.endAt).toLocaleDateString("ar-JO") : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Preview */}
                          <button
                            onClick={() => setPreviewAd(ad)}
                            title="معاينة"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(ad)}
                            title="تعديل"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Toggle */}
                          <button
                            onClick={() => toggleMutation.mutate({ id: ad.id, isActive: !ad.isActive })}
                            title={ad.isActive ? "تعطيل" : "تفعيل"}
                            className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${ad.isActive ? "text-success hover:text-destructive" : "text-muted-foreground hover:text-success"}`}
                          >
                            {ad.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteId(ad.id)}
                            title="حذف"
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {modal !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-black text-foreground">
                {modal === "create" ? "إضافة إعلان جديد" : "تعديل الإعلان"}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-[#374151] mb-1">
                  عنوان الإعلان <span className="text-[#EF4444]">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="أدخل عنوان الإعلان"
                  dir="rtl"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-[#374151] mb-1">وصف اختياري</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="وصف مختصر للإعلان (اختياري)"
                  rows={2}
                  dir="rtl"
                  className="w-full px-4 py-3 rounded-xl border border-[#D1D5DB] bg-white text-[#1F2937] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[rgba(90,45,130,.2)] focus:border-[#5A2D82] resize-none transition-all"
                />
              </div>

              {/* Desktop image */}
              <ImageUploadField
                label="صورة الإعلان للكمبيوتر *"
                hint="الأبعاد الموصى بها: 1600 × 500 — JPG / PNG / WebP — الحد الأقصى 5 ميغابايت"
                previewUrl={form.imagePreview}
                uploading={!!uploading.image}
                error={uploadErrors.image}
                onChange={f => handleImageUpload("image", f)}
                onClear={() => clearImage("image")}
              />

              {/* Mobile image */}
              <ImageUploadField
                label="صورة للموبايل (اختياري)"
                hint="750 × 900 أو عمودية — إذا تُركت فارغة تُستخدم صورة الكمبيوتر"
                previewUrl={form.mobileImagePreview}
                uploading={!!uploading.mobileImage}
                error={uploadErrors.mobileImage}
                onChange={f => handleImageUpload("mobileImage", f)}
                onClear={() => clearImage("mobileImage")}
              />

              {/* Tablet image */}
              <ImageUploadField
                label="صورة للتابلت (اختياري)"
                hint="1200 × 500 — إذا تُركت فارغة تُستخدم صورة الكمبيوتر"
                previewUrl={form.tabletImagePreview}
                uploading={!!uploading.tabletImage}
                error={uploadErrors.tabletImage}
                onChange={f => handleImageUpload("tabletImage", f)}
                onClear={() => clearImage("tabletImage")}
              />

              {/* Link URL */}
              <div>
                <label className="block text-sm font-bold text-[#374151] mb-1">رابط الإعلان</label>
                <Input
                  value={form.linkUrl}
                  onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="https://example.com أو /dossiers"
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
                  روابط داخلية مقبولة: <span className="font-mono">/dossiers /worksheets /exams /weekly-quiz /study-room</span>
                  {" — "}روابط خارجية: <span className="font-mono">https://...</span>
                </p>
                {form.linkUrl && !/^(https?:\/\/|\/)/.test(form.linkUrl) && (
                  <p className="text-xs text-[#EF4444] mt-1">الرابط غير صالح</p>
                )}
                {form.linkUrl && /^(https?:\/\/|\/)/.test(form.linkUrl) && (
                  <p className="text-xs text-[#9CA3AF] mt-1 flex items-center gap-1">
                    <span>النقر على الصورة سيفتح الرابط</span>
                    <a
                      href={form.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 transition-colors mr-2"
                      onClick={e => e.stopPropagation()}
                    >
                      اختبار الرابط ←
                    </a>
                  </p>
                )}
              </div>

              {/* Open in new tab + CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#374151] mb-1">نص زر الدعوة (اختياري)</label>
                  <Input
                    value={form.ctaText}
                    onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                    placeholder="مثال: اعرف المزيد"
                    dir="rtl"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none pb-3">
                    <input
                      type="checkbox"
                      checked={form.openInNewTab}
                      onChange={e => setForm(f => ({ ...f, openInNewTab: e.target.checked }))}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-[#374151]">فتح في نافذة جديدة</span>
                  </label>
                </div>
              </div>

              {/* Display style */}
              <div>
                <label className="block text-sm font-bold text-[#374151] mb-2">نمط العرض</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: "image_only", label: "صورة فقط" },
                    { value: "overlay", label: "نص فوق الصورة" },
                    { value: "split", label: "تقسيم" },
                    { value: "minimal", label: "مدمج" },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-center text-xs font-bold p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        form.displayStyle === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="displayStyle"
                        value={opt.value}
                        checked={form.displayStyle === opt.value}
                        onChange={e => setForm(f => ({ ...f, displayStyle: e.target.value }))}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Status + Position */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#374151] mb-2">حالة الإعلان</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-[#374151]">نشط</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#374151] mb-1">ترتيب الظهور</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#374151] mb-1">تاريخ بداية العرض</label>
                  <Input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#374151] mb-1">تاريخ نهاية العرض</label>
                  <Input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                    dir="ltr"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isPending || Object.values(uploading).some(Boolean)} className="gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modal === "create" ? "إضافة الإعلان" : "حفظ التغييرات"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" dir="rtl">
            <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-black text-foreground mb-2">حذف الإعلان</h3>
            <p className="text-muted-foreground text-sm mb-6">
              هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────────── */}
      {previewAd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewAd(null)}
        >
          <div
            className="w-full max-w-3xl"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {previewAd.linkUrl && (
                  <>
                    <span className="text-white/70 text-sm">النقر على الصورة سيفتح الرابط</span>
                    <a
                      href={previewAd.linkUrl}
                      target={previewAd.openInNewTab ? "_blank" : "_self"}
                      rel={previewAd.openInNewTab ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      اختبار الرابط
                    </a>
                  </>
                )}
              </div>
              <button
                onClick={() => setPreviewAd(null)}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                aria-label="إغلاق المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ad image — whole image is the link if linkUrl exists */}
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              {previewAd.imageUrl ? (
                previewAd.linkUrl ? (
                  <a
                    href={previewAd.linkUrl}
                    target={previewAd.openInNewTab ? "_blank" : "_self"}
                    rel={previewAd.openInNewTab ? "noopener noreferrer" : undefined}
                    aria-label={`فتح إعلان: ${previewAd.title}`}
                    className="block group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 rounded-2xl"
                    tabIndex={0}
                  >
                    <img
                      src={previewAd.imageUrl}
                      alt={previewAd.title}
                      className="w-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:scale-[1.01]"
                      style={{ maxHeight: 400 }}
                    />
                  </a>
                ) : (
                  <img
                    src={previewAd.imageUrl}
                    alt={previewAd.title}
                    className="w-full object-cover"
                    style={{ maxHeight: 400 }}
                  />
                )
              ) : (
                <div className="bg-muted flex items-center justify-center h-48">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="mt-3 text-white text-center">
              <p className="font-bold text-lg">{previewAd.title}</p>
              {previewAd.description && <p className="text-white/70 text-sm mt-1">{previewAd.description}</p>}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
