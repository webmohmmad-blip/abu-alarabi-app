import { useGetCurrentQuiz, useGetQuizLeaderboard } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Users, Gift, Medal, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Quiz() {
  const { data: currentQuiz, isLoading: quizLoading } = useGetCurrentQuiz();
  const { data: leaderboard, isLoading: boardLoading } = useGetQuizLeaderboard();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center shadow-sm">
                <Trophy className="w-6 h-6" />
              </div>
              الكويز الأسبوعي
            </h1>
            <p className="text-muted-foreground mt-2">تحدَّ نفسك وزملائك أسبوعياً، واربح جوائز قيمة.</p>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border shadow-sm">
            <span className="text-sm font-bold text-muted-foreground">رصيد نقاطك:</span>
            <span className="font-black text-xl text-accent flex items-center gap-1">
              <Trophy className="w-5 h-5"/>
              {leaderboard?.find((e) => e.isCurrentUser)?.score ?? 0}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          {/* Current Quiz Card */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> التحدي الحالي</h2>
            
            {quizLoading ? (
              <Skeleton className="h-80 w-full rounded-3xl" />
            ) : currentQuiz ? (
              <Card className="bg-gradient-to-br from-primary to-[#3a1a59] text-white overflow-hidden relative shadow-xl border-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <CardContent className="p-8 relative z-10">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 mb-6">
                    {currentQuiz.subjectName}
                  </Badge>
                  
                  <h3 className="text-3xl font-black mb-3">{currentQuiz.title}</h3>
                  <p className="text-white/80 leading-relaxed max-w-md mb-8">
                    {currentQuiz.description || "شارك الآن في الكويز الأسبوعي. أجب بسرعة وبدقة لتصدر لوحة الشرف والفوز بجوائز هذا الأسبوع."}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-accent" />
                      <div className="text-xl font-bold">{currentQuiz.durationMinutes} د</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
                      <Trophy className="w-5 h-5 mx-auto mb-1 text-success" />
                      <div className="text-xl font-bold">{currentQuiz.questionCount} س</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
                      <Users className="w-5 h-5 mx-auto mb-1 text-secondary" />
                      <div className="text-xl font-bold">{currentQuiz.participants}</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
                      <Gift className="w-5 h-5 mx-auto mb-1 text-pink-400" />
                      <div className="text-sm font-bold mt-1">جوائز قيمة</div>
                    </div>
                  </div>
                  
                  {currentQuiz.hasParticipated ? (
                    <div className="bg-success/20 border border-success/30 rounded-xl p-4 text-center">
                      <p className="font-bold text-success flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> لقد شاركت في هذا التحدي!
                      </p>
                      {currentQuiz.userRank && (
                        <p className="text-sm mt-1 text-white/80">ترتيبك الحالي: {currentQuiz.userRank}</p>
                      )}
                    </div>
                  ) : (
                    <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg gap-2">
                      ابدأ التحدي الآن <ArrowLeft className="w-5 h-5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-10 text-center border-dashed">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-bold text-lg mb-1">لا يوجد تحدي حالياً</h3>
                <p className="text-muted-foreground text-sm">انتظر التحدي القادم يوم الجمعة الساعة 8:00 مساءً.</p>
              </Card>
            )}

            {/* Prizes Card — shown only when a quiz is active and has prizes defined */}
            {currentQuiz?.prizes && currentQuiz.prizes.length > 0 && (
              <Card className="bg-white/60 backdrop-blur-xl border-white/80 shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-500" /> جوائز هذا الأسبوع
                  </h3>
                  <div className="grid gap-3">
                    {currentQuiz.prizes.map((prize: { rank: number; description: string }, i: number) => (
                      <div key={i} className={`p-4 rounded-xl text-center border ${
                        prize.rank === 1 ? "bg-gradient-to-b from-yellow-100 to-yellow-50 border-yellow-200" :
                        prize.rank === 2 ? "bg-gradient-to-b from-gray-200 to-gray-100 border-gray-300" :
                        "bg-gradient-to-b from-orange-200 to-orange-100 border-orange-300"
                      }`}>
                        <Medal className={`w-5 h-5 mx-auto mb-1 ${prize.rank === 1 ? "text-yellow-600" : prize.rank === 2 ? "text-gray-600" : "text-orange-700"}`} />
                        <div className="font-bold text-sm">المركز {prize.rank === 1 ? "الأول" : prize.rank === 2 ? "الثاني" : "الثالث"}</div>
                        <div className="text-xs font-bold mt-1 text-muted-foreground">{prize.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leaderboard */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Medal className="w-5 h-5 text-accent" /> لوحة الشرف</h2>
            
            <Card className="border-white/60 shadow-lg bg-white/80 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-0">
                {boardLoading ? (
                  <div className="p-6 space-y-4">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="divide-y divide-black/5">
                    {leaderboard.map((entry, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 flex items-center gap-4 transition-colors hover:bg-muted/50 ${entry.isCurrentUser ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm
                          ${entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' : 
                            entry.rank === 2 ? 'bg-gray-300 text-gray-800' : 
                            entry.rank === 3 ? 'bg-orange-300 text-orange-900' : 
                            'bg-muted text-muted-foreground'}
                        `}>
                          {entry.rank}
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden shrink-0">
                          {entry.avatarUrl ? (
                            <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-primary text-sm">
                              {entry.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate text-sm">{entry.displayName}</div>
                          <div className="text-xs text-muted-foreground truncate">{entry.governorate || 'الأردن'}</div>
                        </div>
                        
                        <div className="text-center shrink-0">
                          <div className="font-black text-primary text-lg">{entry.score}</div>
                          <div className="text-[10px] text-muted-foreground">{entry.timeTakenSeconds} ثانية</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-muted-foreground">
                    لم تبدأ المنافسة بعد. كن أول المشاركين!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Quick missing import fix
import { CheckCircle2 } from "lucide-react";