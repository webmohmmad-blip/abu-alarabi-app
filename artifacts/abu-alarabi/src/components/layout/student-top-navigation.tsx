import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookText,
  FileText,
  PenTool,
  Target,
  Focus,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "لوحتي",                  href: "/dashboard",    icon: LayoutDashboard },
  { name: "الدوسيات",               href: "/dossiers",     icon: BookText        },
  { name: "أوراق العمل",            href: "/worksheets",   icon: FileText        },
  { name: "الامتحانات الإلكترونية", href: "/exams",        icon: PenTool         },
  { name: "الكويز الأسبوعي",        href: "/weekly-quiz",  icon: Target          },
  { name: "غرفتي الدراسية",         href: "/study-room",   icon: Focus           },
];

export function StudentTopNavigation() {
  const [location] = useLocation();

  return (
    <div className="sticky top-[72px] z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      {/* Horizontal scroll on mobile, centered on desktop */}
      <div className="overflow-x-auto scrollbar-hide">
        <nav
          dir="rtl"
          className="flex items-stretch px-4 md:px-8 min-w-max md:min-w-0"
          aria-label="قائمة التنقل الرئيسية"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              location === item.href ||
              location.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex items-center gap-2 px-4 py-4 text-sm whitespace-nowrap
                  transition-all duration-200 border-b-2 outline-none
                  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                  ${
                    isActive
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-muted-foreground font-medium hover:text-foreground hover:border-primary/30"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "group-hover:text-foreground"
                  }`}
                />
                <span>{item.name}</span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
