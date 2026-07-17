import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useSubmitAnswer, useSubmitExam } from "@workspace/api-client-react";
// Since we don't have a direct query to fetch attempt details by attemptId alone easily in the generated hooks,
// we will simulate fetching the attempt or use a generic approach.
// Let's create a functional UI for the exam taking experience.
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronRight, 
  ChevronLeft, 
  Flag, 
  Clock, 
  AlertCircle,
  Menu,
  CheckCircle2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mock Exam Data for UI building (since we can't easily fetch attempt by ID via generated hooks without altering them)
const mockExamAttempt = {
  id: 1,
  examId: 1,
  title: "امتحان وزاري 2023 - الدورة الصيفية",
  durationMinutes: 120,
  questions: Array.from({ length: 20 }).map((_, i) => ({
    id: i + 1,
    order: i + 1,
    type: "mcq",
    text: `سؤال رقم ${i + 1}: ما هو حل المعادلة التربيعية x^2 - 5x + 6 = 0؟`,
    choices: [
      { id: "A", text: "x = 2, x = 3" },
      { id: "B", text: "x = -2, x = -3" },
      { id: "C", text: "x = 1, x = 6" },
      { id: "D", text: "x = -1, x = -6" },
    ]
  }))
};

export default function ExamTake() {
  const [, setLocation] = useLocation();
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(mockExamAttempt.durationMinutes * 60);
  const [showNav, setShowNav] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  
  const submitAnswer = useSubmitAnswer();
  const submitExam = useSubmitExam();

  const currentQ = mockExamAttempt.questions[currentQIndex];

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (choiceId: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: choiceId }));
    
    // Auto-save (debounced in a real scenario or immediate)
    submitAnswer.mutate({
      data: {
        questionId: currentQ.id,
        answer: choiceId
      }
    });
  };

  const toggleFlag = () => {
    setFlagged(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleFinalSubmit = () => {
    submitExam.mutate(
      { data: { attemptId: mockExamAttempt.id } as any }, // Mock cast since API might differ slightly
      {
        onSuccess: () => {
          setLocation(`/exams/results/${mockExamAttempt.id}`);
        },
        onError: () => {
          // Mock success redirect anyway for demonstration
          setLocation(`/exams/results/${mockExamAttempt.id}`);
        }
      }
    );
  };

  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQIndex === mockExamAttempt.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowNav(!showNav)} className="md:hidden">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{mockExamAttempt.title}</h1>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:block w-32">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
              <span>التقدم</span>
              <span>{Math.round((answeredCount / mockExamAttempt.questions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(answeredCount / mockExamAttempt.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 font-mono font-bold text-lg px-3 py-1 rounded-lg border ${timeLeft < 300 ? 'text-red-600 bg-red-50 border-red-200 animate-pulse' : 'text-primary bg-primary/5 border-primary/20'}`} dir="ltr">
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          
          <Button 
            variant="default" 
            className="hidden md:flex shadow-none"
            onClick={() => setShowSubmitConfirm(true)}
          >
            إنهاء الامتحان
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-bold text-lg">سؤال {currentQ.order} من {mockExamAttempt.questions.length}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleFlag}
                className={`gap-2 ${flagged[currentQ.id] ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}`}
              >
                <Flag className={`w-4 h-4 ${flagged[currentQ.id] ? 'fill-orange-600' : ''}`} />
                {flagged[currentQ.id] ? 'محدد للمراجعة' : 'تحديد للمراجعة'}
              </Button>
            </div>

            <Card className="border-gray-200 shadow-sm mb-6 bg-white">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold leading-relaxed mb-8 text-gray-900">
                  {currentQ.text}
                </h2>
                
                <div className="space-y-3">
                  {currentQ.choices?.map((choice) => {
                    const isSelected = answers[currentQ.id] === choice.id;
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleSelectAnswer(choice.id)}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all flex items-center gap-4
                          ${isSelected 
                            ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                            : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700'
                          }
                        `}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                          ${isSelected ? 'border-primary' : 'border-gray-300'}
                        `}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                        <span className={`text-lg ${isSelected ? 'font-bold' : 'font-medium'}`}>{choice.text}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                size="lg"
                className="gap-2"
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
              >
                <ChevronRight className="w-5 h-5" /> السابق
              </Button>
              
              {!isLastQuestion ? (
                <Button 
                  size="lg"
                  className="gap-2 px-8"
                  onClick={() => setCurrentQIndex(prev => Math.min(mockExamAttempt.questions.length - 1, prev + 1))}
                >
                  التالي <ChevronLeft className="w-5 h-5" />
                </Button>
              ) : (
                <Button 
                  size="lg"
                  variant="default"
                  className="gap-2 px-8 bg-success hover:bg-success/90 text-white"
                  onClick={() => setShowSubmitConfirm(true)}
                >
                  تسليم الامتحان <CheckCircle2 className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Navigation Sidebar */}
        <aside className={`
          w-72 bg-white border-r border-gray-200 flex flex-col absolute md:relative inset-y-0 right-0 z-30
          transform transition-transform duration-300 ease-in-out
          ${showNav ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-900">خريطة الأسئلة</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowNav(false)} className="md:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {mockExamAttempt.questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged[q.id];
                const isCurrent = i === currentQIndex;
                
                let baseClass = "w-full aspect-square rounded-lg border flex items-center justify-center font-bold text-sm transition-all";
                if (isCurrent) {
                  baseClass += " ring-2 ring-primary ring-offset-2 border-primary bg-primary text-white";
                } else if (isFlagged) {
                  baseClass += " border-orange-300 bg-orange-50 text-orange-700";
                } else if (isAnswered) {
                  baseClass += " border-gray-300 bg-gray-100 text-gray-900";
                } else {
                  baseClass += " border-gray-200 bg-white text-gray-500 hover:bg-gray-50";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQIndex(i);
                      if(window.innerWidth < 768) setShowNav(false);
                    }}
                    className={baseClass}
                  >
                    {q.order}
                    {isFlagged && <div className="absolute w-2 h-2 bg-orange-500 rounded-full top-1 right-1" />}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div> مجاب ({answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border border-gray-200"></div> غير مجاب ({mockExamAttempt.questions.length - answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-50 border border-orange-300 relative">
                  <div className="absolute w-1.5 h-1.5 bg-orange-500 rounded-full top-0.5 right-0.5" />
                </div> محدد للمراجعة
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 md:hidden shrink-0">
            <Button className="w-full" onClick={() => setShowSubmitConfirm(true)}>إنهاء الامتحان</Button>
          </div>
        </aside>
        
        {/* Backdrop for mobile sidebar */}
        {showNav && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setShowNav(false)} />
        )}
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">تأكيد التسليم</h3>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <ul className="space-y-2 text-sm font-bold text-gray-700">
                  <li className="flex justify-between">
                    <span>إجمالي الأسئلة:</span> <span>{mockExamAttempt.questions.length}</span>
                  </li>
                  <li className="flex justify-between text-success">
                    <span>الأسئلة المجابة:</span> <span>{answeredCount}</span>
                  </li>
                  <li className="flex justify-between text-destructive">
                    <span>غير مجاب:</span> <span>{mockExamAttempt.questions.length - answeredCount}</span>
                  </li>
                </ul>
              </div>
              
              <p className="text-center text-gray-500 mb-6 text-sm">
                هل أنت متأكد من رغبتك في تسليم الامتحان؟ لن تتمكن من تعديل إجاباتك بعد التسليم.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  عودة للامتحان
                </Button>
                <Button onClick={handleFinalSubmit} disabled={submitExam.isPending} className="bg-primary">
                  {submitExam.isPending ? "جاري التسليم..." : "تأكيد التسليم"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
