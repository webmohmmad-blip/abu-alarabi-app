import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCompleteOnboarding, useListSubjects } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2, ArrowRight, ArrowLeft, Target, BookOpen, Clock,
  Settings, GraduationCap, Sparkles, TestTubes, Leaf,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // If onboarding already completed, go straight to dashboard
  useEffect(() => {
    if (user?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);
  const [submitError, setSubmitError] = useState("");
  const completeMutation = useCompleteOnboarding();
  const { data: subjectsList, isLoading: subjectsLoading } = useListSubjects();

  const hasSubjects = (subjectsList?.length ?? 0) > 0;

  const [formData, setFormData] = useState({
    grade: "توجيهي",
    field: "",
    tawjihiYear: new Date().getFullYear() + 1,
    subjectIds: [] as number[],
    subjectLevels: {} as Record<string, string>,
    availableHoursPerDay: 4,
    studyDays: ["sunday", "monday", "tuesday", "wednesday", "thursday", "saturday"],
    goal: "",
    studyStyle: "pomodoro",
  });

  const nextStep = () => {
    // Skip step 3 if no subjects were selected
    if (step === 2 && formData.subjectIds.length === 0) {
      setStep(4);
    } else {
      setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    // If on step 4 and no subjects, go back to step 2
    if (step === 4 && formData.subjectIds.length === 0) {
      setStep(2);
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = () => {
    setSubmitError("");
    completeMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error ??
            err?.message ??
            "حدث خطأ أثناء الحفظ. تأكد من تسجيل الدخول وحاول مجدداً.";
          setSubmitError(msg);
        },
      }
    );
  };

  const steps = [
    { id: 1, title: "الفرع الدراسي", icon: GraduationCap },
    { id: 2, title: "مساراتك", icon: BookOpen },
    { id: 3, title: "تقييم المستوى", icon: Target },
    { id: 4, title: "الوقت المتاح", icon: Clock },
    { id: 5, title: "هدفك الدراسي", icon: Sparkles },
    { id: 6, title: "أسلوب الدراسة", icon: Settings },
  ];

  // Compute visual step index for progress bar (skip step 3 in display when no subjects)
  const visibleSteps = hasSubjects ? steps : steps.filter(s => s.id !== 3);
  const currentVisibleIdx = visibleSteps.findIndex(s => s.id === step);

  // Next button disabled logic
  const nextDisabled =
    (step === 1 && !formData.field) ||
    (step === 5 && !formData.goal);
  // Step 2: only disabled if subjects exist AND none selected
  const step2Disabled = step === 2 && hasSubjects && formData.subjectIds.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-3xl">

        {/* Progress header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">لنصمم خطتك معاً</h1>
            <span className="text-sm font-bold text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">
              خطوة {currentVisibleIdx + 1} من {visibleSteps.length}
            </span>
          </div>
          <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentVisibleIdx + 1) / visibleSteps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {visibleSteps.map(s => (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-2 ${step >= s.id ? "text-primary" : "text-muted-foreground opacity-50"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= s.id ? "bg-primary text-white" : "bg-muted"}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <Card className="p-8 min-h-[400px] flex flex-col relative overflow-hidden shadow-xl shadow-primary/5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >

              {/* ─── STEP 1: Academic Branch ──────────────────────────── */}
              {step === 1 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">أهلاً بك! ما هو فرعك الدراسي؟</h2>
                  <p className="text-muted-foreground mb-8">أخبرنا عن فرعك لتهيئة المنصة خصيصاً لك.</p>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {[
                      { val: "علمي", label: "الفرع العلمي", icon: TestTubes },
                      { val: "أدبي", label: "الفرع الأدبي", icon: BookOpen },
                      { val: "صناعي", label: "الفرع الصناعي", icon: Settings },
                      { val: "زراعي", label: "الفرع الزراعي", icon: Leaf },
                    ].map(({ val, label, icon: Icon }) => (
                      <button
                        key={val}
                        onClick={() => setFormData(f => ({ ...f, field: val }))}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${formData.field === val ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-muted hover:bg-muted/80"}`}
                      >
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                          <Icon className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-bold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── STEP 2: Academic Tracks ─────────────────────────── */}
              {step === 2 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">اختر مساراتك في اللغة العربية</h2>
                  <p className="text-muted-foreground mb-6">حدّد المسارات الدراسية التي ستتابعها.</p>

                  {subjectsLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : !hasSubjects ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-2">لم تُضَف مسارات بعد</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                          سيقوم الأستاذ بإضافة المسارات الدراسية قريباً. يمكنك المتابعة الآن وتحديد مساراتك لاحقاً.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] p-1">
                      {subjectsList?.map(subject => {
                        const isSelected = formData.subjectIds.includes(subject.id);
                        return (
                          <button
                            key={subject.id}
                            onClick={() =>
                              setFormData(f => ({
                                ...f,
                                subjectIds: isSelected
                                  ? f.subjectIds.filter(id => id !== subject.id)
                                  : [...f.subjectIds, subject.id],
                              }))
                            }
                            className={`p-4 rounded-xl border transition-all text-right flex items-start gap-3 ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"}`}
                          >
                            <div
                              className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/30"}`}
                            >
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className={`font-bold text-sm ${isSelected ? "text-primary" : ""}`}>{subject.name}</div>
                              {subject.grade && (
                                <div className="text-xs text-muted-foreground mt-0.5">الصف {subject.grade}</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 3: Level Assessment ─────────────────────────── */}
              {step === 3 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">كيف تقيّم مستواك الحالي؟</h2>
                  <p className="text-muted-foreground mb-8">لنبني خطة تراعي نقاط الضعف والقوة في كل مسار.</p>
                  <div className="space-y-4 overflow-y-auto max-h-[300px] p-1">
                    {formData.subjectIds.map(id => {
                      const subject = subjectsList?.find(s => s.id === id);
                      if (!subject) return null;
                      const level = formData.subjectLevels[id.toString()];
                      return (
                        <div key={id} className="bg-muted/30 p-4 rounded-xl border border-border">
                          <h4 className="font-bold mb-3">{subject.name}</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {["ضعيف", "متوسط", "جيد", "ممتاز"].map(l => (
                              <button
                                key={l}
                                onClick={() =>
                                  setFormData(f => ({
                                    ...f,
                                    subjectLevels: { ...f.subjectLevels, [id]: l },
                                  }))
                                }
                                className={`py-2 rounded-lg text-sm font-bold transition-colors ${level === l ? "bg-primary text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {formData.subjectIds.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        يرجى العودة للخطوة السابقة واختيار مسار دراسي واحد على الأقل.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── STEP 4: Available Time ───────────────────────────── */}
              {step === 4 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">الوقت المتاح للدراسة</h2>
                  <p className="text-muted-foreground mb-8">كم ساعة يمكنك الالتزام بها يومياً؟</p>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-6xl font-black text-primary mb-4 flex items-baseline gap-2">
                      <span>{formData.availableHoursPerDay}</span>
                      <span className="text-2xl text-muted-foreground font-medium">ساعات/يوم</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={formData.availableHoursPerDay}
                      onChange={e => setFormData(f => ({ ...f, availableHoursPerDay: parseInt(e.target.value) }))}
                      className="w-full max-w-sm accent-primary"
                    />
                    <div className="mt-12 w-full">
                      <h4 className="font-bold mb-4 text-center">أيام الراحة (اختياري)</h4>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {[
                          { id: "saturday", label: "السبت" },
                          { id: "sunday", label: "الأحد" },
                          { id: "monday", label: "الإثنين" },
                          { id: "tuesday", label: "الثلاثاء" },
                          { id: "wednesday", label: "الأربعاء" },
                          { id: "thursday", label: "الخميس" },
                          { id: "friday", label: "الجمعة" },
                        ].map(day => {
                          const isStudyDay = formData.studyDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              onClick={() =>
                                setFormData(f => ({
                                  ...f,
                                  studyDays: isStudyDay
                                    ? f.studyDays.filter(d => d !== day.id)
                                    : [...f.studyDays, day.id],
                                }))
                              }
                              className={`w-12 h-12 rounded-full font-bold text-sm transition-colors ${!isStudyDay ? "bg-destructive/10 text-destructive border-2 border-destructive/20" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
                            >
                              {day.label.slice(2)}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-4">
                        الأيام الملونة بالأحمر هي أيام راحة لن يتم جدولة مهام فيها.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 5: Goal ────────────────────────────────────── */}
              {step === 5 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">ما هو هدفك المنشود؟</h2>
                  <p className="text-muted-foreground mb-8">تحديد الهدف هو أول خطوة لتحقيقه.</p>
                  <div className="grid gap-4 flex-1">
                    {[
                      { id: "نجاح", title: "النجاح فقط", desc: "اجتياز مادة اللغة العربية بنجاح والحصول على الشهادة" },
                      { id: "80+", title: "جيد جداً (80%+)", desc: "دخول تخصصات جيدة في الجامعات الحكومية" },
                      { id: "90+", title: "امتياز (90%+)", desc: "المنافسة على تخصصات القمة (هندسة، صيدلة...)" },
                      { id: "95+", title: "طب ومكرمات (95%+)", desc: "دخول الطب البشري أو طب الأسنان" },
                      { id: "99+", title: "أوائل المملكة (99%+)", desc: "العلامة الكاملة والمنافسة على الأوائل" },
                    ].map(goal => (
                      <button
                        key={goal.id}
                        onClick={() => setFormData(f => ({ ...f, goal: goal.id }))}
                        className={`p-4 rounded-xl border text-right transition-all flex items-center gap-4 ${formData.goal === goal.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.goal === goal.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                          {formData.goal === goal.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h4 className={`font-bold text-lg ${formData.goal === goal.id ? "text-primary" : ""}`}>{goal.title}</h4>
                          <p className="text-sm text-muted-foreground">{goal.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── STEP 6: Study Style ─────────────────────────────── */}
              {step === 6 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">تفضيلات غرفة الدراسة</h2>
                  <p className="text-muted-foreground mb-8">اختر أسلوب مؤقت التركيز الذي يناسبك، يمكنك تغييره لاحقاً.</p>
                  <div className="grid gap-4 flex-1">
                    {[
                      { id: "pomodoro", title: "بومودورو التقليدي", desc: "25 دقيقة تركيز / 5 دقائق راحة" },
                      { id: "balanced", title: "المتوازن", desc: "45 دقيقة تركيز / 10 دقائق راحة" },
                      { id: "deep_focus", title: "التركيز العميق", desc: "60 دقيقة تركيز / 15 دقيقة راحة" },
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => setFormData(f => ({ ...f, studyStyle: style.id }))}
                        className={`p-4 rounded-xl border text-right transition-all flex items-center gap-4 ${formData.studyStyle === style.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.studyStyle === style.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                          {formData.studyStyle === style.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h4 className={`font-bold text-lg ${formData.studyStyle === style.id ? "text-primary" : ""}`}>{style.title}</h4>
                          <p className="text-sm text-muted-foreground">{style.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {submitError && (
                    <div className="mt-4 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
                    <h3 className="font-bold text-primary mb-1">أنت الآن جاهز للانطلاق!</h3>
                    <p className="text-sm text-muted-foreground">سنبني خطة دراسية ذكية بناءً على إجاباتك وتخصّص لوحة التحكم لك.</p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={prevStep} className="gap-2">
                <ArrowRight className="w-4 h-4" /> السابق
              </Button>
            ) : <div />}

            {step < TOTAL_STEPS ? (
              <Button
                onClick={nextStep}
                className="gap-2 px-8"
                disabled={nextDisabled || step2Disabled}
              >
                {step === 2 && !hasSubjects ? "تخطّ للآن" : "التالي"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="gap-2 px-8 bg-success hover:bg-success/90 text-white shadow-lg shadow-success/30"
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><CheckCircle2 className="w-5 h-5" /> انطلق نحو التفوق</>
                }
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
