import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetProfile, useUpdateProfile, useGetAchievements } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserCircle, 
  Camera, 
  Edit3, 
  Save, 
  Trophy, 
  BookOpen, 
  Target,
  GraduationCap
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useGetProfile();
  const { data: achievements } = useGetAchievements();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    goal: "",
    school: ""
  });

  // Initialize form when profile loads
  if (profile && !formData.fullName && !isEditing) {
    setFormData({
      fullName: profile.fullName || "",
      goal: profile.goal || "",
      school: profile.school || ""
    });
  }

  const handleSave = () => {
    updateProfile.mutate(
      { data: formData },
      {
        onSuccess: () => {
          setIsEditing(false);
          // Invalidate queries to refresh data across app if needed
          queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }
      }
    );
  };

  if (isLoading || !profile) {
    return (
      <DashboardLayout>
        <Skeleton className="h-64 w-full rounded-3xl mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="md:col-span-2 h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Profile Hero */}
        <Card className="border-none shadow-xl overflow-hidden relative bg-gradient-to-r from-primary to-[#3a1a59] text-white">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          <CardContent className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-black">{profile.fullName?.charAt(0) || 'ع'}</span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white text-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center md:text-right flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs mb-3 border border-white/20">
                طالب {profile.grade} - {profile.field}
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-2">{profile.fullName}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1"><Target className="w-4 h-4"/> الهدف: {profile.goal}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4"/> جيل {profile.tawjihiYear}</span>
                {profile.school && <span className="flex items-center gap-1"><BookOpen className="w-4 h-4"/> {profile.school}</span>}
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <div className="text-5xl font-black text-accent mb-1">{profile.streakDays}</div>
              <div className="text-sm font-bold text-white/80">أيام دراسة متتالية</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <Card className="md:col-span-2 border-white/60 shadow-lg">
            <CardContent className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6 border-b border-black/5 pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-primary" /> المعلومات الشخصية
                </h2>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-primary gap-2">
                    <Edit3 className="w-4 h-4" /> تعديل
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>إلغاء</Button>
                    <Button size="sm" onClick={handleSave} className="gap-2" disabled={updateProfile.isPending}>
                      <Save className="w-4 h-4" /> حفظ
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    {isEditing ? (
                      <Input 
                        value={formData.fullName} 
                        onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))} 
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-xl font-medium">{profile.fullName}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <div className="p-3 bg-muted/50 rounded-xl font-medium text-muted-foreground cursor-not-allowed" dir="ltr">
                      {profile.phone}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>الهدف الدراسي</Label>
                    {isEditing ? (
                      <Input 
                        value={formData.goal} 
                        onChange={e => setFormData(f => ({ ...f, goal: e.target.value }))} 
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-xl font-medium">{profile.goal || 'لم يتم التحديد'}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>المدرسة (اختياري)</Label>
                    {isEditing ? (
                      <Input 
                        value={formData.school} 
                        onChange={e => setFormData(f => ({ ...f, school: e.target.value }))} 
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-xl font-medium">{profile.school || 'لم يتم التحديد'}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges Highlight */}
          <Card className="border-white/60 shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-accent" /> أحدث الأوسمة
              </h2>
              
              <div className="space-y-4">
                {achievements?.filter(a => a.isEarned).slice(0, 4).map(badge => (
                  <div key={badge.id} className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/10 rounded-xl">
                    <div className="text-3xl shrink-0">{badge.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm text-accent-foreground">{badge.title}</h4>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
                
                {achievements?.filter(a => a.isEarned).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لم تكتسب أي أوسمة بعد. ادرس أكثر لتحصد الجوائز!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
