import { useGetStatistics, useGetSubjectStatistics, useGetAchievements } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Trophy, 
  Clock, 
  Target, 
  BookOpen, 
  CheckCircle2, 
  Flame, 
  Award,
  TrendingUp,
  BrainCircuit
} from "lucide-react";

export default function Statistics() {
  const { data: stats, isLoading: statsLoading } = useGetStatistics();
  const { data: subjectStats, isLoading: subLoading } = useGetSubjectStatistics();
  const { data: achievements, isLoading: achLoading } = useGetAchievements();

  // Mock data for chart if api doesn't provide weeklyMinutes array format needed
  const chartData = stats?.weeklyMinutes ? 
    stats.weeklyMinutes.map((val, i) => ({
      name: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][i],
      minutes: val
    })) : 
    [
      { name: 'السبت', minutes: 120 },
      { name: 'الأحد', minutes: 180 },
      { name: 'الاثنين', minutes: 150 },
      { name: 'الثلاثاء', minutes: 210 },
      { name: 'الأربعاء', minutes: 90 },
      { name: 'الخميس', minutes: 240 },
      { name: 'الجمعة', minutes: 0 },
    ];

  if (statsLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatHours = (minutes: number) => (minutes / 60).toFixed(1);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            إحصائيات الأداء
          </h1>
          <p className="text-muted-foreground mt-2">راقب تقدمك وتطور مستواك في اللغة العربية.</p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-white/60 bg-white/70 backdrop-blur shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-primary tabular-nums">{formatHours(stats.totalStudyMinutes)}</div>
              <div className="text-sm font-bold text-muted-foreground mt-1">ساعة دراسة</div>
            </CardContent>
          </Card>
          <Card className="border-white/60 bg-white/70 backdrop-blur shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-secondary tabular-nums">{stats.completionRate}%</div>
              <div className="text-sm font-bold text-muted-foreground mt-1">معدل الإنجاز</div>
            </CardContent>
          </Card>
          <Card className="border-white/60 bg-white/70 backdrop-blur shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Flame className="w-6 h-6" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-orange-600 tabular-nums">{stats.streakDays}</div>
              <div className="text-sm font-bold text-muted-foreground mt-1">أيام متتالية</div>
            </CardContent>
          </Card>
          <Card className="border-white/60 bg-white/70 backdrop-blur shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-accent tabular-nums">{stats.averageScore}%</div>
              <div className="text-sm font-bold text-muted-foreground mt-1">معدل الامتحانات</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Activity Chart */}
          <Card className="border-white/60 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-primary" /> نشاط الدراسة هذا الأسبوع
              </h3>
              <div className="h-[300px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance by Subject */}
          <Card className="border-white/60 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-secondary" /> الأداء حسب المادة
              </h3>
              
              <div className="space-y-5">
                {subLoading ? (
                  [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
                ) : subjectStats?.map((subject) => (
                  <div key={subject.subjectId}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.subjectColor || 'var(--primary)' }}></div>
                        {subject.subjectName}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground">
                        {subject.progress}% إنجاز | {subject.examAverage}% امتحانات
                      </div>
                    </div>
                    <Progress value={subject.progress} className="h-2" style={{ '--progress-background': subject.subjectColor } as React.CSSProperties} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <div>
          <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" /> إنجازاتي والأوسمة
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {achLoading ? (
              [1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-2xl" />)
            ) : achievements?.map((badge) => (
              <div 
                key={badge.id} 
                className={`bg-white rounded-2xl p-4 text-center border-2 transition-all ${badge.isEarned ? 'border-accent/30 shadow-md shadow-accent/10' : 'border-transparent opacity-50 grayscale'}`}
              >
                <div className="text-4xl mb-3">{badge.icon}</div>
                <h4 className="font-bold text-sm leading-tight mb-1">{badge.title}</h4>
                {badge.isEarned && badge.earnedAt && (
                  <div className="text-[10px] text-muted-foreground">{new Date(badge.earnedAt).toLocaleDateString('ar-JO')}</div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
