import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/auth-context';

import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Onboarding from '@/pages/onboarding';
import Dashboard from '@/pages/dashboard';
import Dossiers from '@/pages/dossiers';
import DossierDetail from '@/pages/dossier-detail';
import Worksheets from '@/pages/worksheets';
import Exams from '@/pages/exams';
import ExamInstructions from '@/pages/exam-instructions';
import ExamTake from '@/pages/exam-take';
import ExamResult from '@/pages/exam-result';
import Quiz from '@/pages/quiz';
import StudyPlan from '@/pages/study-plan';
import StudyRoom from '@/pages/study-room';
import Notes from '@/pages/notes';
import Statistics from '@/pages/statistics';
import Profile from '@/pages/profile';
import Settings from '@/pages/settings';
import Videos from '@/pages/videos';

// Admin pages
import AdminDashboard from '@/pages/admin/index';
import AdminUsers from '@/pages/admin/users';
import AdminGroups from '@/pages/admin/groups';
import AdminContent from '@/pages/admin/content';
import AdminRoles from '@/pages/admin/roles';
import AdminSettings from '@/pages/admin/settings';
import AdminAudit from '@/pages/admin/audit';
import AdminReports from '@/pages/admin/reports';
import AdminAnnouncements from '@/pages/admin/announcements';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding" component={Onboarding} />

      {/* Student */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dossiers" component={Dossiers} />
      <Route path="/dossiers/:id" component={DossierDetail} />
      <Route path="/worksheets" component={Worksheets} />
      <Route path="/exams" component={Exams} />
      <Route path="/exams/:id" component={ExamInstructions} />
      <Route path="/exams/:id/take" component={ExamTake} />
      <Route path="/exams/results/:id" component={ExamResult} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/study-plan" component={StudyPlan} />
      <Route path="/study-room" component={StudyRoom} />
      <Route path="/notes" component={Notes} />
      <Route path="/videos" component={Videos} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/groups" component={AdminGroups} />
      <Route path="/admin/content" component={AdminContent} />
      <Route path="/admin/roles" component={AdminRoles} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/announcements" component={AdminAnnouncements} />

      <Route component={NotFound} />
    </Switch>
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
