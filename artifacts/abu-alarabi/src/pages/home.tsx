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
                  صنّ جدولك الدراسي
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
          TEACHER SOCIAL LINKS
      ═══════════════════════════════════════════════ */}
      <section className="py-16 bg-foreground">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">تواصل مع الأستاذ</p>
            <h3 className="text-2xl font-black text-white">محمد الساحوري — أبو العربي</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {/* WhatsApp */}
            <a
              href="https://wa.me/962XXXXXXXXX"
              target="_blank"rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#25D366]/10 hover:border-[#25D366]/30 transition-all duration-200"
            >
              <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-white font-semibold text-sm">واتساب</span>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/abualarabi"
              target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30 transition-all duration-200"
            >
              <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-white font-semibold text-sm">فيسبوك</span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/abualarabi"
              target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#E1306C]/10 hover:border-[#E1306C]/30 transition-all duration-200"
            >
              <svg className="w-5 h-5 text-[#E1306C]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="text-white font-semibold text-sm">إنستجرام</span>
            </a>

            {/* Jo Academy */}
            <a
              href="https://www.jo-academy.com"
              target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              <div className="w-5 h-5 rounded bg-primary/80 flex items-center justify-center text-white text-[10px] font-black">JO</div>
              <span className="text-white font-semibold text-sm">Jo Academy</span>
            </a>
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
