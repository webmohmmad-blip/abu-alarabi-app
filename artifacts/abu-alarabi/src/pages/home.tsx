import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  PenTool,
  BrainCircuit,
  ChevronLeft,
  Star,
  Users,
  Clock,
  Target,
  Sparkles,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { useGetPlatformStats, useListDossiers } from "@workspace/api-client-react";

const TRACKS = [
  { label: "توجيهي", sub: "الصف الثاني عشر", color: "#5A2D82" },
  { label: "أول ثانوي", sub: "الصف الحادي عشر", color: "#0D9BB5" },
  { label: "التاسع", sub: "الصف التاسع", color: "#C79A2D" },
  { label: "دورة الإعراب", sub: "النحو والصرف", color: "#2FA84F" },
  { label: "دورة البلاغة", sub: "الأساليب البلاغية", color: "#5A2D82" },
  { label: "مراجعة نهائية", sub: "تحضير الامتحانات", color: "#0D9BB5" },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "الدوسيات",
    desc: "ملزمات شاملة لكل وحدة من وحدات اللغة العربية، مُعدَّة بعناية من الأستاذ محمد الساحوري.",
    accent: "#5A2D82",
  },
  {
    icon: PenTool,
    title: "الامتحانات الوزارية",
    desc: "محاكاة دقيقة للامتحانات الوزارية مع تصليح فوري وتحليل شامل للأداء.",
    accent: "#0D9BB5",
  },
  {
    icon: FileText,
    title: "أوراق العمل",
    desc: "تدريبات مستهدفة على مستوى كل قاعدة نحوية وكل أسلوب بلاغي في المنهاج.",
    accent: "#C79A2D",
  },
  {
    icon: BrainCircuit,
    title: "غرفة الدراسة",
    desc: "بيئة تركيز خالية من المشتتات، مع مؤقت بومودورو وتتبع ساعات الدراسة.",
    accent: "#2FA84F",
  },
];

export default function Home() {
  const { data: stats } = useGetPlatformStats({ query: { enabled: true } });
  const { data: dossiersList } = useListDossiers({ limit: 3 }, { query: { enabled: true } });

  return (
    <MainLayout>

      {/* ═══════════════════════════════════════════════
          HERO — dark, premium, Arabic-language focused
      ═══════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center bg-foreground overflow-hidden">

        {/* Background Arabic letter ع — decorative */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            fontSize: "clamp(320px, 45vw, 700px)",
            lineHeight: 1,
            fontFamily: "Tajawal, sans-serif",
            fontWeight: 900,
            color: "rgba(90,45,130,0.08)",
            userSelect: "none",
          }}
          aria-hidden
        >
          ع
        </div>

        {/* Glow blobs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 container mx-auto px-6 py-24">
          <div className="max-w-3xl mr-auto">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-10"
            >
              <div className="flex items-center gap-2 border border-primary/40 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-accent fill-accent" />
                المنصة المتخصصة في اللغة العربية
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black leading-[1.1] text-white mb-8"
              style={{ letterSpacing: "-0.01em" }}
            >
              أتقن العربية.
              <br />
              <span
                className="text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #C79A2D 0%, #e8c060 50%, #C79A2D 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                افهمها. تفوق.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-white/60 leading-relaxed mb-12 max-w-xl"
              style={{ fontWeight: 400 }}
            >
              مع الأستاذ محمد الساحوري — أبو العربي — طريقك لإتقان اللغة العربية والتفوق في التوجيهي أصبح
              أوضح وأسهل من أي وقت مضى.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4 items-center"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-14 px-10 text-base font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                >
                  ابدأ رحلتك الآن
                </Button>
              </Link>
              <Link href="/dossiers">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-14 px-8 text-base font-bold text-white/80 hover:text-white hover:bg-white/10 gap-2"
                >
                  تصفح الدوسيات
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Micro-stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center gap-8 mt-16 pt-8 border-t border-white/10"
            >
              {[
                { val: stats?.totalStudents ? `+${Number(stats.totalStudents).toLocaleString("ar")}` : "+٥٠٫٠٠٠", lbl: "طالب وطالبة" },
                { val: stats?.totalDossiers ? `${stats.totalDossiers}+` : "١٥٠+", lbl: "دوسية وملخص" },
                { val: stats?.totalExams ? `${stats.totalExams}+` : "٣٢٠+", lbl: "امتحان وزاري" },
              ].map((s) => (
                <div key={s.lbl}>
                  <div className="text-2xl font-black text-white">{s.val}</div>
                  <div className="text-sm text-white/50 mt-0.5">{s.lbl}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════════════
          TEACHER PROFILE — محمد الساحوري
      ═══════════════════════════════════════════════ */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Image column */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative order-last lg:order-first"
            >
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent" />
              <div className="absolute -top-6 -right-6 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-secondary/5 rounded-full blur-2xl" />

              {/* Photo frame */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/10">
                <img
                  src="/teacher-sahouri.jpg"
                  alt="الأستاذ محمد الساحوري — أبو العربي"
                  className="w-full object-cover object-top"
                  style={{ aspectRatio: "4/5", maxHeight: "560px" }}
                />
                {/* Overlay gradient at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-foreground/40 to-transparent" />
                <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-black text-lg leading-tight">محمد الساحوري</p>
                    <p className="text-white/70 text-sm">أبو العربي</p>
                  </div>
                  {/* Verified badge */}
                  <div className="flex items-center gap-1.5 bg-accent/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    مصحح وزاري معتمد
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Content column */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-8"
            >
              <div>
                <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">عن الأستاذ</p>
                <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-5">
                  خبرة تُحدث<br />
                  <span className="text-primary">الفارق الحقيقي</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  الأستاذ محمد الساحوري — أبو العربي — مدرّس لغة عربية بخبرة ثماني سنوات في تدريس التوجيهي والمراحل الثانوية.
                  يُقدّم محتوىً أكاديمياً عميقاً وأسلوباً تعليمياً واضحاً يجعل اللغة العربية سهلة وممتعة.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { val: "+٨", lbl: "سنوات خبرة", icon: Clock, color: "#5A2D82" },
                  { val: "+١٠٠٠", lbl: "طالب وطالبة", icon: Users, color: "#0D9BB5" },
                  { val: "✓", lbl: "مصحح وزاري معتمد", icon: Trophy, color: "#C79A2D" },
                ].map(({ val, lbl, icon: Icon, color }) => (
                  <div key={lbl} className="bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/20 hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="text-2xl font-black text-foreground leading-tight">{val}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-tight">{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <div className="space-y-3">
                {[
                  "مصحح في امتحانات التوجيهي الوزارية الرسمية",
                  "متخصص في اللغة العربية لطلاب الثانوي والتوجيهي",
                  "ثماني سنوات من التدريس الميداني المتواصل",
                  "أكثر من ألف طالب أنجز دراستهم تحت إشرافه",
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-muted-foreground leading-snug">{point}</span>
                  </div>
                ))}
              </div>

              <Link href="/dossiers">
                <Button size="lg" className="gap-2 h-13 px-8 text-base font-bold shadow-lg shadow-primary/25 mt-2">
                  <BookOpen className="w-5 h-5" />
                  تصفح محتوى الأستاذ
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURES — 4-grid, spacious, clean
      ═══════════════════════════════════════════════ */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">أدوات التعلم</p>
            <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
              كل ما تحتاجه في مكان واحد
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group bg-card border border-border rounded-2xl p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${f.accent}15` }}
                >
                  <f.icon className="w-6 h-6" style={{ color: f.accent }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          DOSSIERS PREVIEW
      ═══════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-sm font-bold text-primary uppercase tracking-widest mb-3">أحدث الإصدارات</p>
              <h2 className="text-4xl font-black text-foreground">الدوسيات المتاحة</h2>
            </div>
            <Button variant="outline" asChild className="hidden md:flex gap-2 h-11">
              <Link href="/dossiers">
                جميع الدوسيات
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {dossiersList?.items?.slice(0, 3).map((dossier, i) => (
              <motion.div
                key={dossier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/dossiers/${dossier.id}`}>
                  <div className="group border border-border bg-card rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer h-full flex flex-col">
                    {/* Cover */}
                    <div className="h-44 bg-muted relative overflow-hidden flex items-center justify-center">
                      {dossier.coverUrl ? (
                        <img
                          src={dossier.coverUrl}
                          alt={dossier.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-primary/40" />
                          </div>
                        </div>
                      )}
                      {dossier.subjectName && (
                        <div className="absolute top-3 right-3 bg-foreground/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                          {dossier.subjectName}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-base text-foreground mb-2 line-clamp-2 flex-1">
                        {dossier.title}
                      </h3>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {dossier.pageCount} صفحة
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-accent">
                          <Star className="w-3.5 h-3.5 fill-accent" />
                          {Number(dossier.rating).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Fallback cards if no dossiers yet */}
            {(!dossiersList?.items || dossiersList.items.length === 0) &&
              ["نحو وصرف — توجيهي", "البلاغة والأدب — توجيهي", "مراجعة شاملة — توجيهي"].map((title, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="border border-border bg-card rounded-2xl overflow-hidden h-64 flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-7 h-7 text-primary/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">قريباً</p>
                  </div>
                </motion.div>
              ))}
          </div>

          <Button variant="outline" asChild className="w-full mt-8 md:hidden">
            <Link href="/dossiers">عرض كل الدوسيات</Link>
          </Button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SOCIAL PROOF — numbers, clean
      ═══════════════════════════════════════════════ */}
      <section className="py-20 bg-foreground">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: stats?.totalStudents ? `+${Number(stats.totalStudents).toLocaleString("ar")}` : "+٥٠,٠٠٠", lbl: "طالب وطالبة", icon: Users },
              { val: stats?.totalDossiers ? `${stats.totalDossiers}+` : "١٥٠+", lbl: "دوسية وملخص", icon: BookOpen },
              { val: stats?.totalExams ? `${stats.totalExams}+` : "٣٢٠+", lbl: "امتحان وزاري", icon: PenTool },
              { val: stats?.totalStudyHours ? `+${Number(stats.totalStudyHours).toLocaleString("ar")}` : "+١.٢M", lbl: "ساعة دراسية", icon: Clock },
            ].map(({ val, lbl, icon: Icon }) => (
              <div key={lbl}>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{val}</div>
                <div className="text-sm text-white/50">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA — simple, elegant, strong
      ═══════════════════════════════════════════════ */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground leading-tight mb-6">
              ابدأ رحلتك
              <br />
              <span className="text-primary">مع أبو العربي</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              انضم إلى آلاف الطلاب الذين اختاروا المنصة الأولى في الأردن لتعلم اللغة العربية وإتقانها.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild className="h-14 px-12 text-base font-bold shadow-lg shadow-primary/30">
                <Link href="/register">سجل الآن — مجاناً</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-12 text-base font-bold">
                <Link href="/login">لدي حساب</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

    </MainLayout>
  );
}
