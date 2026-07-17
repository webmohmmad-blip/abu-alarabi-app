import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  Users,
  BookOpen,
  FileText,
  PenTool,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Activity,
  GraduationCap,
  Clock,
} from "lucide-react";

function useAdminDashboard() {
  return useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: () =>
      customFetch<{
        totalStudents: number;
        totalTeachers: number;
        totalSubjects: number;
        totalDossiers: number;
        totalWorksheets: number;
        totalExams: number;
        totalComments: number;
        pendingReports: number;
        todaySessions: number;
        activeUsersNow: number;
        newUsersThisWeek: number;
        totalStudyHoursAllTime: number;
      }>("/api/admin/dashboard", { method: "GET" }),
  });
}

function useAdminActivity() {
  return useQuery({
    queryKey: ["/api/admin/activity"],
    queryFn: () =>
      customFetch<Array<{
        id: number;
        type: string;
        description: string;
        actorName: string;
        createdAt: string;
      }>>("/api/admin/activity?limit=10", { method: "GET" }),
    refetchInterval: 30000,
  });
}

const statCards = [
  { key: "totalStudents", label: "إجمالي الطلاب", icon: GraduationCap, color: "from-primary to-primary/70", textColor: "text-primary" },
  { key: "totalTeachers", label: "المعلمون", icon: Users, color: "from-cyan-600 to-cyan-500", textColor: "text-cyan-400" },
  { key: "totalDossiers", label: "الدوسيات", icon: BookOpen, color: "from-amber-600 to-amber-500", textColor: "text-amber-400" },
  { key: "totalExams", label: "الامتحانات", icon: PenTool, color: "from-emerald-600 to-emerald-500", textColor: "text-emerald-400" },
  { key: "totalWorksheets", label: "أوراق العمل", icon: FileText, color: "from-rose-600 to-rose-500", textColor: "text-rose-400" },
  { key: "totalComments", label: "التعليقات", icon: MessageSquare, color: "from-violet-600 to-violet-500", textColor: "text-violet-400" },
  { key: "todaySessions", label: "جلسات اليوم", icon: Activity, color: "from-sky-600 to-sky-500", textColor: "text-sky-400" },
  { key: "newUsersThisWeek", label: "مستخدمون جدد (الأسبوع)", icon: TrendingUp, color: "from-fuchsia-600 to-fuchsia-500", textColor: "text-fuchsia-400" },
] as const;

const actionLabels: Record<string, string> = {
  user_create: "إنشاء مستخدم",
  user_update: "تحديث مستخدم",
  user_delete: "حذف مستخدم",
  user_suspend: "تعليق مستخدم",
  user_activate: "تفعيل مستخدم",
  password_reset: "إعادة تعيين كلمة المرور",
  comment_hide: "إخفاء تعليق",
  settings_update: "تحديث الإعدادات",
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboard();
  const { data: activity } = useAdminActivity();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على منصة أبو العربي</p>
        </motion.div>

        {/* Alert if pending reports */}
        {stats && stats.pendingReports > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-medium text-amber-400">تنبيه: </span>
              <span className="text-amber-300/80">يوجد {stats.pendingReports} تقرير بلاغ بانتظار المراجعة</span>
            </div>
          </motion.div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/8 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      {isLoading ? (
                        <Skeleton className="h-9 w-20 mt-1 bg-white/10" />
                      ) : (
                        <p className={`text-3xl font-bold mt-1 ${card.textColor}`}>
                          {(stats as any)?.[card.key]?.toLocaleString("ar") ?? 0}
                        </p>
                      )}
                    </div>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-20`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Summary row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Study hours */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-white">إجمالي ساعات الدراسة</h3>
              </div>
              {isLoading ? (
                <Skeleton className="h-16 w-32 bg-white/10" />
              ) : (
                <div>
                  <p className="text-5xl font-bold text-white">{stats?.totalStudyHoursAllTime?.toLocaleString("ar") ?? 0}</p>
                  <p className="text-muted-foreground mt-1">ساعة دراسة على المنصة</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity log */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h3 className="font-semibold text-white mb-4">آخر النشاطات</h3>
              {!activity ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full bg-white/10" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد نشاطات حتى الآن</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.actorName} • {new Date(item.createdAt).toLocaleDateString("ar-JO")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
