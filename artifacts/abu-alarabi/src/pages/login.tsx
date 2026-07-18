import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Phase 1: phone only
const phoneSchema = z.object({
  phone: z.string().min(10, "رقم الهاتف يجب أن يتكون من 10 أرقام على الأقل"),
});
// Phase 2: phone + password (privileged accounts)
const fullSchema = phoneSchema.extend({
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type PhaseOneValues = z.infer<typeof phoneSchema>;
type PhaseTwoValues = z.infer<typeof fullSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const [needsPassword, setNeedsPassword] = useState(false);
  const [lockedPhone, setLockedPhone] = useState("");
  const [genericError, setGenericError] = useState("");

  // Phase 1 form
  const phoneForm = useForm<PhaseOneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  // Phase 2 form (shown when account needs password)
  const fullForm = useForm<PhaseTwoValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: { phone: "", password: "" },
  });

  const handlePhoneSubmit = (data: PhaseOneValues) => {
    setGenericError("");
    loginMutation.mutate(
      { data: { phone: data.phone } },
      {
        onSuccess: (res) => {
          localStorage.setItem("token", res.token);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          const status = err?.response?.status;
          const msg = err?.response?.data?.error ?? err?.message ?? "";
          if (status === 401 && msg.includes("غير مسجل")) {
            setGenericError("رقم الهاتف غير مسجل. تحقق من الرقم أو أنشئ حساباً جديداً.");
          } else if (status === 401 || status === 403) {
            // Privileged account — ask for password
            setLockedPhone(data.phone);
            fullForm.setValue("phone", data.phone);
            setNeedsPassword(true);
          } else {
            setGenericError(msg || "حدث خطأ. حاول مجدداً.");
          }
        },
      }
    );
  };

  const handleFullSubmit = (data: PhaseTwoValues) => {
    setGenericError("");
    loginMutation.mutate(
      { data: { phone: data.phone, password: data.password } },
      {
        onSuccess: (res) => {
          localStorage.setItem("token", res.token);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? err?.message ?? "";
          setGenericError(msg || "رقم الهاتف أو كلمة المرور غير صحيحة.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/5 -skew-y-6 transform origin-top-left -z-10"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
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
            <h1 className="text-2xl font-bold mb-2">مرحباً بعودتك!</h1>
            <p className="text-muted-foreground text-sm">
              {needsPassword ? "أدخل كلمة المرور لحساب المشرف." : "أدخل رقم هاتفك للدخول إلى حسابك."}
            </p>
          </div>

          {genericError && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{genericError}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!needsPassword ? (
              /* ── Phase 1: phone only ── */
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    placeholder="079XXXXXXX"
                    dir="ltr"
                    className="text-right"
                    {...phoneForm.register("phone")}
                  />
                  {phoneForm.formState.errors.phone && (
                    <p className="text-xs text-destructive font-bold">{phoneForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg mt-4"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "دخول"}
                </Button>
              </motion.form>
            ) : (
              /* ── Phase 2: password required (privileged account) ── */
              <motion.form
                key="password"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={fullForm.handleSubmit(handleFullSubmit)}
                className="space-y-5"
              >
                {/* Locked phone display */}
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-bold text-primary" dir="ltr">{lockedPhone}</span>
                  <button
                    type="button"
                    onClick={() => { setNeedsPassword(false); setGenericError(""); }}
                    className="mr-auto text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    تغيير
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    dir="ltr"
                    className="text-right"
                    autoFocus
                    {...fullForm.register("password")}
                  />
                  {fullForm.formState.errors.password && (
                    <p className="text-xs text-destructive font-bold">{fullForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg mt-4"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "دخول"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">ليس لديك حساب بعد؟ </span>
            <Link href="/register" className="text-primary font-bold hover:underline">
              سجل مجاناً الآن
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
