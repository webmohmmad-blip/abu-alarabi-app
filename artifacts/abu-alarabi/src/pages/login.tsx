import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const loginSchema = z.object({
  phone: z.string().min(10, "رقم الهاتف يجب أن يتكون من 10 أرقام على الأقل"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const [error, setError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "" },
  });

  const handleSubmit = (data: LoginValues) => {
    setError("");
    loginMutation.mutate(
      { data: { phone: data.phone } },
      {
        onSuccess: (res) => {
          localStorage.setItem("token", res.token);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? err?.message ?? "";
          if (msg.includes("غير مسجل")) {
            setError("رقم الهاتف غير مسجل. تحقق من الرقم أو أنشئ حساباً جديداً.");
          } else {
            setError(msg || "حدث خطأ. حاول مجدداً.");
          }
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/5 -skew-y-6 transform origin-top-left -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
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
            <p className="text-muted-foreground text-sm">أدخل رقم هاتفك للدخول إلى حسابك.</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
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
                <p className="text-xs text-destructive font-bold">
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
