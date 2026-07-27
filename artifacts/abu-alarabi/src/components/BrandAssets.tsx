import React from "react";

/**
 * Official Brand Identity Assets for Abu Al-Arabi (أبو العربي)
 * Single Source of Truth derived from the Official Brand Identity Sheet.
 *
 * Colors:
 *   - Primary Purple: #5A2D82
 *   - Brand Gold:     #C79A2D
 *   - Turquoise:      #0D9B85
 *   - Brand Green:    #2FA84F
 *   - Canvas Light:   #FAFAF8
 */

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: "default" | "white" | "monochrome";
  showSubtitle?: boolean;
}

// ── 1. Brand Book & Arrow Symbol Icon ──────────────────────────────────────────
export function BrandBookSymbol({ className = "w-10 h-10", color = "#C79A2D", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer Purple Book Cover */}
      <path
        d="M12 72C28 62 46 62 50 68C54 62 72 62 88 72L82 32C68 24 54 26 50 30C46 26 32 24 18 32L12 72Z"
        fill="#5A2D82"
      />
      {/* Turquoise Inner Pages */}
      <path
        d="M18 68C32 59 46 59 50 64C54 59 68 59 82 68L78 35C66 28 54 30 50 33C46 30 34 28 22 35L18 68Z"
        fill="#0D9B85"
      />
      {/* Light Page Surface */}
      <path
        d="M23 64C35 56 46 57 50 61C54 57 65 56 77 64L74 38C64 32 54 34 50 36C46 34 36 32 26 38L23 64Z"
        fill="#FAFAF8"
      />
      {/* Gold Calligraphy "ع" + Upward Arrow */}
      <path
        d="M48 58C44 54 44 46 50 42C56 38 60 35 54 28C50 24 45 27 42 30C40 27 45 21 52 21C61 21 66 28 60 34C55 38 52 41 54 46C56 50 61 48 64 45L67 48C62 54 53 62 48 58Z"
        fill={color}
      />
      {/* Pen Nib / Arrow Tip */}
      <path
        d="M57 15L74 12L68 28L63 22L57 15Z"
        fill={color}
      />
      {/* Arrow Shaft */}
      <path
        d="M50 38C55 32 62 25 66 18"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 2. Minimalist Gold "ع" Symbol ─────────────────────────────────────────────
export function BrandSymbol({ className = "w-8 h-8", color = "#C79A2D", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Stylized Gold Calligraphy Letter "ع" + Upward Arrow */}
      <path
        d="M32 72C24 64 24 50 34 40C44 30 52 24 42 14C35 7 28 12 22 18C18 12 28 2 40 2C56 2 66 14 56 25C47 34 42 40 46 48C50 56 60 52 66 46L72 52C62 62 44 78 32 72Z"
        fill={color}
      />
      {/* Arrow Shaft */}
      <path
        d="M52 50L82 12"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Arrow Head Tip */}
      <path
        d="M66 10L86 8L82 28L75 18L66 10Z"
        fill={color}
      />
    </svg>
  );
}

// ── 3. Horizontal Logo (Logizonal Logo) ────────────────────────────────────────
export function HorizontalLogo({ variant = "default", showSubtitle = true, className = "", ...props }: LogoProps) {
  const textColor = variant === "white" || variant === "monochrome" ? "#FFFFFF" : "#5A2D82";
  const subtitleColor = variant === "white" || variant === "monochrome" ? "rgba(255,255,255,0.75)" : "#5A2D82";
  const symbolColor = variant === "monochrome" ? "#FFFFFF" : "#C79A2D";

  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      {/* Icon */}
      <div className="shrink-0">
        {variant === "monochrome" ? (
          <svg viewBox="0 0 100 100" fill="none" className="w-9 h-9 md:w-10 md:h-10">
            <path d="M12 72C28 62 46 62 50 68C54 62 72 62 88 72L82 32C68 24 54 26 50 30C46 26 32 24 18 32L12 72Z" fill="#FFFFFF" opacity="0.9" />
            <path d="M48 58C44 54 44 46 50 42C56 38 60 35 54 28C50 24 45 27 42 30L57 15L74 12L68 28L48 58Z" fill="#FFFFFF" />
          </svg>
        ) : (
          <BrandBookSymbol className="w-9 h-9 md:w-10 md:h-10" color={symbolColor} />
        )}
      </div>

      {/* Typography */}
      <div className="flex flex-col text-right leading-tight">
        <span
          className="text-lg md:text-xl font-black tracking-tight"
          style={{ color: textColor, fontFamily: "'Tajawal', system-ui, sans-serif" }}
        >
          أبو العربي
        </span>
        {showSubtitle && (
          <span
            className="text-[10px] md:text-[11px] font-medium tracking-wide mt-0.5"
            style={{ color: subtitleColor, fontFamily: "'Tajawal', system-ui, sans-serif" }}
          >
            منصة تعليمية متخصصة
          </span>
        )}
      </div>
    </div>
  );
}

// ── 4. Vertical Logo ─────────────────────────────────────────────────────────
export function VerticalLogo({ variant = "default", className = "", ...props }: LogoProps) {
  const textColor = variant === "white" ? "#FFFFFF" : "#5A2D82";

  return (
    <div className={`flex flex-col items-center text-center gap-3 shrink-0 ${className}`}>
      <BrandBookSymbol className="w-16 h-16 md:w-20 md:h-20" />
      <div className="flex flex-col items-center leading-tight">
        <span
          className="text-2xl md:text-3xl font-black tracking-tight"
          style={{ color: textColor, fontFamily: "'Tajawal', system-ui, sans-serif" }}
        >
          أبو العربي
        </span>
        <span
          className="text-xs md:text-sm font-semibold tracking-wide mt-1"
          style={{ color: variant === "white" ? "rgba(255,255,255,0.8)" : "#5A2D82", fontFamily: "'Tajawal', system-ui, sans-serif" }}
        >
          منصة تعليمية متخصصة
        </span>
      </div>
    </div>
  );
}

// ── 5. White Monochrome Logo (For Footers & Dark Cards) ───────────────────────
export function MonochromeLogo({ className = "", showSubtitle = true }: LogoProps) {
  return <HorizontalLogo variant="white" showSubtitle={showSubtitle} className={className} />;
}

// ── 6. Google Results Square Logo (Apple Touch / PWA / Square) ───────────────
export function GoogleSquareLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-[#5A2D82] flex items-center justify-center p-2.5 shadow-lg ${className}`}>
      <BrandBookSymbol className="w-full h-full" color="#C79A2D" />
    </div>
  );
}

// ── 7. Favicon Logo (32x32 / Browser Tab) ───────────────────────────────────
export function FaviconLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-[#FAFAF8] flex items-center justify-center p-1 border border-black/5 shadow-sm ${className}`}>
      <BrandSymbol className="w-full h-full" color="#5A2D82" />
    </div>
  );
}
