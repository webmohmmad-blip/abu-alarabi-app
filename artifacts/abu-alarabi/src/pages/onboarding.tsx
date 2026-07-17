import { useState } from "react";
import { useLocation } from "wouter";
import { useCompleteOnboarding, useListSubjects } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight, ArrowLeft, Target, BookOpen, Clock, Settings, GraduationCap, Sparkles, TestTubes, Leaf, CheckCircle2 } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const completeMutation = useCompleteOnboarding();
  const { data: subjectsList } = useListSubjects();

  // Form State
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

  const nextStep = () => setStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    completeMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        }
      }
    );
  };

  const steps = [
    { id: 1, title: "المرحلة الدراسية", icon: GraduationCap },
    { id: 2, title: "اختيار المواد", icon: BookOpen },
    { id: 3, title: "تقييم المستوى", icon: Target },
    { id: 4, title: "الوقت المتاح", icon: Clock },
    { id: 5, title: "هدفك الدراسي", icon: Sparkles },
    { id: 6, title: "أسلوب الدراسة", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">لنصمم خطتك معاً</h1>
            <span className="text-sm font-bold text-muted-foreground bg-white/50 px-3 py-1 rounded-full">خطوة {step} من 6</span>
          </div>
          <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {steps.map(s => (
              <div key={s.id} className={`flex flex-col items-center gap-2 ${step >= s.id ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= s.id ? 'bg-primary text-white' : 'bg-muted'}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form area */}
        <Card className="p-8 min-h-[400px] flex flex-col relative overflow-hidden shadow-2xl shadow-primary/10 border-white/60">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {step === 1 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">أهلاً بك! ما هو مسارك الأكاديمي؟</h2>
                  <p className="text-muted-foreground mb-8">أخبرنا عن صفك وحقلك الدراسي لتهيئة المنصة خصيصاً لك.</p>
                  
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <button 
                      onClick={() => setFormData(f => ({ ...f, field: 'علمي' }))}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${formData.field === 'علمي' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-muted hover:bg-muted/80'}`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><TestTubes className="w-8 h-8" /></div>
                      <span className="text-xl font-bold">الفرع العلمي</span>
                    </button>
                    <button 
                      onClick={() => setFormData(f => ({ ...f, field: 'أدبي' }))}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${formData.field === 'أدبي' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-muted hover:bg-muted/80'}`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><BookOpen className="w-8 h-8" /></div>
                      <span className="text-xl font-bold">الفرع الأدبي</span>
                    </button>
                    <button 
                      onClick={() => setFormData(f => ({ ...f, field: 'صناعي' }))}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${formData.field === 'صناعي' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-muted hover:bg-muted/80'}`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><Settings className="w-8 h-8" /></div>
                      <span className="text-xl font-bold">الفرع الصناعي</span>
                    </button>
                    <button 
                      onClick={() => setFormData(f => ({ ...f, field: 'زراعي' }))}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${formData.field === 'زراعي' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-muted hover:bg-muted/80'}`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><Leaf className="w-8 h-8" /></div>
                      <span className="text-xl font-bold">الفرع الزراعي</span>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">اختر المواد التي ترغب بمتابعتها</h2>
                  <p className="text-muted-foreground mb-8">يمكنك تغيير ذلك لاحقاً من الإعدادات.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] p-1">
                    {subjectsList?.map(subject => {
                      const isSelected = formData.subjectIds.includes(subject.id);
                      return (
                        <button
                          key={subject.id}
                          onClick={() => {
                            setFormData(f => ({
                              ...f,
                              subjectIds: isSelected 
                                ? f.subjectIds.filter(id => id !== subject.id)
                                : [...f.subjectIds, subject.id]
                            }))
                          }}
                          className={`p-4 rounded-xl border transition-all text-right flex items-start gap-3 ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-white/40 bg-white/50 hover:bg-white/80'}`}
                        >
                          <div className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30'}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className={`font-bold ${isSelected ? 'text-primary' : ''}`}>{subject.name}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">كيف تقيّم مستواك الحالي؟</h2>
                  <p className="text-muted-foreground mb-8">لنبني خطة تراعي نقاط الضعف والقوة.</p>
                  
                  <div className="space-y-4 overflow-y-auto max-h-[300px] p-1">
                    {formData.subjectIds.map(id => {
                      const subject = subjectsList?.find(s => s.id === id);
                      if (!subject) return null;
                      const level = formData.subjectLevels[id.toString()];
                      
                      return (
                        <div key={id} className="bg-white/50 p-4 rounded-xl border border-white/40">
                          <h4 className="font-bold mb-3">{subject.name}</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {['ضعيف', 'متوسط', 'جيد', 'ممتاز'].map(l => (
                              <button
                                key={l}
                                onClick={() => setFormData(f => ({
                                  ...f,
                                  subjectLevels: { ...f.subjectLevels, [id]: l }
                                }))}
                                className={`py-2 rounded-lg text-sm font-bold transition-colors ${level === l ? 'bg-primary text-white' : 'bg-muted/50 hover:bg-muted text-foreground'}`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {formData.subjectIds.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        يرجى العودة للخطوة السابقة واختيار مادة واحدة على الأقل.
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      onChange={(e) => setFormData(f => ({ ...f, availableHoursPerDay: parseInt(e.target.value) }))}
                      className="w-full max-w-sm accent-primary"
                    />
                    
                    <div className="mt-12 w-full">
                      <h4 className="font-bold mb-4 text-center">أيام الراحة (اختياري)</h4>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {[
                          { id: 'saturday', label: 'السبت' },
                          { id: 'sunday', label: 'الأحد' },
                          { id: 'monday', label: 'الإثنين' },
                          { id: 'tuesday', label: 'الثلاثاء' },
                          { id: 'wednesday', label: 'الأربعاء' },
                          { id: 'thursday', label: 'الخميس' },
                          { id: 'friday', label: 'الجمعة' },
                        ].map(day => {
                          const isStudyDay = formData.studyDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              onClick={() => {
                                setFormData(f => ({
                                  ...f,
                                  studyDays: isStudyDay 
                                    ? f.studyDays.filter(d => d !== day.id)
                                    : [...f.studyDays, day.id]
                                }))
                              }}
                              className={`w-12 h-12 rounded-full font-bold text-sm transition-colors ${!isStudyDay ? 'bg-destructive/10 text-destructive border-2 border-destructive/20' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
                            >
                              {day.label.slice(2)}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-4">الأيام الملونة بالأحمر هي أيام راحة لن يتم جدولة مهام فيها.</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">ما هو هدفك المنشود؟</h2>
                  <p className="text-muted-foreground mb-8">تحديد الهدف هو أول خطوة لتحقيقه.</p>
                  
                  <div className="grid gap-4 flex-1">
                    {[
                      { id: 'نجاح', title: 'النجاح فقط', desc: 'تجاوز جميع المواد بنجاح للحصول على الشهادة' },
                      { id: '80+', title: 'جيد جداً (80%+)', desc: 'دخول تخصصات جيدة في الجامعات الحكومية' },
                      { id: '90+', title: 'امتياز (90%+)', desc: 'المنافسة على تخصصات القمة (هندسة، صيدلة...)' },
                      { id: '95+', title: 'طب ومكرمات (95%+)', desc: 'دخول الطب البشري أو طب الأسنان' },
                      { id: '99+', title: 'أوائل المملكة (99%+)', desc: 'العلامة الكاملة والمنافسة على الأوائل' },
                    ].map(goal => (
                      <button 
                        key={goal.id}
                        onClick={() => setFormData(f => ({ ...f, goal: goal.id }))}
                        className={`p-4 rounded-xl border text-right transition-all flex items-center gap-4 ${formData.goal === goal.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-white/40 bg-white/50 hover:bg-white/80'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.goal === goal.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                          {formData.goal === goal.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h4 className={`font-bold text-lg ${formData.goal === goal.id ? 'text-primary' : ''}`}>{goal.title}</h4>
                          <p className="text-sm text-muted-foreground">{goal.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-black mb-2">تفضيلات غرفة الدراسة</h2>
                  <p className="text-muted-foreground mb-8">اختر أسلوب مؤقت التركيز الذي يناسبك، يمكنك تغييره لاحقاً.</p>
                  
                  <div className="grid gap-4 flex-1">
                    {[
                      { id: 'pomodoro', title: 'بومودورو التقليدي', desc: '25 دقيقة تركيز / 5 دقائق راحة' },
                      { id: 'balanced', title: 'المتوازن', desc: '45 دقيقة تركيز / 10 دقائق راحة' },
                      { id: 'deep_focus', title: 'التركيز العميق', desc: '60 دقيقة تركيز / 15 دقيقة راحة' },
                    ].map(style => (
                      <button 
                        key={style.id}
                        onClick={() => setFormData(f => ({ ...f, studyStyle: style.id }))}
                        className={`p-4 rounded-xl border text-right transition-all flex items-center gap-4 ${formData.studyStyle === style.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-white/40 bg-white/50 hover:bg-white/80'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.studyStyle === style.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                          {formData.studyStyle === style.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h4 className={`font-bold text-lg ${formData.studyStyle === style.id ? 'text-primary' : ''}`}>{style.title}</h4>
                          <p className="text-sm text-muted-foreground">{style.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
                    <h3 className="font-bold text-primary mb-2">أنت الآن جاهز للانطلاق!</h3>
                    <p className="text-sm text-muted-foreground">سنقوم ببناء خطة دراسية ذكية بناءً على إجاباتك، وتخصيص لوحة التحكم لتناسب طموحك.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer buttons */}
          <div className="mt-8 pt-6 border-t border-white/40 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={prevStep} className="gap-2">
                <ArrowRight className="w-4 h-4" /> السابق
              </Button>
            ) : <div></div>}

            {step < 6 ? (
              <Button onClick={nextStep} className="gap-2 px-8" disabled={
                (step === 1 && !formData.field) ||
                (step === 2 && formData.subjectIds.length === 0) ||
                (step === 3 && Object.keys(formData.subjectLevels).length !== formData.subjectIds.length) ||
                (step === 5 && !formData.goal)
              }>
                التالي <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                className="gap-2 px-8 bg-success hover:bg-success/90 text-white shadow-lg shadow-success/30"
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>انطلق نحو التفوق <ArrowLeft className="w-4 h-4" /></>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
