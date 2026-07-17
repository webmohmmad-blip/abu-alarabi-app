import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Trophy, 
  Users, 
  Star, 
  PlayCircle, 
  FileText, 
  Clock, 
  BrainCircuit, 
  Target, 
  CheckCircle2,
  ChevronLeft,
  PenTool
} from "lucide-react";
import { useGetPlatformStats, useListDossiers, useGetCurrentQuiz } from "@workspace/api-client-react";

// Mock animated counter for stats
const StatCard = ({ title, value, icon: Icon, delay }: { title: string, value: string | number, icon: any, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white shadow-xl shadow-primary/5 flex flex-col items-center justify-center text-center gap-3"
  >
    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
      <Icon className="w-7 h-7" />
    </div>
    <h4 className="text-4xl font-black text-secondary">{value}</h4>
    <p className="text-sm font-bold text-muted-foreground">{title}</p>
  </motion.div>
);

export default function Home() {
  const { data: stats } = useGetPlatformStats({ query: { enabled: true } });
  const { data: dossiersList } = useListDossiers({ limit: 4 }, { query: { enabled: true } });
  const { data: currentQuiz } = useGetCurrentQuiz({ query: { enabled: true } });

  const services = [
    { title: "الدوسيات الشاملة", desc: "أقوى الملازم لكل المواد بأسلوب مبسط وشامل.", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { title: "أوراق العمل", desc: "اختبر فهمك بعد كل درس بأوراق عمل تفاعلية.", icon: FileText, color: "text-secondary", bg: "bg-secondary/10" },
    { title: "الامتحانات الوزارية", desc: "محاكاة حقيقية للامتحانات الوزارية مع التصليح الفوري.", icon: CheckCircle2, color: "text-accent", bg: "bg-accent/10" },
    { title: "الكويز الأسبوعي", desc: "تحدَّ نفسك وزملائك أسبوعياً واربح جوائز قيمة.", icon: Trophy, color: "text-success", bg: "bg-success/10" },
    { title: "الخطة الدراسية", desc: "خطة ذكية تتكيف مع مستواك ووقتك المتاح.", icon: Target, color: "text-primary", bg: "bg-primary/10" },
    { title: "غرفة الدراسة", desc: "بيئة تركيز خالية من المشتتات مع مؤقت بومودورو.", icon: BrainCircuit, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  return (
    <MainLayout>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-primary/20 shadow-sm text-primary font-bold text-sm">
                <Star className="w-4 h-4 fill-accent text-accent" />
                المنصة التعليمية الأولى في الأردن
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight text-foreground">
                رحلتك نحو <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">العلامة الكاملة</span> تبدأ من هنا
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
                مع الأستاذ محمد الساحوري (أبو العربي)، طريقك للتفوق في التوجيهي أصبح أوضح. دوسيات، امتحانات، خطط دراسية، ومتابعة مستمرة.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button size="lg" asChild className="text-lg px-8">
                  <Link href="/register">ابدأ الآن مجاناً</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 gap-2 bg-white/50 backdrop-blur-sm">
                  <PlayCircle className="w-5 h-5" />
                  كيف تعمل المنصة؟
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm font-bold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  أكثر من 50,000 طالب
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  محتوى محدث 2024
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Abstract Hero Visual - mimicking a student's premium dashboard */}
              <div className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white shadow-2xl shadow-primary/10 rounded-3xl p-6 rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner">ع</div>
                    <div>
                      <h3 className="font-bold text-lg">أحمد عبدالله</h3>
                      <p className="text-xs text-primary font-bold">طالب علمي - 2006</p>
                    </div>
                  </div>
                  <div className="bg-success/10 text-success px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    الهدف: 99%
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-black/5 rounded-full w-3/4"></div>
                  <div className="h-4 bg-black/5 rounded-full w-1/2"></div>
                  <div className="h-4 bg-black/5 rounded-full w-5/6"></div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4">
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                      <div className="text-primary font-black text-2xl mb-1">98%</div>
                      <div className="text-xs font-bold text-muted-foreground">معدل الامتحانات</div>
                    </div>
                    <div className="bg-secondary/5 rounded-xl p-4 border border-secondary/10">
                      <div className="text-secondary font-black text-2xl mb-1">142</div>
                      <div className="text-xs font-bold text-muted-foreground">ساعة دراسية</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements behind the card */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-20 bg-primary/5 border-y border-primary/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
            <StatCard title="طالب وطالبة" value={stats?.totalStudents || "+50,000"} icon={Users} delay={0} />
            <StatCard title="دوسية وملخص" value={stats?.totalDossiers || "150+"} icon={BookOpen} delay={0.1} />
            <StatCard title="امتحان وزاري ومقترح" value={stats?.totalExams || "320+"} icon={PenTool} delay={0.2} />
            <StatCard title="ساعة دراسية عبر المنصة" value={stats?.totalStudyHours || "+1.2M"} icon={Clock} delay={0.3} />
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-6">كل ما تحتاجه في <span className="text-primary">مكان واحد</span></h2>
            <p className="text-lg text-muted-foreground">
              صممنا منصة أبو العربي لتكون الأداة الشاملة التي تغنيك عن أي مصادر أخرى. كل زاوية في المنصة صممت لرفع إنتاجيتك وعلامتك.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
              >
                <Card className="h-full hover:-translate-y-2 transition-transform duration-300 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer group">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 rounded-2xl ${service.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <service.icon className={`w-8 h-8 ${service.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{service.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED DOSSIERS */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-4">أحدث الدوسيات</h2>
              <p className="text-muted-foreground">حمّل أقوى الدوسيات والملخصات لجميع المواد.</p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex gap-2">
              <Link href="/dossiers">
                عرض الكل
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dossiersList?.items?.map((dossier) => (
              <Card key={dossier.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="h-48 bg-muted relative overflow-hidden flex items-center justify-center">
                  {dossier.coverUrl ? (
                    <img src={dossier.coverUrl} alt={dossier.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <BookOpen className="w-16 h-16 text-primary/20" />
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-primary text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                    {dossier.subjectName}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg mb-2 line-clamp-1">{dossier.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1"><FileText className="w-4 h-4"/> {dossier.pageCount} صفحة</div>
                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-accent fill-accent"/> {dossier.rating}</div>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/dossiers/${dossier.id}`}>تحميل الدوسية</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button variant="outline" asChild className="w-full mt-8 md:hidden">
            <Link href="/dossiers">عرض كل الدوسيات</Link>
          </Button>
        </div>
      </section>

      {/* WEEKLY QUIZ BANNER */}
      {currentQuiz && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-primary to-[#3a1a59] rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-primary/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
              
              <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
                <div>
                  <div className="inline-block bg-accent text-accent-foreground font-bold px-4 py-1.5 rounded-full text-sm mb-6 flex items-center gap-2 w-max">
                    <Trophy className="w-4 h-4" />
                    تحدي الأسبوع
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black mb-4">{currentQuiz.title}</h2>
                  <p className="text-white/80 text-lg mb-8 leading-relaxed max-w-md">
                    شارك في الكويز الأسبوعي لمادة {currentQuiz.subjectName} وتنافس مع آلاف الطلاب للفوز بجوائز قيمة ومراكز متقدمة في لوحة الشرف!
                  </p>
                  <Button size="lg" variant="secondary" asChild className="text-lg px-8 text-secondary-foreground shadow-lg shadow-black/20">
                    <Link href="/quiz">شارك الآن</Link>
                  </Button>
                </div>
                
                <div className="flex justify-center md:justify-end">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center w-full max-w-sm">
                    <div className="text-sm font-bold text-white/70 mb-2">الوقت المتبقي لانتهاء التحدي</div>
                    <div className="text-4xl font-black tabular-nums tracking-widest text-accent mb-6" dir="ltr">
                      24:59:59
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-4 text-sm font-bold">
                      <div>
                        <div className="text-white/60 mb-1">المشاركين</div>
                        <div className="text-xl">{currentQuiz.participants}</div>
                      </div>
                      <div>
                        <div className="text-white/60 mb-1">عدد الأسئلة</div>
                        <div className="text-xl">{currentQuiz.questionCount}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA SECTION */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
            لا تضيع المزيد من الوقت، <br />
            <span className="text-primary">مستقبلك بانتظارك!</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            انضم الآن إلى عائلة أبو العربي، واستمتع بتجربة دراسية فريدة تضمن لك التفوق بأقل جهد وأعلى كفاءة.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="text-lg px-12 h-14">
              <Link href="/register">سجل مجاناً الآن</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-12 h-14 bg-white">
              <Link href="/login">لدي حساب مسبقاً</Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
