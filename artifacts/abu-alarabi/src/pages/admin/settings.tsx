import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle2 } from "lucide-react";

interface PlatformSettings {
  platformName: string;
  platformDescription: string;
  allowComments: boolean;
  allowStudentRegistration: boolean;
  requireCommentApproval: boolean;
  maxFileSize: number;
  pomodoroMinutes: number;
  breakMinutes: number;
  streakMinDailyMinutes: number;
  defaultTimezone: string;
}

function useSettings() {
  return useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => customFetch<PlatformSettings>("/api/admin/settings", { method: "GET" }),
  });
}

export default function AdminSettings() {
  const { data, isLoading } = useSettings();
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      customFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggle = (key: keyof PlatformSettings) => {
    if (!form) return;
    setForm({ ...form, [key]: !(form[key] as boolean) });
  };

  const set = (key: keyof PlatformSettings, value: string | number) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">إعدادات المنصة</h1>
            <p className="text-muted-foreground text-sm mt-0.5">إدارة الإعدادات العامة لمنصة أبو العربي</p>
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form}
            className={`gap-2 ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"}`}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "تم الحفظ!" : "حفظ الإعدادات"}
          </Button>
        </motion.div>

        {isLoading || !form ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full bg-white/5 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* General */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  معلومات المنصة
                </h3>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">اسم المنصة</label>
                  <Input value={form.platformName} onChange={(e) => set("platformName", e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">وصف المنصة</label>
                  <textarea
                    value={form.platformDescription}
                    onChange={(e) => set("platformDescription", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-white mb-2">الميزات والصلاحيات</h3>
                {[
                  { key: "allowComments" as const, label: "السماح بالتعليقات", desc: "يمكن للطلاب التعليق على المحتوى" },
                  { key: "allowStudentRegistration" as const, label: "تسجيل الطلاب", desc: "السماح للطلاب بالتسجيل بأنفسهم" },
                  { key: "requireCommentApproval" as const, label: "الموافقة على التعليقات", desc: "تتطلب موافقة المشرف قبل نشر التعليقات" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => toggle(item.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[item.key] ? "bg-primary" : "bg-white/20"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form[item.key] ? "translate-x-1" : "translate-x-6"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Study settings */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-white mb-2">إعدادات الدراسة</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">مدة البومودورو (دقيقة)</label>
                    <Input type="number" min={10} max={60} value={form.pomodoroMinutes} onChange={(e) => set("pomodoroMinutes", parseInt(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">مدة الاستراحة (دقيقة)</label>
                    <Input type="number" min={1} max={30} value={form.breakMinutes} onChange={(e) => set("breakMinutes", parseInt(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">حد الـ Streak اليومي (دقيقة)</label>
                    <Input type="number" min={5} max={120} value={form.streakMinDailyMinutes} onChange={(e) => set("streakMinDailyMinutes", parseInt(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">الحد الأقصى لحجم الملف (MB)</label>
                    <Input type="number" min={1} max={500} value={form.maxFileSize} onChange={(e) => set("maxFileSize", parseInt(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
