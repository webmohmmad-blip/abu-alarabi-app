import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCreateStudySession, useUpdateStudySession, useListStudyTasks } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Square, 
  Focus, 
  Music, 
  ChevronRight,
  BrainCircuit,
  Coffee,
  CheckCircle2,
  FileText
} from "lucide-react";

type SessionState = 'setup' | 'active' | 'paused' | 'summary';

export default function StudyRoom() {
  const [, setLocation] = useLocation();
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // Default 25 min
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [pauseCount, setPauseCount] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // Setup selections
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [timerMode, setTimerMode] = useState('pomodoro');
  
  const { data: tasksData } = useListStudyTasks({ status: 'pending' });
  const createSession = useCreateStudySession();
  const updateSession = useUpdateStudySession();

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionState === 'active' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionState, timeRemaining]);

  const setMode = (mode: string, minutes: number) => {
    setTimerMode(mode);
    setTimeRemaining(minutes * 60);
    setTotalTime(minutes * 60);
  };

  const handleStart = () => {
    // If no task selected, just use a dummy subjectId 1 for now (in real app, user selects subject if no task)
    const task = tasksData?.find(t => t.id === selectedTask);
    
    createSession.mutate(
      { 
        data: {
          subjectId: 1, // Mock
          type: timerMode,
          plannedMinutes: totalTime / 60,
          taskId: selectedTask || undefined
        }
      },
      {
        onSuccess: (data) => {
          setSessionId(data.id);
          setSessionState('active');
        }
      }
    );
  };

  const handlePause = () => {
    setSessionState('paused');
    setPauseCount(prev => prev + 1);
    if (sessionId) {
      updateSession.mutate({ id: sessionId, data: { status: 'paused' } });
    }
  };

  const handleResume = () => {
    setSessionState('active');
  };

  const handleComplete = () => {
    setSessionState('summary');
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    if (sessionId) {
      updateSession.mutate({ 
        id: sessionId, 
        data: { 
          status: 'completed',
          actualMinutes
        } 
      });
    }
  };

  const handleAbort = () => {
    setSessionState('setup');
    if (sessionId) {
      updateSession.mutate({ id: sessionId, data: { status: 'abandoned' } });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((totalTime - timeRemaining) / totalTime) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  if (sessionState === 'setup') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1/2 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="w-full max-w-2xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/dashboard" className="gap-2"><ChevronRight className="w-4 h-4"/> عودة للوحة التحكم</Link>
          </Button>

          <Card className="border-white/60 shadow-2xl p-8 bg-white/80 backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Focus className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black mb-2">غرفة التركيز والدراسة</h1>
              <p className="text-muted-foreground">بيئة خالية من المشتتات لرفع إنتاجيتك لأقصى حد.</p>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-bold mb-4">اختر نظام المؤقت</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button 
                    onClick={() => setMode('pomodoro', 25)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${timerMode === 'pomodoro' ? 'border-primary bg-primary/5 shadow-sm' : 'border-black/5 hover:border-black/10 bg-white'}`}
                  >
                    <div className="text-2xl font-black text-primary mb-1">25</div>
                    <div className="text-sm font-bold">بومودورو</div>
                    <div className="text-xs text-muted-foreground mt-1">تركيز عالي</div>
                  </button>
                  <button 
                    onClick={() => setMode('balanced', 45)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${timerMode === 'balanced' ? 'border-secondary bg-secondary/5 shadow-sm' : 'border-black/5 hover:border-black/10 bg-white'}`}
                  >
                    <div className="text-2xl font-black text-secondary mb-1">45</div>
                    <div className="text-sm font-bold">متوازن</div>
                    <div className="text-xs text-muted-foreground mt-1">حصة دراسية</div>
                  </button>
                  <button 
                    onClick={() => setMode('deep_focus', 60)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${timerMode === 'deep_focus' ? 'border-accent bg-accent/5 shadow-sm' : 'border-black/5 hover:border-black/10 bg-white'}`}
                  >
                    <div className="text-2xl font-black text-accent mb-1">60</div>
                    <div className="text-sm font-bold">عميق</div>
                    <div className="text-xs text-muted-foreground mt-1">لحل الامتحانات</div>
                  </button>
                </div>
              </div>

              {tasksData && tasksData.length > 0 && (
                <div>
                  <h3 className="font-bold mb-4">اربط بجلسة مع مهمة (اختياري)</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {tasksData.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task.id === selectedTask ? null : task.id)}
                        className={`w-full text-right p-3 rounded-lg border flex items-center gap-3 transition-colors ${selectedTask === task.id ? 'border-primary bg-primary/5' : 'border-black/5 bg-white hover:bg-black/5'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedTask === task.id ? 'border-primary bg-primary' : ''}`}>
                          {selectedTask === task.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <div className="flex-1 truncate">
                          <span className="font-bold text-sm">{task.title}</span>
                          <span className="text-xs text-muted-foreground mr-2 px-2 py-0.5 bg-muted rounded">{task.subjectName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button size="lg" className="w-full text-lg h-14 shadow-xl shadow-primary/20" onClick={handleStart} disabled={createSession.isPending}>
                {createSession.isPending ? "جاري التحضير..." : "ابدأ الجلسة الآن"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionState === 'summary') {
    const actualMinutes = Math.round((totalTime - timeRemaining) / 60);
    
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 border-white/60 shadow-2xl text-center">
          <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-2">أحسنت صنعاً!</h2>
          <p className="text-muted-foreground mb-8">لقد أكملت جلسة دراسية بنجاح، خطوة إضافية نحو هدفك.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-muted p-4 rounded-2xl">
              <div className="text-sm text-muted-foreground mb-1">وقت الدراسة</div>
              <div className="text-2xl font-black text-primary">{actualMinutes} دقيقة</div>
            </div>
            <div className="bg-muted p-4 rounded-2xl">
              <div className="text-sm text-muted-foreground mb-1">مرات التوقف</div>
              <div className="text-2xl font-black text-secondary">{pauseCount}</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold">كيف تقيم مستوى تركيزك؟</h4>
            <div className="flex justify-center gap-2 text-primary">
              <button className="p-4 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold" onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: 'bad' }})}>ضعيف</button>
              <button className="p-4 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold" onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: 'ok' }})}>متوسط</button>
              <button className="p-4 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold" onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: 'good' }})}>جيد</button>
              <button className="p-4 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold" onClick={() => updateSession.mutate({ id: sessionId!, data: { focusLevel: 'great' }})}>ممتاز</button>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-black/5 space-y-3">
            <Button className="w-full" onClick={() => setSessionState('setup')}>جلسة جديدة</Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard">العودة للوحة التحكم</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active / Paused State - Fullscreen distraction free
  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-center relative p-4
      ${sessionState === 'paused' ? 'bg-orange-50' : 'bg-[#1E0D33] text-white'}
    `}>
      {/* Distraction free background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-secondary rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Status Badge */}
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold mb-12 shadow-sm
          ${sessionState === 'paused' ? 'bg-orange-200 text-orange-800' : 'bg-white/10 backdrop-blur-md text-white border border-white/20'}
        `}>
          {sessionState === 'paused' ? 'الجلسة متوقفة مؤقتاً' : 'جلسة تركيز نشطة'}
        </div>

        {/* Circular Timer */}
        <div className="relative flex items-center justify-center mb-12">
          <svg className="w-72 h-72 transform -rotate-90">
            <circle 
              cx="144" cy="144" r={radius} 
              stroke="currentColor" strokeWidth="8" fill="transparent" 
              className={sessionState === 'paused' ? 'text-orange-200' : 'text-white/10'}
            />
            <motion.circle 
              cx="144" cy="144" r={radius} 
              stroke="currentColor" strokeWidth="8" fill="transparent" 
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "linear" }}
              className={sessionState === 'paused' ? 'text-orange-500' : 'text-primary'}
            />
          </svg>
          <div className={`absolute text-6xl font-black tabular-nums tracking-wider ${sessionState === 'paused' ? 'text-orange-900' : 'text-white'}`} dir="ltr">
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-12">
          <Button 
            variant="outline" 
            size="icon" 
            className={`w-14 h-14 rounded-full border-2 ${sessionState === 'paused' ? 'border-orange-300 text-orange-600 hover:bg-orange-100' : 'border-white/20 text-white hover:bg-white/10 hover:border-white/40 bg-transparent'}`}
            onClick={handleAbort}
          >
            <Square className="w-5 h-5 fill-current" />
          </Button>

          {sessionState === 'active' ? (
            <Button 
              size="icon" 
              className="w-20 h-20 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
              onClick={handlePause}
            >
              <Pause className="w-8 h-8 fill-current" />
            </Button>
          ) : (
            <Button 
              size="icon" 
              className="w-20 h-20 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform border-none"
              onClick={handleResume}
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </Button>
          )}

          <Button 
            variant="outline" 
            size="icon" 
            className={`w-14 h-14 rounded-full border-2 ${sessionState === 'paused' ? 'border-orange-300 text-orange-600 hover:bg-orange-100' : 'border-white/20 text-white hover:bg-white/10 hover:border-white/40 bg-transparent'}`}
            onClick={handleComplete}
          >
            <CheckCircle2 className="w-6 h-6" />
          </Button>
        </div>

        {/* Mini tools dock */}
        <div className={`flex items-center gap-4 px-6 py-3 rounded-full backdrop-blur-md border ${sessionState === 'paused' ? 'bg-orange-100 border-orange-200' : 'bg-white/5 border-white/10'}`}>
          <button className={`p-2 rounded-full transition-colors ${sessionState === 'paused' ? 'hover:bg-orange-200 text-orange-700' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}>
            <Music className="w-5 h-5" />
          </button>
          <div className={`w-px h-6 ${sessionState === 'paused' ? 'bg-orange-300' : 'bg-white/20'}`}></div>
          <button className={`p-2 rounded-full transition-colors ${sessionState === 'paused' ? 'hover:bg-orange-200 text-orange-700' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}>
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
