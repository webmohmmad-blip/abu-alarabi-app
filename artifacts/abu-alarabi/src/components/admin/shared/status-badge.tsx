/**
 * Shared content-status badge.
 * Renders published / draft / archived / hidden with consistent colors.
 * Used by all four admin content pages.
 */

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  published: { label: "منشور",  cls: "bg-green-500/10 text-green-400 border-green-500/20"   },
  draft:     { label: "مسودة",  cls: "bg-white/10 text-white/60 border-white/10"            },
  archived:  { label: "مؤرشف", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  hidden:    { label: "مخفي",   cls: "bg-red-500/10 text-red-400 border-red-500/20"         },
};

/** React component version */
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/** Functional helper — returns JSX. Use where a function call is needed inline. */
export function statusBadgeFn(s: string) {
  const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.draft;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
