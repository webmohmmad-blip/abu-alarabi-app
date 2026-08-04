import React from "react";
import { SEO, WEBSITE_SCHEMA, ORGANIZATION_SCHEMA } from "@/components/SEO";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
// framer-motion removed — below-fold animations use CSS data-fade + IntersectionObserver
import {
  BookOpen,
  FileText,
  PenTool,
  BrainCircuit,
  ChevronLeft,
  Star,
  Users,
  Clock,
  Sparkles,
  Trophy,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { HeroAdvertisement } from "@/components/HeroAdvertisement";
import { useContext, useEffect } from "react";
import { AuthContext } from "@/contexts/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface HeroContent {
  badgeText: string;
  badgeEnabled: boolean;
  titleLine1: string;
  titleLine2: string;
  description: string;
  descriptionEnabled: boolean;
  primaryButtonText: string;
  primaryButtonLink: string;
  primaryButtonEnabled: boolean;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  secondaryButtonEnabled: boolean;
}

interface FeaturedDossier {
  id: number;
  title: string;
  coverUrl: string | null;
  subjectName: string | null;
  pageCount: number;
  rating: string;
}

interface HomepageData {
  ok: boolean;
  hero: HeroContent;
  ads: unknown[];
  featuredDossiers: FeaturedDossier[];
}

const HERO_DEFAULTS: HeroContent = {
  badgeText: "المنصة المتخصصة في اللغة العربية",
  badgeEnabled: true,
  titleLine1: "أتقن العربية.",
  titleLine2: "افهمها. تفوق.",
  description:
    "مع الأستاذ محمد الساحوري — أبو العربي — طريقك لإتقان اللغة العربية والتفوق في التوجيهي أصبح أوضح وأسهل من أي وقت مضى.",
  descriptionEnabled: true,
  primaryButtonText: "أنشئ جدولك الدراسي",
  primaryButtonLink: "/schedule",
  primaryButtonEnabled: true,
  secondaryButtonText: "تصفح الدوسيات",
  secondaryButtonLink: "/dossiers",
  secondaryButtonEnabled: true,
};

const FEATURES = [
  {
    icon: BookOpen,
    title: "الدوسيات",
    desc: "ملزمات شاملة لكل وحدة من وحدات اللغة العربية، مُعدَّة بعناية من الأستاذ محمد الساحوري.",
    accent: "#5A2D82",
    href: "/dossiers",
  },
  {
    icon: PenTool,
    title: "الامتحانات الوزارية",
    desc: "محاكاة دقيقة للامتحانات الوزارية مع تصليح فوري وتحليل شامل للأداء.",
    accent: "#0D9BB5",
    href: "/exams",
  },
  {
    icon: FileText,
    title: "أوراق العمل",
    desc: "تدريبات مستهدفة على مستوى كل قاعدة نحوية وكل أسلوب بلاغي في المنهاج.",
    accent: "#C79A2D",
    href: "/worksheets",
  },
  {
    icon: Sparkles,
    title: "الملخصات والشروحات",
    desc: "ملخصات مركزة وشروحات مبسطة لجميع دروس المنهاج لضمان المراجعة السريعة والتفوق.",
    accent: "#2FA84F",
    href: "/summaries",
  },
];

export default function Home() {
  const { isAuthenticated } = useContext(AuthContext);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // ── Single combined fetch: hero + ads + featured dossiers ─────────────────
  // initialData uses window.__HOMEPAGE__ when available — pre-fetched by
  // the inline <script> in index.html before React even loads.
  const { data: homepage } = useQuery<HomepageData>({
    queryKey: ["/api/public/homepage"],
    queryFn: () => customFetch<HomepageData>("/api/public/homepage", { method: "GET" }),
    staleTime: 60_000,
    initialData: typeof window !== "undefined"
      ? ((window as any).__HOMEPAGE__ as HomepageData | undefined)
      : undefined,
  });

  // Seed ads into React Query cache so HeroAdvertisement gets them on first render
  useEffect(() => {
    if (homepage?.ads && homepage.ads.length > 0) {
      queryClient.setQueryData(["advertisements", "active"], homepage.ads);
    }
  }, [homepage?.ads, queryClient]);

  // ── IntersectionObserver for data-fade scroll animations ──────────────────
  // Replaces framer-motion whileInView — CSS transitions handle the animation
  // (see index.css: [data-fade] / [data-fade].in-view). This saves ~140 KB JS.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll("[data-fade]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const hero: HeroContent = homepage?.hero ?? HERO_DEFAULTS;
  const featuredDossiers: FeaturedDossier[] = homepage?.featuredDossiers ?? [];

  // Primary CTA: authenticated → go to destination; guest → /login?redirect=<dest>
  function handlePrimaryCTA(e: React.MouseEvent) {
    e.preventDefault();
    const dest = hero.primaryButtonLink || "/schedule";
    if (isAuthenticated) {
      setLocation(dest);
    } else {
      setLocation(`/login?redirect=${encodeURIComponent(dest)}`);
    }
  }

  return (
    <MainLayout>
      <SEO
        title="الرئيسية"
        description="منصة أبو العربي — رفيقك الدراسي الأول لتوجيهي الأردن جيل 2010. دوسيات عربي، أوراق عمل، امتحانات إلكترونية، وشرح الأستاذ محمد الساحوري في اللغة العربية."
        canonical="/"
        schema={[WEBSITE_SCHEMA, ORGANIZATION_SCHEMA]}
      />

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

        <div className="relative z-10 container mx-auto px-6 py-16 lg:py-24 flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
          <div className="flex-1 min-w-0">

            {/* Badge — rendered immediately (no animation) so FCP is not blocked */}
            {hero.badgeEnabled && hero.badgeText && (
              <div className="inline-flex items-center gap-2 mb-10">
                <div className="flex items-center gap-2 border border-primary/40 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-accent fill-accent" />
                  {hero.badgeText}
                </div>
              </div>
            )}

            {/* Heading — plain element at full opacity; LCP element must not wait on animations */}
            <h1
              className="text-5xl md:text-7xl font-black leading-[1.1] text-white mb-8"
              style={{ letterSpacing: "-0.01em" }}
            >
              {hero.titleLine1}
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
                {hero.titleLine2}
              </span>
            </h1>

            {/* Description — visible immediately */}
            {hero.descriptionEnabled && hero.description && (
              <p
                className="text-lg md:text-xl text-white/60 leading-relaxed mb-12 max-w-xl"
                style={{ fontWeight: 400 }}
              >
                {hero.description}
              </p>
            )}

            {/* CTAs — visible immediately */}
            <div className="flex flex-wrap gap-4 items-center">
              {hero.primaryButtonEnabled && hero.primaryButtonText && (
                <a href={hero.primaryButtonLink || "/schedule"} onClick={handlePrimaryCTA}>
                  <Button
                    size="lg"
                    className="h-14 px-10 text-base font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                  >
                    {hero.primaryButtonText}
                  </Button>
                </a>
              )}
              {hero.secondaryButtonEnabled && hero.secondaryButtonText && (
                <Link href={hero.secondaryButtonLink || "/dossiers"}>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-14 px-8 text-base font-bold text-white/80 hover:text-white hover:bg-white/10 gap-2"
                  >
                    {hero.secondaryButtonText}
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>

          </div>
          {/* Advertisement — sits in the empty dark column beside the text */}
          <HeroAdvertisement />
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
            <div
              data-fade
              className="relative order-last lg:order-first"
            >
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent" />
              <div className="absolute -top-6 -right-6 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-secondary/5 rounded-full blur-2xl" />

              {/* Photo frame */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/10">
                {/* Responsive AVIF/WebP/JPEG — lazy since below the fold */}
                <picture>
                  <source
                    type="image/avif"
                    srcSet="/teacher-sahouri-380.avif 380w, /teacher-sahouri-760.avif 760w"
                    sizes="(max-width: 640px) 380px, 760px"
                  />
                  <source
                    type="image/webp"
                    srcSet="/teacher-sahouri-380.webp 380w, /teacher-sahouri-760.webp 760w"
                    sizes="(max-width: 640px) 380px, 760px"
                  />
                  <source type="image/jpeg" srcSet="/teacher-sahouri-760.jpg" />
                  <img
                    src="/teacher-sahouri-760.jpg"
                    alt="الأستاذ محمد الساحوري — أبو العربي"
                    className="w-full object-cover object-top"
                    style={{ aspectRatio: "4/5", maxHeight: "560px" }}
                    width="760"
                    height="950"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
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
            </div>

            {/* Content column */}
            <div
              data-fade
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
            </div>
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
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href} className="block h-full">
                <div
                  data-fade
                  className="group bg-card border border-border rounded-2xl p-7 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${f.accent}15` }}
                  >
                    <f.icon className="w-6 h-6" style={{ color: f.accent }} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">{f.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>تصفح الآن</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
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
            {featuredDossiers.map((dossier) => (
              <div
                key={dossier.id}
                data-fade
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
                          width="400"
                          height="176"
                          loading="lazy"
                          decoding="async"
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
              </div>
            ))}

            {/* Fallback cards if no dossiers yet */}
            {featuredDossiers.length === 0 &&
              ["نحو وصرف — توجيهي", "البلاغة والأدب — توجيهي", "مراجعة شاملة — توجيهي"].map((title) => (
                <div
                  key={title}
                  data-fade
                  className="border border-border bg-card rounded-2xl overflow-hidden h-64 flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-7 h-7 text-primary/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">قريباً</p>
                  </div>
                </div>
              ))}
          </div>

          <Button variant="outline" asChild className="w-full mt-8 md:hidden">
            <Link href="/dossiers">عرض كل الدوسيات</Link>
          </Button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TEACHER SOCIAL LINKS — real links
      ═══════════════════════════════════════════════ */}
      <section className="py-16 bg-foreground">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">تواصل مع الأستاذ</p>
            <h3 className="text-2xl font-black text-white">محمد الساحوري — أبو العربي</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-4">

            {/* WhatsApp */}
            <a href="https://wa.me/962798638622" target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#25D366]/10 hover:border-[#25D366]/30 transition-all duration-200">
              <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-white font-semibold text-sm">واتساب</span>
            </a>

            {/* Facebook */}
            <a href="https://www.facebook.com/p/%D8%A7%D9%84%D8%A3%D8%B3%D8%AA%D8%A7%D8%B0-%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%B3%D8%A7%D8%AD%D9%88%D8%B1%D9%8A-%D9%84%D8%BA%D8%A9-%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9-100075808340138/" target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30 transition-all duration-200">
              <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-white font-semibold text-sm">فيسبوك</span>
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/mohammad.alsahori/?hl=ar" target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#E1306C]/10 hover:border-[#E1306C]/30 transition-all duration-200">
              <svg className="w-5 h-5 text-[#E1306C]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="text-white font-semibold text-sm">إنستغرام</span>
            </a>

            {/* YouTube */}
            <a href="https://www.youtube.com/channel/UCw-xJ-EZ1y2Zozbqwiwe4DA" target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#FF0000]/10 hover:border-[#FF0000]/30 transition-all duration-200">
              <svg className="w-5 h-5 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-white font-semibold text-sm">يوتيوب</span>
            </a>

            {/* JO Academy */}
            <a href="https://www.joacademy.com/teachers/%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%B3%D8%A7%D8%AD%D9%88%D8%B1%D9%8A/shababeek" target="_blank" rel="noreferrer"
              className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-[#0D9BB5]/10 hover:border-[#0D9BB5]/30 transition-all duration-200">
              <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="44" y="10" width="12" height="80" rx="6" fill="#0D3044"/>
                <rect x="44" y="10" width="12" height="80" rx="6" fill="#0D3044" transform="rotate(60 50 50)"/>
                <rect x="44" y="10" width="12" height="80" rx="6" fill="#0D3044" transform="rotate(120 50 50)"/>
                <circle cx="50" cy="50" r="9" fill="#0D3044"/>
                <circle cx="50" cy="7"  r="6" fill="#29ABE2"/>
                <circle cx="50" cy="93" r="6" fill="#29ABE2"/>
                <circle cx="87" cy="29" r="6" fill="#29ABE2"/>
                <circle cx="13" cy="71" r="6" fill="#29ABE2"/>
                <circle cx="87" cy="71" r="6" fill="#29ABE2"/>
                <circle cx="13" cy="29" r="6" fill="#29ABE2"/>
              </svg>
              <span className="text-white font-semibold text-sm">JO Academy</span>
            </a>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA — simple, elegant, strong
      ═══════════════════════════════════════════════ */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div
            data-fade
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
          </div>
        </div>
      </section>

    </MainLayout>
  );
}
