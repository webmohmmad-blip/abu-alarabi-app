import { Link } from "wouter";
import { BookOpen, Phone, Mail, MapPin, Instagram, Facebook, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground border-t border-white/10 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-wide">أبو العربي</span>
            </Link>
            <p className="text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
              رفيقك الدراسي الأول لتوجيهي الأردن. المنصة التعليمية الأقوى والأكثر تطوراً لضمان تفوقك ونجاحك.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">روابط سريعة</h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link></li>
              <li><Link href="/dossiers" className="hover:text-primary transition-colors">مكتبة الدوسيات</Link></li>
              <li><Link href="/exams" className="hover:text-primary transition-colors">الامتحانات الوزارية</Link></li>
              <li><Link href="/quiz" className="hover:text-primary transition-colors">الكويز الأسبوعي</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">من نحن</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">الخدمات التعليمية</h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><Link href="/study-plan" className="hover:text-primary transition-colors">الخطة الدراسية الذكية</Link></li>
              <li><Link href="/study-room" className="hover:text-primary transition-colors">غرفة التركيز والدراسة</Link></li>
              <li><Link href="/worksheets" className="hover:text-primary transition-colors">أوراق العمل التفاعلية</Link></li>
              <li><Link href="/notes" className="hover:text-primary transition-colors">ملاحظاتي الذكية</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">تواصل معنا</h3>
            <ul className="space-y-4 text-sm text-sidebar-foreground/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>عمان، الأردن - شارع الجامعة الأردنية</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span dir="ltr">+962 79 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>info@abualarabi.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-sidebar-foreground/50">
          <p>© {new Date().getFullYear()} منصة أبو العربي. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
