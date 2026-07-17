import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground text-center p-4">
      <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold mb-4 text-primary">404 - الصفحة غير موجودة</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. قد تكون محذوفة أو تم تغيير رابطها.
      </p>
      <Button asChild size="lg">
        <Link href="/">العودة للرئيسية</Link>
      </Button>
    </div>
  );
}
