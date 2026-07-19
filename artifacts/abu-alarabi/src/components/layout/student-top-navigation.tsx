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
  { name: "لوحتي",                  href: "/dashboard",   icon: LayoutDashboard },
  { name: "الدوسيات",               href: "/dossiers",    icon: BookText        },
  { name: "أوراق العمل",            href: "/worksheets",  icon: FileText        },
  { name: "الامتحانات الإلكترونية", href: "/exams",       icon: PenTool         },
  { name: "الكويز الأسبوعي",        href: "/weekly-quiz", icon: Target          },
  { name: "غرفتي الدراسية",         href: "/study-room",  icon: Focus           },
];

export function StudentTopNavigation() {
  const [location] = useLocation();

  return (
    <div
      className="sticky top-[72px] z-40 overflow-x-auto scrollbar-hide"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <nav
        dir="rtl"
        className="flex items-stretch min-w-max"
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
              aria-current={isActive ? "page" : undefined}
              className={`
                flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium
                whitespace-nowrap outline-none select-none transition-colors duration-150
                focus-visible:outline-2 focus-visible:outline-white/40
                ${
                  isActive
                    ? "bg-[#5A2D82] text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
