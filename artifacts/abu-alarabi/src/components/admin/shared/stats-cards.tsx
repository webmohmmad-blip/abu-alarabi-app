/**
 * Shared admin stats card grid.
 * Renders a row of KPI cards (total / published / draft / archived).
 * Used by all four admin content pages.
 */
import { Card, CardContent } from "@/components/ui/card";

export interface StatItem {
  label: string;
  value: number;
  color: string;
}

interface StatsCardsProps {
  stats: StatItem[];
  cols?: 2 | 3 | 4;
}

export function StatsCards({ stats, cols = 4 }: StatsCardsProps) {
  const colClass =
    cols === 2 ? "grid-cols-2" :
    cols === 3 ? "grid-cols-3" :
    "grid-cols-2 md:grid-cols-4";

  return (
    <div className={`grid ${colClass} gap-3`}>
      {stats.map((s) => (
        <Card key={s.label} className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Build the standard 4-stat array from raw counts */
export function buildDefaultStats(all: { status: string }[]): StatItem[] {
  return [
    { label: "الكل",   value: all.length,                                      color: "text-white"      },
    { label: "منشور",  value: all.filter((x) => x.status === "published").length, color: "text-green-400"  },
    { label: "مسودة",  value: all.filter((x) => x.status === "draft").length,     color: "text-white/60"   },
    { label: "مؤرشف", value: all.filter((x) => x.status === "archived").length,   color: "text-orange-400" },
  ];
}
