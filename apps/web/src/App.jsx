import { Toaster } from "@/components/ui/toaster"
import { InstallPrompt } from "@/components/ui/InstallPrompt"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/components/providers/NavigationTracker'
import { UnlockScreen } from '@/components/providers/UnlockScreen'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import PageNotFound from '@/pages/PageNotFound';
import { AuthProvider, useAuth } from '@/components/providers/AuthContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import { useState, useEffect } from 'react';
import { tenantsApi } from '@/api/client';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const LoginRoute = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  console.log('🔍 LoginRoute - isLoadingAuth:', isLoadingAuth, 'isAuthenticated:', isAuthenticated);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to home
  if (isAuthenticated) {
    console.log('✅ User authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('📝 Showing login form');
  return <Login />;
};

const OnboardingRoute = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  console.log('🔍 OnboardingRoute - isLoadingAuth:', isLoadingAuth, 'isAuthenticated:', isAuthenticated);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow public access to onboarding (STEP_1 - create tenant)
  // The Onboarding component will handle redirects for authenticated users
  console.log('✅ Showing onboarding (public access allowed)');
  return <Onboarding />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, requiresUnlock } = useAuth();
  const [shouldCheckOnboarding, setShouldCheckOnboarding] = useState(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const navigate = useNavigate();

  // Check if user needs to complete onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || !user.tenantId || !shouldCheckOnboarding) return;
      
      try {
        setIsCheckingOnboarding(true);
        const response = await tenantsApi.get(user.tenantId);
        
        // If onboarding is not completed, redirect to onboarding
        if (response.data && response.data.onboardingStatus !== 'COMPLETED') {
          console.log('⚠️  Onboarding not completed, redirecting...');
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If error checking onboarding, allow user to continue
      } finally {
        setIsCheckingOnboarding(false);
        setShouldCheckOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user, shouldCheckOnboarding, navigate]);

  // Show unlock screen if user is authenticated but encryption key is not available
  if (requiresUnlock) {
    return <UnlockScreen />;
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || isCheckingOnboarding) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <InstallPrompt />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginRoute />} />

              {/* Onboarding route (requires authentication) */}
              <Route path="/onboarding" element={<OnboardingRoute />} />

              {/* Protected routes */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
