import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/auth-context';
import { BrandSymbol } from "@/components/BrandAssets";

// ── Public pages ──────────────────────────────────────────────────────────────
// Home and NotFound are always eager (zero layout shift on first paint).
// Login and Register are lazy: ~80 % of traffic never needs them during a session.
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';

const Login    = lazy(() => import('@/pages/login'));
const Register = lazy(() => import('@/pages/register'));

// ── Student pages (lazy — only needed after login) ────────────────────────────
const Dashboard       = lazy(() => import('@/pages/dashboard'));
const Dossiers        = lazy(() => import('@/pages/dossiers'));
const DossierDetail   = lazy(() => import('@/pages/dossier-detail'));
const Worksheets      = lazy(() => import('@/pages/worksheets'));
const WorksheetDetail = lazy(() => import('@/pages/worksheet-detail'));
const Exams           = lazy(() => import('@/pages/exams'));
const ExamInstructions= lazy(() => import('@/pages/exam-instructions'));
const ExamTake        = lazy(() => import('@/pages/exam-take'));
const ExamResult      = lazy(() => import('@/pages/exam-result'));
const ExamReview      = lazy(() => import('@/pages/exam-review'));
const StudyPlan       = lazy(() => import('@/pages/study-plan'));
const Notes           = lazy(() => import('@/pages/notes'));
const Statistics      = lazy(() => import('@/pages/statistics'));
const Profile         = lazy(() => import('@/pages/profile'));
const Settings        = lazy(() => import('@/pages/settings'));
const Summaries       = lazy(() => import('@/pages/summaries'));
const Schedule        = lazy(() => import('@/pages/schedule'));

// ── Admin pages (lazy — never needed by students) ─────────────────────────────
const AdminDashboard    = lazy(() => import('@/pages/admin/index'));
const AdminUsers        = lazy(() => import('@/pages/admin/users'));
const AdminGroups       = lazy(() => import('@/pages/admin/groups'));
const AdminContent      = lazy(() => import('@/pages/admin/content'));
const AdminExams        = lazy(() => import('@/pages/admin/exams'));
const AdminSummaries    = lazy(() => import('@/pages/admin/summaries'));
const AdminRoles        = lazy(() => import('@/pages/admin/roles'));
const AdminSettings     = lazy(() => import('@/pages/admin/settings'));
const AdminAudit        = lazy(() => import('@/pages/admin/audit'));
const AdminReports      = lazy(() => import('@/pages/admin/reports'));
const AdminAnnouncements= lazy(() => import('@/pages/admin/announcements'));
const AdminWorksheets   = lazy(() => import('@/pages/admin/worksheets'));
const AdminAdvertisements = lazy(() => import('@/pages/admin/advertisements'));
const AdminHomepageSettings = lazy(() => import('@/pages/admin/homepage-settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      staleTime: 30_000,
    },
  },
});

// Shared full-screen spinner used while lazy chunks are loading
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-pulse">
        <BrandSymbol className="w-12 h-12" color="#5A2D82" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public */}
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* Student */}
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dossiers" component={Dossiers} />
        <Route path="/dossiers/:id" component={DossierDetail} />
        <Route path="/worksheets" component={Worksheets} />
        <Route path="/worksheets/:id" component={WorksheetDetail} />

        {/* Exam routes */}
        <Route path="/exams" component={Exams} />
        <Route path="/exams/:examId/instructions" component={ExamInstructions} />
        <Route path="/exams/:examId/attempt/:attemptId" component={ExamTake} />
        <Route path="/exams/:examId/result/:attemptId" component={ExamResult} />
        <Route path="/exams/:examId/result/:attemptId/review" component={ExamReview} />
        <Route path="/exams/:examId/review/:attemptId" component={ExamReview} />
        <Route path="/exams/:id" component={ExamInstructions} />

        {/* Other student pages */}
        <Route path="/study-plan" component={StudyPlan} />
        <Route path="/notes" component={Notes} />
        <Route path="/summaries" component={Summaries} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />

        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/groups" component={AdminGroups} />
        <Route path="/admin/content" component={AdminContent} />
        <Route path="/admin/exams" component={AdminExams} />
        <Route path="/admin/summaries" component={AdminSummaries} />
        <Route path="/admin/roles" component={AdminRoles} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/audit" component={AdminAudit} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/announcements" component={AdminAnnouncements} />
        <Route path="/admin/worksheets" component={AdminWorksheets} />
        <Route path="/admin/advertisements" component={AdminAdvertisements} />
        <Route path="/admin/homepage-settings" component={AdminHomepageSettings} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
