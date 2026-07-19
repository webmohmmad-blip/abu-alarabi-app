import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { customFetch } from "@workspace/api-client-react";
import {
  Bell, Shield, Trash2, Smartphone,
  CheckCircle2, AlertTriangle,
} from "lucide-react";

type SettingsTab = "general" | "notifications" | "security";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<SettingsTab>("general");

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await customFetch("/api/users/account", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      toast({ title: "تم حذف الحساب" });
      logout();
      setLocation("/login");
    } catch (err: any) {
      const msg = err?.message || "حدث خطأ، يرجى المحاولة مجدداً";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const tabs: { key: SettingsTab; label: string; icon: typeof Smartphone }[] = [
    { key: "general", label: "عام", icon: Smartphone },
    { key: "notifications", label: "الإشعارات", icon: Bell },
    { key: "security", label: "الأمان", icon: Shield },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
        <div>
          <h1 className="text-3xl font-black mb-2">الإعدادات</h1>
          <p className="text-muted-foreground">تخصيص تجربتك في المنصة وإدارة حسابك.</p>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] gap-8 items-start">
          {/* Sidebar navigation */}
          <nav className="space-y-1 bg-white/60 border border-white/60 rounded-2xl p-2 shadow-sm">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  tab === key
                    ? "bg-primary text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="space-y-6">

            {/* ── General tab ── */}
            {tab === "general" && (
              <>
                <Card className="border-white/60 shadow-md">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                      <Smartphone className="w-5 h-5 text-primary" /> تفضيلات التطبيق
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-black/5">
                        <div>
                          <h4 className="font-bold">اللغة</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">لغة واجهة المنصة</p>
                        </div>
                        <span className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm">العربية</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="font-bold">اتجاه النص</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">يتم دعم RTL بالكامل</p>
                        </div>
                        <span className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> من اليمين لليسار
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/60 shadow-md">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 border-b border-black/5 pb-4">
                      <Bell className="w-5 h-5 text-primary" /> إعدادات الدراسة
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      يمكنك تعديل بيانات ملفك الشخصي وخطتك الدراسية من صفحة{" "}
                      <button onClick={() => setLocation("/profile")} className="text-primary font-bold hover:underline">الملف الشخصي</button>.
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Notifications tab ── */}
            {tab === "notifications" && (
              <Card className="border-white/60 shadow-md">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                    <Bell className="w-5 h-5 text-primary" /> إعدادات الإشعارات
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "إشعارات المهام اليومية", desc: "تنبيه عند وجود مهام معلقة" },
                      { label: "إشعارات الامتحانات", desc: "تذكير قبل موعد الامتحان" },
                      { label: "إشعارات التقدم الأسبوعي", desc: "ملخص أسبوعي بتقدمك الدراسي" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0">
                        <div>
                          <h4 className="font-bold text-sm">{item.label}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <div className="w-10 h-6 bg-primary/20 rounded-full relative cursor-not-allowed opacity-60">
                          <div className="w-5 h-5 bg-primary rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-2">سيتم تفعيل الإشعارات قريباً في النسخة القادمة.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Security tab ── */}
            {tab === "security" && (
              <>
                {/* Login method info */}
                <Card className="border-white/60 shadow-md">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                      <Smartphone className="w-5 h-5 text-primary" /> طريقة تسجيل الدخول
                    </h3>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h4 className="font-bold">رقم الهاتف</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">تسجيل الدخول عبر رمز التحقق المرسل إلى هاتفك</p>
                      </div>
                      <span className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> مفعّل
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger zone */}
                <Card className="border-destructive/20 bg-destructive/5 shadow-md">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-destructive border-b border-destructive/10 pb-4">
                      <AlertTriangle className="w-5 h-5" /> منطقة الخطر
                    </h3>
                    <p className="text-sm text-destructive/80 mb-6">
                      حذف حسابك سيؤدي إلى مسح جميع بياناتك وتقدمك بشكل نهائي لا يمكن التراجع عنه.
                    </p>

                    {!showDeleteConfirm ? (
                      <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4" /> حذف الحساب نهائياً
                      </Button>
                    ) : (
                      <div className="space-y-4 max-w-sm p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                        <p className="text-sm font-bold text-destructive">هل أنت متأكد من حذف حسابك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            className="gap-2 flex-1"
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? "جاري الحذف..." : <><Trash2 className="w-4 h-4" /> تأكيد الحذف</>}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
