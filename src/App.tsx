import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardLayout, Footer, Header, Loading } from './components/components';
import { fetchSession, logout, TOOL_ORDER, type SessionState, type ToolId } from './lib/account';
import { adsEligible, loadAdSense, loadGoogleAnalytics, pushAdSlot, trackPageView } from './lib/analytics';

const GuestLanding = lazy(() => import('./pages/GuestLanding'));
const UpgradeScreen = lazy(() => import('./pages/UpgradeScreen'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const SectionPage = lazy(() => import('./pages/SectionPage'));
const UnknownScreen = lazy(() => import('./pages/UnknownScreen'));

function HomeRoute({ session, onRetry }: { session: SessionState | null; onRetry: () => void }): ReactNode {
  if (!session) return <Loading />;
  if (session.status === 'guest') return <GuestLanding />;
  if (session.status === 'free') return <UpgradeScreen email={session.email} />;
  if (session.status === 'unknown') return <UnknownScreen onRetry={onRetry} />;
  return (
    <DashboardLayout status={session.status}>
      <DashboardHome status={session.status} email={session.email} />
    </DashboardLayout>
  );
}

function SectionRoute({ tool, session }: { tool: ToolId; session: SessionState | null }): ReactNode {
  if (!session) return <Loading />;
  if (session.status === 'guest' || session.status === 'free' || session.status === 'unknown') return <Navigate to="/" replace />;
  return (
    <DashboardLayout status={session.status}>
      <SectionPage tool={tool} status={session.status} />
    </DashboardLayout>
  );
}

export default function App(): ReactNode {
  const [session, setSession] = useState<SessionState | null>(null);
  const [swUpdate, setSwUpdate] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();

  const load = useCallback(async () => {
    const s = await fetchSession();
    setSession(s);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  useEffect(() => {
    loadGoogleAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const onSw = () => setSwUpdate(true);
    window.addEventListener('kluzar-sw-update', onSw);
    return () => window.removeEventListener('kluzar-sw-update', onSw);
  }, []);

  useEffect(() => {
    if (session && adsEligible(session.status)) {
      loadAdSense();
      pushAdSlot();
    }
  }, [session]);

  const handleSignOut = async () => {
    if (!session) return;
    setSigningOut(true);
    try {
      await logout(session.csrfToken);
    } catch {
    }
    const s = await fetchSession();
    setSession(s);
    setSigningOut(false);
  };

  const applySwUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
          reg.waiting.postMessage('kluzar-skip-waiting');
        }
      }).catch(() => {});
    }
  };

  const status = session ? session.status : 'loading';

  return (
    <div className="app-shell">
      <Header status={status} email={session ? session.email : ''} onSignOut={handleSignOut} signingOut={signingOut} />
      {swUpdate ? (
        <div className="update-banner">
          A new version is available. <button type="button" className="ghost-btn" onClick={applySwUpdate}>Update</button>
        </div>
      ) : null}
      <main className="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomeRoute session={session} onRetry={load} />} />
            {TOOL_ORDER.map((tool) => (
              <Route key={tool} path={'/' + tool} element={<SectionRoute tool={tool} session={session} />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
