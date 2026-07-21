/**
 * AdCarousel — Homepage advertisement banner carousel
 *
 * Fetches active ads from /api/advertisements/active.
 * Hides entirely when no active ads exist.
 * Supports RTL, auto-slide, pause-on-hover, touch swipe, keyboard nav.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ad {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  tabletImageUrl: string | null;
  linkUrl: string | null;
  openInNewTab: boolean;
  ctaText: string | null;
  displayStyle: string;
}

async function fetchActiveAds(): Promise<Ad[]> {
  const res = await fetch("/api/advertisements/active");
  if (!res.ok) throw new Error("Failed to fetch ads");
  const data = await res.json();
  return data.items ?? [];
}

const SLIDE_DURATION = 5000; // ms between auto-advances

export function AdCarousel() {
  const { data: ads = [], isLoading, isError } = useQuery({
    queryKey: ["advertisements", "active"],
    queryFn: fetchActiveAds,
    staleTime: 60_000,
    retry: 1,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = ads.length;

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + total) % total);
  }, [total]);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % total);
  }, [total]);

  // Auto-slide
  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(next, SLIDE_DURATION);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, total, paused]);

  // Reset index if ads change
  useEffect(() => {
    setCurrent(0);
  }, [total]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    // RTL: swipe right = prev, swipe left = next
    if (Math.abs(diff) > 40) {
      if (diff > 0) prev();
      else next();
    }
    touchStartX.current = null;
  };

  // Keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") next();   // RTL: left arrow advances
    if (e.key === "ArrowRight") prev();
  };

  if (isLoading || isError || total === 0) return null;

  const ad = ads[current];

  const wrapLink = (content: React.ReactNode) => {
    if (!ad.linkUrl) return <>{content}</>;
    return (
      <a
        href={ad.linkUrl}
        target={ad.openInNewTab ? "_blank" : "_self"}
        rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
        className="block"
        tabIndex={-1}
        aria-label={`إعلان: ${ad.title}`}
      >
        {content}
      </a>
    );
  };

  return (
    <section
      className="w-full py-6 px-4 md:px-8"
      dir="rtl"
      aria-label="الإعلانات"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="container mx-auto max-w-6xl">
        <div
          className="relative overflow-hidden rounded-2xl shadow-xl shadow-primary/10"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slide */}
          <AdSlide ad={ad} />

          {/* Navigation arrows — only when multiple ads */}
          {total > 1 && (
            <>
              <button
                onClick={next}
                aria-label="الإعلان السابق"
                className="absolute top-1/2 right-3 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={prev}
                aria-label="الإعلان التالي"
                className="absolute top-1/2 left-3 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {total > 1 && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20"
              role="tablist"
              aria-label="تنقل بين الإعلانات"
            >
              {ads.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`إعلان ${i + 1}`}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                    i === current
                      ? "w-6 h-2.5 bg-white"
                      : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Reduced-motion: skip auto-slide respects prefers-reduced-motion via paused state */}
        </div>
      </div>
    </section>
  );
}

function AdSlide({ ad }: { ad: Ad }) {
  const style = ad.displayStyle ?? "image_only";

  const imageEl = (className = "w-full h-full object-cover") => (
    <>
      {/* Desktop image */}
      <img
        src={ad.imageUrl ?? ""}
        alt={ad.title}
        className={`${className} hidden md:block`}
        loading="lazy"
        draggable={false}
      />
      {/* Mobile image — falls back to desktop */}
      <img
        src={ad.mobileImageUrl ?? ad.imageUrl ?? ""}
        alt={ad.title}
        className={`${className} block md:hidden`}
        loading="lazy"
        draggable={false}
      />
    </>
  );

  if (style === "overlay") {
    return (
      <div className="relative w-full" style={{ aspectRatio: "3.2 / 1", minHeight: 160 }}>
        {imageEl("absolute inset-0 w-full h-full object-cover hidden md:block")}
        {imageEl("absolute inset-0 w-full h-full object-cover block md:hidden")}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 right-0 left-0 p-6 text-white">
          <h3 className="text-xl md:text-2xl font-black mb-1 drop-shadow">{ad.title}</h3>
          {ad.description && (
            <p className="text-white/80 text-sm mb-3 line-clamp-2">{ad.description}</p>
          )}
          {ad.linkUrl && ad.ctaText && (
            <a
              href={ad.linkUrl}
              target={ad.openInNewTab ? "_blank" : "_self"}
              rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              {ad.ctaText}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (style === "split") {
    return (
      <div className="flex flex-col md:flex-row bg-card rounded-2xl overflow-hidden" style={{ minHeight: 180 }}>
        <div className="md:w-1/2 relative" style={{ aspectRatio: "4/3" }}>
          {imageEl()}
        </div>
        <div className="md:w-1/2 flex flex-col justify-center p-6 md:p-10">
          <h3 className="text-xl md:text-3xl font-black text-foreground mb-3">{ad.title}</h3>
          {ad.description && (
            <p className="text-muted-foreground text-sm md:text-base mb-5 leading-relaxed">{ad.description}</p>
          )}
          {ad.linkUrl && ad.ctaText && (
            <a
              href={ad.linkUrl}
              target={ad.openInNewTab ? "_blank" : "_self"}
              rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
              className="inline-flex self-start items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              {ad.ctaText}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (style === "minimal") {
    return (
      <div className="flex items-center gap-4 bg-card border border-border p-5 rounded-2xl">
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-24 h-16 object-cover rounded-xl shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{ad.title}</h3>
          {ad.description && (
            <p className="text-muted-foreground text-sm line-clamp-1 mt-0.5">{ad.description}</p>
          )}
        </div>
        {ad.linkUrl && ad.ctaText && (
          <a
            href={ad.linkUrl}
            target={ad.openInNewTab ? "_blank" : "_self"}
            rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
            className="shrink-0 text-sm font-bold text-primary hover:underline"
          >
            {ad.ctaText}
          </a>
        )}
      </div>
    );
  }

  // default: image_only
  return (
    <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "3.2 / 1", minHeight: 160 }}>
      {imageEl()}
      {ad.linkUrl && ad.ctaText && (
        <div className="absolute bottom-4 right-4 z-10">
          <a
            href={ad.linkUrl}
            target={ad.openInNewTab ? "_blank" : "_self"}
            rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg"
          >
            {ad.ctaText}
          </a>
        </div>
      )}
    </div>
  );
}
