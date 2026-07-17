import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, Shield, Lock, Trash2, Smartphone, Moon, Sun } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2">الإعدادات</h1>
          <p className="text-muted-foreground">تخصيص تجربتك في المنصة وإدارة حسابك.</p>
        </div>

        <div className="grid md:grid-cols-[1fr_3fr] gap-8">
          {/* Settings Nav (Simulated for UI) */}
          <div className="space-y-2">
            <button className="w-full text-right p-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-md">
              عام
            </button>
            <button className="w-full text-right p-3 rounded-xl hover:bg-white/50 text-muted-foreground hover:text-foreground font-bold transition-colors">
              الإشعارات
            </button>
            <button className="w-full text-right p-3 rounded-xl hover:bg-white/50 text-muted-foreground hover:text-foreground font-bold transition-colors">
              الأمان والخصوصية
            </button>
          </div>

          <div className="space-y-6">
            <Card className="border-white/60 shadow-md">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                  <Smartphone className="w-5 h-5 text-primary" /> تفضيلات التطبيق
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold mb-1">المظهر (الوضع الليلي)</h4>
                      <p className="text-sm text-muted-foreground">تغيير ألوان المنصة لراحة العين.</p>
                    </div>
                    <div className="flex items-center bg-muted p-1 rounded-xl">
                      <button className="p-2 px-4 rounded-lg bg-white shadow-sm text-foreground font-bold text-sm flex items-center gap-2">
                        <Sun className="w-4 h-4" /> فاتح
                      </button>
                      <button className="p-2 px-4 rounded-lg text-muted-foreground hover:text-foreground font-bold text-sm flex items-center gap-2">
                        <Moon className="w-4 h-4" /> داكن
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/60 shadow-md">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                  <Lock className="w-5 h-5 text-primary" /> تغيير كلمة المرور
                </h3>
                
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-2">
                    <Label>كلمة المرور الحالية</Label>
                    <Input type="password" dir="ltr" className="text-right" />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة</Label>
                    <Input type="password" dir="ltr" className="text-right" />
                  </div>
                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور</Label>
                    <Input type="password" dir="ltr" className="text-right" />
                  </div>
                  <Button className="mt-2">تحديث كلمة المرور</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5 shadow-md">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-destructive">
                  <Shield className="w-5 h-5" /> منطقة الخطر
                </h3>
                <p className="text-sm text-destructive/80 mb-6">
                  حذف حسابك سيؤدي إلى مسح جميع بياناتك، إحصائياتك، وتقدمك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" /> حذف الحساب نهائياً
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
