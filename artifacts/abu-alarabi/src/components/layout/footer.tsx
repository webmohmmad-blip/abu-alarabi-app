import { Link } from "wouter";
import { BookOpen, Phone, MapPin, Instagram, Facebook, Youtube, Mail } from "lucide-react";
import { MonochromeLogo } from "@/components/BrandAssets";

/* WhatsApp icon — not in lucide, using inline SVG */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* JO Academy icon */
function JoAcademyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
    </svg>
  );
}

const SOCIALS = [
  {
    href: "https://www.instagram.com/mohammad.alsahori/?hl=ar",
    label: "إنستغرام",
    icon: Instagram,
    color: "hover:bg-pink-600",
  },
  {
    href: "https://www.facebook.com/p/%D8%A7%D9%84%D8%A3%D8%B3%D8%AA%D8%A7%D8%B0-%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%B3%D8%A7%D8%AD%D9%88%D8%B1%D9%8A-%D9%84%D8%BA%D8%A9-%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9-100075808340138/",
    label: "فيسبوك",
    icon: Facebook,
    color: "hover:bg-blue-600",
  },
  {
    href: "https://www.youtube.com/channel/UCw-xJ-EZ1y2Zozbqwiwe4DA",
    label: "يوتيوب",
    icon: Youtube,
    color: "hover:bg-red-600",
  },
  {
    href: "https://wa.me/962798638622",
    label: "واتساب",
    icon: WhatsAppIcon,
    color: "hover:bg-green-600",
  },
  {
    href: "https://www.joacademy.com/teachers/%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%B3%D8%A7%D8%AD%D9%88%D8%B1%D9%8A/shababeek",
    label: "JO Academy",
    icon: JoAcademyIcon,
    color: "hover:bg-amber-500",
  },
] as const;

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground border-t border-white/10 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

          {/* Brand + socials */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <MonochromeLogo showSubtitle={true} className="scale-105" />
            </Link>
            <p className="text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
              رفيقك الدراسي الأول لتوجيهي الأردن. منصة الأستاذ محمد الساحوري للتفوق في اللغة العربية.
            </p>
            {/* Social icons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {SOCIALS.map(({ href, label, icon: Icon, color }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-colors ${color} hover:text-white`}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">روابط سريعة</h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link></li>
              <li><Link href="/dossiers" className="hover:text-primary transition-colors">مكتبة الدوسيات</Link></li>
              <li><Link href="/exams" className="hover:text-primary transition-colors">الامتحانات</Link></li>
              <li><Link href="/worksheets" className="hover:text-primary transition-colors">أوراق العمل</Link></li>
            </ul>
          </div>

          {/* Educational services */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">الخدمات التعليمية</h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><Link href="/schedule" className="hover:text-primary transition-colors">جدولي الدراسي</Link></li>
              <li>
                <a
                  href="https://www.joacademy.com/teachers/%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%B3%D8%A7%D8%AD%D9%88%D8%B1%D9%8A/shababeek"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  دورات JO Academy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact — email only */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">تواصل مع الأستاذ</h3>
            <ul className="space-y-4 text-sm text-sidebar-foreground/70">
              <li>
                <a
                  href="mailto:info@malsahori.com"
                  className="flex items-center gap-3 hover:text-primary transition-colors"
                >
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <span dir="ltr">info@malsahori.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-sm text-sidebar-foreground/50">
          <p>© {new Date().getFullYear()} منصة أبو العربي — الأستاذ محمد الساحوري. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
