/**
 * HeroAdvertisement — Premium ad carousel embedded inside the Hero section.
 *
 * Placement: second column of the Hero two-column flex layout (visual left on
 * desktop; below the CTA buttons on tablet/mobile).
 *
 * Returns null (zero space) when: load fails OR no active ads exist.
 * Shows a dark skeleton during initial load to prevent layout pop.
 *
 * Full card is clickable when a link is present (no nested link/button inside).
 * Uses the same React Query key as any other ads consumer → single network call.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Ad {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  openInNewTab: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchActiveAds(): Promise<Ad[]> {
  const res = await fetch("/api/advertisements/active");
  if (!res.ok) throw new Error("Failed to load advertisements");
  const data = await res.json();
  return data.items ?? [];
}

/** Block unsafe protocols (javascript:, data:, file:, etc.) */
function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^(https?:\/\/|\/)/.test(url);
}

const SLIDE_DURATION = 5000;

// ── Component ─────────────────────────────────────────────────────────────────

export function HeroAdvertisement() {
  const prefersReduced = useReducedMotion();

  // Use bootstrap data from window.__HOMEPAGE__ as initialData when available.
  // The inline <script> in index.html pre-fetches this before React loads,
  // so the carousel renders immediately on first paint without a loading state.
  const bootstrapAds: Ad[] | undefined = (() => {
    if (typeof window === "undefined") return undefined;
    const hp = (window as any).__HOMEPAGE__;
    return hp?.ads?.length ? (hp.ads as Ad[]) : undefined;
  })();

  const { data: ads = [], isLoading, isError } = useQuery<Ad[]>({
    queryKey: ["advertisements", "active"],
    queryFn: fetchActiveAds,
    staleTime: 60_000,
    retry: 1,
    initialData: bootstrapAds,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = ads.length;

  const prev = useCallback(
    () => setCurrent(c => (c - 1 + total) % total),
    [total],
  );
  const next = useCallback(
    () => setCurrent(c => (c + 1) % total),
    [total],
  );

  // Auto-advance — off when reduced-motion preferred
  useEffect(() => {
    if (total <= 1 || paused || prefersReduced) return;
    timerRef.current = setInterval(next, SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total, paused, prefersReduced]);

  // Reset index when ad list changes
  useEffect(() => { setCurrent(0); }, [total]);

  // Touch swipe (RTL: swipe right = prev, swipe left = next)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) diff > 0 ? prev() : next();
    touchStartX.current = null;
  };

  // Keyboard — works on any focused child via bubbling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); next(); }
    if (e.key === "ArrowRight") { e.preventDefault(); prev(); }
  };

  // ── States ─────────────────────────────────────────────────────────────────

  // Dark skeleton during initial load — avoids layout pop when ads arrive
  if (isLoading) {
    return (
      <div
        className="w-full lg:w-[42%] shrink-0 min-w-0 rounded-[18px] bg-white/5 animate-pulse"
        style={{ aspectRatio: "16 / 9" }}
        aria-hidden="true"
      />
    );
  }

  // Vanish when error or zero active ads — no reserved column
  if (isError || total === 0) return null;

  const ad = ads[current];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="w-full lg:w-[42%] shrink-0 min-w-0"
      dir="rtl"
      role="region"
      aria-label="إعلانات"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card frame */}
      <div className="relative rounded-[18px] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">

        {/* ── Clickable image slide ────────────────────────────────────── */}
        <AdLink ad={ad}>
          <div
            className="relative bg-white/5 overflow-hidden"
            style={{ aspectRatio: "16 / 9" }}
          >
            {/* Desktop / tablet image — eager + high priority (potential LCP element) */}
            <img
              key={`desk-${ad.id}`}
              src={ad.imageUrl ?? ""}
              alt={ad.title}
              className="absolute inset-0 w-full h-full object-cover hidden sm:block select-none"
              draggable={false}
              width="800"
              height="450"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            {/* Mobile image — falls back to desktop src */}
            <img
              key={`mob-${ad.id}`}
              src={ad.mobileImageUrl ?? ad.imageUrl ?? ""}
              alt={ad.title}
              className="absolute inset-0 w-full h-full object-cover block sm:hidden select-none"
              draggable={false}
              width="480"
              height="270"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </AdLink>

        {/* ── Arrow buttons (desktop / tablet only) ───────────────────── */}
        {total > 1 && (
          <>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); next(); }}
              aria-label="الإعلان التالي"
              className="absolute top-1/2 right-2 -translate-y-1/2 z-20
                         bg-black/50 hover:bg-black/75 text-white
                         rounded-full w-8 h-8
                         hidden sm:flex items-center justify-center
                         transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); prev(); }}
              aria-label="الإعلان السابق"
              className="absolute top-1/2 left-2 -translate-y-1/2 z-20
                         bg-black/50 hover:bg-black/75 text-white
                         rounded-full w-8 h-8
                         hidden sm:flex items-center justify-center
                         transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* ── Dot indicators ───────────────────────────────────────────── */}
        {total > 1 && (
          <div
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5"
            role="tablist"
            aria-label="تنقل بين الإعلانات"
          >
            {ads.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === current}
                aria-label={`إعلان ${i + 1}`}
                onClick={e => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  i === current
                    ? "w-5 h-2 bg-white"
                    : "w-2 h-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── AdLink helper — whole card is a single accessible link ────────────────────

function AdLink({
  ad,
  children,
}: {
  ad: Ad;
  children: React.ReactNode;
}) {
  const safe = isSafeUrl(ad.linkUrl);

  const cls =
    "block cursor-pointer " +
    "hover:brightness-110 active:brightness-95 " +
    "transition-[filter] duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-black/50";

  if (!safe) {
    // No link — render non-interactive wrapper (no cursor-pointer)
    return <div className="block select-none">{children}</div>;
  }

  const isInternal = ad.linkUrl!.startsWith("/");

  if (isInternal) {
    return (
      <Link
        href={ad.linkUrl!}
        className={cls}
        aria-label={`فتح إعلان: ${ad.title}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      href={ad.linkUrl!}
      target={ad.openInNewTab ? "_blank" : "_self"}
      rel={ad.openInNewTab ? "noopener noreferrer" : undefined}
      className={cls}
      aria-label={`فتح إعلان: ${ad.title}`}
    >
      {children}
    </a>
  );
}
