import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import {
  Layout,
  Save,
  CheckCircle2,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";

interface HeroContent {
  badgeText: string;
  badgeEnabled: boolean;
  titleLine1: string;
  titleLine2: string;
  description: string;
  descriptionEnabled: boolean;
  primaryButtonText: string;
  primaryButtonLink: string;
  primaryButtonEnabled: boolean;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  secondaryButtonEnabled: boolean;
}

const DEFAULTS: HeroContent = {
  badgeText: "المنصة المتخصصة في اللغة العربية",
  badgeEnabled: true,
  titleLine1: "أتقن العربية.",
  titleLine2: "افهمها. تفوق.",
  description:
    "مع الأستاذ محمد الساحوري — أبو العربي — طريقك لإتقان اللغة العربية والتفوق في التوجيهي أصبح أوضح وأسهل من أي وقت مضى.",
  descriptionEnabled: true,
  primaryButtonText: "أنشئ جدولك الدراسي",
  primaryButtonLink: "/schedule",
  primaryButtonEnabled: true,
  secondaryButtonText: "تصفح الدوسيات",
  secondaryButtonLink: "/dossiers",
  secondaryButtonEnabled: true,
};

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
          value ? "bg-primary" : "bg-white/20"
        }`}
        aria-pressed={value}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-1" : "translate-x-6"
          }`}
        />
      </button>
    </div>
  );
}

// ── Live preview of the Hero as it would appear ───────────────────────────────
function HeroPreview({ hero }: { hero: HeroContent }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10"
      style={{
        background: "linear-gradient(135deg, #1a0a2e 0%, #2d1057 50%, #1a0a2e 100%)",
        minHeight: 260,
      }}
      dir="rtl"
    >
      {/* glow blobs */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-24 h-24 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 p-8 flex flex-col gap-4 max-w-lg">
        {/* Badge */}
        {hero.badgeEnabled && hero.badgeText && (
          <div className="inline-flex items-center gap-2 border border-purple-400/40 bg-purple-400/10 text-purple-300 px-3 py-1.5 rounded-full text-xs font-bold self-start">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {hero.badgeText}
          </div>
        )}

        {/* Heading */}
        <div>
          <div className="text-2xl md:text-3xl font-black text-white leading-tight">
            {hero.titleLine1 || "..."}
          </div>
          <div
            className="text-2xl md:text-3xl font-black leading-tight"
            style={{
              backgroundImage: "linear-gradient(135deg, #C79A2D 0%, #e8c060 50%, #C79A2D 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {hero.titleLine2 || "..."}
          </div>
        </div>

        {/* Description */}
        {hero.descriptionEnabled && hero.description && (
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">{hero.description}</p>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {hero.primaryButtonEnabled && hero.primaryButtonText && (
            <span className="inline-flex h-10 items-center px-5 rounded-xl bg-purple-600 text-white text-sm font-bold">
              {hero.primaryButtonText}
            </span>
          )}
          {hero.secondaryButtonEnabled && hero.secondaryButtonText && (
            <span className="inline-flex h-10 items-center gap-1.5 px-5 rounded-xl text-white/80 text-sm font-bold">
              {hero.secondaryButtonText}
              <ChevronLeft className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminHomepageSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/homepage-settings"],
    queryFn: () =>
      customFetch<HeroContent>("/api/admin/homepage-settings", { method: "GET" }),
  });

  const [form, setForm] = useState<HeroContent | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data]);

  const set = <K extends keyof HeroContent>(key: K, value: HeroContent[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
    setError(null);
  };

  const save = useMutation({
    mutationFn: () =>
      customFetch<HeroContent>("/api/admin/homepage-settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: (updated) => {
      setForm(updated);
      qc.invalidateQueries({ queryKey: ["/api/homepage-settings"] });
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: async (err: unknown) => {
      const msg =
        (err as { message?: string })?.message ?? "تعذر حفظ إعدادات الصفحة الرئيسية";
      setError(msg);
    },
  });

  const resetDefaults = () => {
    setForm({ ...DEFAULTS });
    setError(null);
  };

  const isChanged = form && JSON.stringify(form) !== JSON.stringify(data);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layout className="w-6 h-6 text-primary" />
              إعدادات الصفحة الرئيسية
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              تحكم في نص ومحتوى الواجهة الرئيسية للمنصة
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetDefaults}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              استعادة الافتراضي
            </Button>
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form || !isChanged}
              className={`gap-1.5 ${saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            >
              {saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? "تم الحفظ!" : "حفظ التغييرات"}
            </Button>
          </div>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoading || !form ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Badge ─────────────────────────────────────────────────────── */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">النص الصغير أعلى العنوان</h3>
                  <Toggle
                    value={form.badgeEnabled}
                    onChange={(v) => set("badgeEnabled", v)}
                    label={form.badgeEnabled ? "ظاهر" : "مخفي"}
                  />
                </div>
                <Input
                  value={form.badgeText}
                  onChange={(e) => set("badgeText", e.target.value)}
                  maxLength={80}
                  disabled={!form.badgeEnabled}
                  className="bg-white/5 border-white/10 text-white disabled:opacity-40"
                  placeholder="مثال: المنصة المتخصصة في اللغة العربية"
                />
              </CardContent>
            </Card>

            {/* ── Headings ──────────────────────────────────────────────────── */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-white text-sm">العنوان الرئيسي</h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    السطر الأول
                  </label>
                  <Input
                    value={form.titleLine1}
                    onChange={(e) => set("titleLine1", e.target.value)}
                    maxLength={120}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="مثال: أتقن العربية."
                  />
                  <span className="text-xs text-muted-foreground mt-1 block text-left" dir="ltr">
                    {form.titleLine1.length}/120
                  </span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    السطر الثاني (يظهر بلون ذهبي)
                  </label>
                  <Input
                    value={form.titleLine2}
                    onChange={(e) => set("titleLine2", e.target.value)}
                    maxLength={120}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="مثال: افهمها. تفوق."
                  />
                  <span className="text-xs text-muted-foreground mt-1 block text-left" dir="ltr">
                    {form.titleLine2.length}/120
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ── Description ──────────────────────────────────────────────── */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">الوصف</h3>
                  <Toggle
                    value={form.descriptionEnabled}
                    onChange={(v) => set("descriptionEnabled", v)}
                    label={form.descriptionEnabled ? "ظاهر" : "مخفي"}
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  disabled={!form.descriptionEnabled}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/50 disabled:opacity-40"
                  placeholder="النص الذي يظهر تحت العنوان..."
                />
              </CardContent>
            </Card>

            {/* ── Primary Button ────────────────────────────────────────────── */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">الزر الأساسي</h3>
                  <Toggle
                    value={form.primaryButtonEnabled}
                    onChange={(v) => set("primaryButtonEnabled", v)}
                    label={form.primaryButtonEnabled ? "مفعّل" : "معطّل"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      نص الزر <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={form.primaryButtonText}
                      onChange={(e) => set("primaryButtonText", e.target.value)}
                      disabled={!form.primaryButtonEnabled}
                      className="bg-white/5 border-white/10 text-white disabled:opacity-40"
                      placeholder="أنشئ جدولك الدراسي"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      الرابط <span className="text-muted-foreground text-xs">(/ أو https://)</span>
                    </label>
                    <Input
                      value={form.primaryButtonLink}
                      onChange={(e) => set("primaryButtonLink", e.target.value)}
                      disabled={!form.primaryButtonEnabled}
                      dir="ltr"
                      className="bg-white/5 border-white/10 text-white disabled:opacity-40"
                      placeholder="/schedule"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Secondary Button ─────────────────────────────────────────── */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">الزر الثانوي</h3>
                  <Toggle
                    value={form.secondaryButtonEnabled}
                    onChange={(v) => set("secondaryButtonEnabled", v)}
                    label={form.secondaryButtonEnabled ? "مفعّل" : "معطّل"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      نص الزر <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={form.secondaryButtonText}
                      onChange={(e) => set("secondaryButtonText", e.target.value)}
                      disabled={!form.secondaryButtonEnabled}
                      className="bg-white/5 border-white/10 text-white disabled:opacity-40"
                      placeholder="تصفح الدوسيات"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      الرابط
                    </label>
                    <Input
                      value={form.secondaryButtonLink}
                      onChange={(e) => set("secondaryButtonLink", e.target.value)}
                      disabled={!form.secondaryButtonEnabled}
                      dir="ltr"
                      className="bg-white/5 border-white/10 text-white disabled:opacity-40"
                      placeholder="/dossiers"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Live Preview ─────────────────────────────────────────────── */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-secondary" />
                  معاينة الواجهة الرئيسية
                </h3>
                <p className="text-xs text-muted-foreground">
                  هذه معاينة حية تعكس التغييرات الحالية قبل الحفظ. لا تشمل الإعلانات.
                </p>
                <HeroPreview hero={form} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
