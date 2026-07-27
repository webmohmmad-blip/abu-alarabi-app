import { SEO } from "@/components/SEO";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { VerticalLogo } from "@/components/BrandAssets";

// ─── Validation ─────────────────────────────────────────────────────────────
const JORDAN_PHONE_RE = /^(077|078|079)\d{7}$/;

const loginSchema = z.object({
  phone: z
    .string()
    .regex(JORDAN_PHONE_RE, "رقم الهاتف غير صالح"),
});

type LoginValues = z.infer<typeof loginSchema>;

// ─── Component ───────────────────────────────────────────────────────────────
export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const queryClient = useQueryClient();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "" },
  });

  // Strip non-digits and cap at 10 characters on every keystroke
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
    form.setValue("phone", clean, { shouldValidate: form.formState.isSubmitted });
  };

  const handleSubmit = (data: LoginValues) => {
    loginMutation.mutate(
      { data: { phone: data.phone } },
      {
        onSuccess: (res) => {
          localStorage.setItem("token", res.token);
          queryClient.setQueryData(getGetMeQueryKey(), res.user);
          const dest = ["admin", "super_admin"].includes(res.user.role)
            ? "/admin"
            : "/dashboard";
          setLocation(dest);
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? "";
          if (msg.includes("غير مسجل")) {
            form.setError("phone", { message: "رقم الهاتف غير مسجل" });
          } else {
            form.setError("phone", { message: "رقم الهاتف غير صالح" });
          }
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <SEO title="تسجيل الدخول" description="سجّل دخولك إلى منصة أبو العربي للوصول إلى الدوسيات والامتحانات وأوراق العمل." canonical="/login" noindex />
      <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/5 -skew-y-6 transform origin-top-left -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex flex-col items-center">
            <VerticalLogo className="scale-110" />
          </Link>
        </div>

        <Card className="p-8 shadow-2xl shadow-primary/10 border-white/60">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">مرحباً بعودتك!</h1>
            <p className="text-muted-foreground text-sm">أدخل رقم هاتفك للدخول إلى حسابك.</p>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="07XXXXXXXX"
                dir="ltr"
                className="text-right"
                value={form.watch("phone")}
                onChange={handlePhoneChange}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg mt-4"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "دخول"}
            </Button>
          </form>

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
