import { Link, useLocation } from "wouter";

const NAV_ITEMS = [
  { name: "لوحتي",                  href: "/dashboard"   },
  { name: "الدوسيات",               href: "/dossiers"    },
  { name: "أوراق العمل",            href: "/worksheets"  },
  { name: "الامتحانات الإلكترونية", href: "/exams"       },
  { name: "الكويز الأسبوعي",        href: "/weekly-quiz" },
  { name: "غرفتي الدراسية",         href: "/study-room"  },
];

export function StudentTopNavigation() {
  const [location] = useLocation();

  return (
    <div
      className="sticky top-[72px] z-40 overflow-x-auto scrollbar-hide"
      style={{ backgroundColor: "#282a35" }}
    >
      <nav
        dir="rtl"
        className="flex items-stretch min-w-max"
        aria-label="قائمة التنقل الرئيسية"
      >
        {NAV_ITEMS.map((item, idx) => {
          const isActive =
            location === item.href ||
            location.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="flex items-center outline-none"
              style={{
                borderRight: idx !== 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <span
                className="block px-4 py-2.5 text-[13.5px] font-normal whitespace-nowrap transition-colors duration-100"
                style={{
                  color: isActive ? "#ffffff" : "rgba(255,255,255,0.75)",
                  backgroundColor: isActive ? "#5A2D82" : "transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
