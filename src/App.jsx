import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword.jsx';
import ProfileVerify from './pages/ProfileVerify.jsx';
import { isValidComponent, validatePages } from '@/lib/componentUtils';

const { Pages, Layout, mainPage } = pagesConfig;

// Validate all pages on startup and log any issues to the console
validatePages(Pages);

const mainPageKey = mainPage ?? Object.keys(Pages)[0];

// Fallback component rendered when a page component is missing or invalid
function FallbackPage({ pageName }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="max-w-md w-full rounded-2xl border border-yellow-500/20 bg-[#141414] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Page Error</p>
        <h1 className="mt-3 text-2xl font-black text-white">Page Not Available</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          {pageName
            ? `The page "${pageName}" could not be loaded because it is not a valid component.`
            : 'This page could not be loaded because it is not a valid component.'}
        </p>
        <p className="mt-4 text-xs text-gray-500">Check the browser console for more details.</p>
      </div>
    </div>
  );
}

/**
 * Returns the page component for the given key, or a FallbackPage if invalid.
 */
function getSafePage(key) {
  const component = Pages[key];
  if (isValidComponent(component)) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[App] Rendering page: "${key}"`, component);
    }
    return component;
  }
  console.error(`[App] Page "${key}" is not a valid React component. Falling back to FallbackPage.`, component);
  return () => <FallbackPage pageName={key} />;
}

const MainPage = isValidComponent(Pages[mainPageKey])
  ? Pages[mainPageKey]
  : () => <FallbackPage pageName={mainPageKey} />;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function SchoolAccessBlocked({ status, schoolName }) {
  const copy = status === 'suspended'
    ? {
      title: 'School Access Suspended',
      body: 'Your school account has been temporarily suspended. Contact NxGenSports support or your super admin for reactivation.',
    }
    : {
      title: 'School Access Deactivated',
      body: 'Your school account is currently deactivated. Contact NxGenSports support or your super admin if this was done in error.',
    };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#141414] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Account Status</p>
        <h1 className="mt-3 text-2xl font-black text-white">{copy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">{copy.body}</p>
        {schoolName && <p className="mt-4 text-xs text-gray-500">School: {schoolName}</p>}
      </div>
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user } = useAuth();
  const [schoolAccess, setSchoolAccess] = useState({ loading: false, status: 'active', schoolName: '' });

  useEffect(() => {
    let mounted = true;

    const loadSchoolAccess = async () => {
      if (!user || user.role === 'super_admin' || !user.team_id) {
        if (mounted) {
          setSchoolAccess({ loading: false, status: 'active', schoolName: user?.school_name || '' });
        }
        return;
      }

      if (mounted) {
        setSchoolAccess(prev => ({ ...prev, loading: true }));
      }

      try {
        const schools = user.school_id
          ? await base44.entities.School.filter({ id: user.school_id }, '-created_date', 1)
          : await base44.entities.School.filter({ team_id: user.team_id }, '-created_date', 1);
        const school = schools?.[0];
        if (!mounted) return;

        setSchoolAccess({
          loading: false,
          status: school?.status || 'active',
          schoolName: school?.school_name || user.school_name || '',
        });
      } catch {
        if (mounted) {
          setSchoolAccess({ loading: false, status: 'active', schoolName: user.school_name || '' });
        }
      }
    };

    loadSchoolAccess();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || schoolAccess.loading) {
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
      // Show branded login screen instead of immediate redirect
      return <Login />;
    }
  }

  // First-login profile verification for any user who hasn't confirmed details yet
  if (user && user.profile_verified !== true) {
    return <ProfileVerify />;
  }

  if (user && user.role !== 'super_admin' && ['suspended', 'deactivated'].includes(schoolAccess.status)) {
    return <SchoolAccessBlocked status={schoolAccess.status} schoolName={schoolAccess.schoolName} />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path]) => {
        const Page = getSafePage(path);
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        );
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/ResetPassword" element={<ResetPassword />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
