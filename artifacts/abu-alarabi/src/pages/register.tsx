import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const registerSchema = z.object({
  fullName: z.string().min(3, "الاسم الرباعي مطلوب (3 أحرف على الأقل)"),
  phone: z.string().min(10, "رقم الهاتف يجب أن يتكون من 10 أرقام على الأقل"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const registerMutation = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          localStorage.setItem("token", res.token);
          setLocation("/onboarding");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute bottom-0 right-0 w-full h-1/2 bg-secondary/5 skew-y-6 transform origin-bottom-right -z-10"></div>
      <div className="absolute top-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md my-8"
      >
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen className="w-8 h-8" />
            </div>
            <span className="text-3xl font-black text-foreground tracking-tight">أبو العربي</span>
          </Link>
        </div>

        <Card className="p-8 shadow-2xl shadow-primary/10 border-white/60">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">أنشئ حسابك الجديد</h1>
            <p className="text-muted-foreground text-sm">انضم لأكثر من 50,000 طالب وطالبة يصنعون التفوق.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {registerMutation.isError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>حدث خطأ أثناء التسجيل. قد يكون رقم الهاتف مستخدماً بالفعل.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الرباعي</Label>
              <Input 
                id="fullName" 
                placeholder="أحمد عبدالله محمد..." 
                {...form.register("fullName")} 
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive font-bold">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input 
                id="phone" 
                placeholder="079XXXXXXX" 
                dir="ltr" 
                className="text-right"
                {...form.register("phone")} 
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive font-bold">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                dir="ltr"
                className="text-right"
                {...form.register("password")} 
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive font-bold">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                dir="ltr"
                className="text-right"
                {...form.register("confirmPassword")} 
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive font-bold">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="text-xs text-muted-foreground pt-2 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>بالنقر على "إنشاء حساب"، أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بمنصة أبو العربي.</span>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg mt-6" 
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "إنشاء حساب"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
            <Link href="/login" className="text-primary font-bold hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
