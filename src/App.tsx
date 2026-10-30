import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Footer, Header, Loading } from './components/components';
import { WorkspaceLayout } from './components/workspace';
import { fetchSession, logout, toolAllowed, type SessionState, type SessionStatus } from './lib/account';
import { adsEligible, loadAdSense, loadGoogleAnalytics, pushAdSlot, trackPageView } from './lib/analytics';
import { OverviewPage } from './pages/Overview';
import { LockedPage } from './pages/Locked';
import { CompetitorsPage, GbpPage, IntelligenceOverview, ReportsPage, ReputationPage, SearchPage, SocialVisibilityPage } from './pages/Intelligence';
import { CalendarPage, CampaignsPage, GrowthOverview, GuidePage, MediaPage, ShortsPage, SocialManagementPage, StudioPage } from './pages/Growth';
import { AssessmentPage, FindingsPage, HistoryPage, RemediationPage, RisksPage, SecurityOverview } from './pages/Security';

const GuestLanding = lazy(() => import('./pages/GuestLanding'));
const UpgradeScreen = lazy(() => import('./pages/UpgradeScreen'));
const UnknownScreen = lazy(() => import('./pages/UnknownScreen'));

function HomeRoute({ session, onRetry }: { session: SessionState | null; onRetry: () => void }): ReactNode {
  if (!session) return <Loading />;
  if (session.status === 'guest') return <GuestLanding />;
  if (session.status === 'free') return <UpgradeScreen email={session.email} />;
  if (session.status === 'unknown') return <UnknownScreen onRetry={onRetry} />;
  return <OverviewPage status={session.status} email={session.email} />;
}

function PremiumRoute({ session, maxOnly, title, eyebrow, accent, children }: { session: SessionState | null; maxOnly: boolean; title: string; eyebrow: string; accent: string; children: ReactNode }): ReactNode {
  if (!session) return <Loading />;
  if (session.status === 'guest' || session.status === 'free' || session.status === 'unknown') return <Navigate to="/" replace />;
  if (maxOnly && !toolAllowed(session.status, 'security')) {
    return <WorkspaceLayout status={session.status} title={title} eyebrow={eyebrow} accent={accent}><LockedPage /></WorkspaceLayout>;
  }
  return <WorkspaceLayout status={session.status} title={title} eyebrow={eyebrow} accent={accent}>{children}</WorkspaceLayout>;
}

function ws(session: SessionState | null, maxOnly: boolean, title: string, eyebrow: string, accent: string, el: ReactNode): ReactNode {
  return <PremiumRoute session={session} maxOnly={maxOnly} title={title} eyebrow={eyebrow} accent={accent}>{el}</PremiumRoute>;
}

export default function App(): ReactNode {
  const [session, setSession] = useState<SessionState | null>(null);
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

  const status: SessionStatus = session ? session.status : 'loading';

  return (
    <div className="app-shell">
      <Header status={status} email={session ? session.email : ''} onSignOut={handleSignOut} signingOut={signingOut} />
      <main className="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomeRoute session={session} onRetry={load} />} />
            <Route path="/intelligence" element={ws(session, false, 'Business Intelligence', 'Workspace 1 · Business Intelligence', 'intelligence', <IntelligenceOverview status={status} />)} />
            <Route path="/intelligence/search" element={ws(session, false, 'Google Search Visibility', 'Business Intelligence', 'intelligence', <SearchPage status={status} />)} />
            <Route path="/intelligence/gbp" element={ws(session, false, 'Google Business Profile', 'Business Intelligence', 'intelligence', <GbpPage status={status} />)} />
            <Route path="/intelligence/social-visibility" element={ws(session, false, 'Social Media Visibility', 'Business Intelligence', 'intelligence', <SocialVisibilityPage status={status} />)} />
            <Route path="/intelligence/competitors" element={ws(session, false, 'Competitor Intelligence', 'Business Intelligence', 'intelligence', <CompetitorsPage status={status} />)} />
            <Route path="/intelligence/reputation" element={ws(session, false, 'Reputation Analysis', 'Business Intelligence', 'intelligence', <ReputationPage status={status} />)} />
            <Route path="/intelligence/reports" element={ws(session, false, 'Reports & Analytics', 'Business Intelligence', 'intelligence', <ReportsPage status={status} />)} />
            <Route path="/growth" element={ws(session, false, 'Growth Workspace', 'Workspace 2 · Growth Workspace', 'growth', <GrowthOverview status={status} />)} />
            <Route path="/growth/social-management" element={ws(session, false, 'Social Media Management', 'Growth Workspace', 'growth', <SocialManagementPage status={status} />)} />
            <Route path="/growth/content-studio" element={ws(session, false, 'Content Studio', 'Growth Workspace', 'growth', <StudioPage status={status} />)} />
            <Route path="/growth/calendar" element={ws(session, false, 'Content Calendar', 'Growth Workspace', 'growth', <CalendarPage status={status} />)} />
            <Route path="/growth/guide" element={ws(session, false, 'Personal Business Guide', 'Growth Workspace', 'growth', <GuidePage status={status} />)} />
            <Route path="/growth/media" element={ws(session, false, 'Media Strategy Builder', 'Growth Workspace', 'growth', <MediaPage status={status} />)} />
            <Route path="/growth/shorts" element={ws(session, false, 'Shorts Growth Studio', 'Growth Workspace', 'growth', <ShortsPage status={status} />)} />
            <Route path="/growth/campaigns" element={ws(session, false, 'Campaign Management', 'Growth Workspace', 'growth', <CampaignsPage status={status} />)} />
            <Route path="/security" element={ws(session, true, 'Advanced Security', 'Workspace 3 · Advanced Security · Max only', 'security', <SecurityOverview status={status} />)} />
            <Route path="/security/assessment" element={ws(session, true, 'Security Assessment', 'Advanced Security · Max only', 'security', <AssessmentPage status={status} />)} />
            <Route path="/security/findings" element={ws(session, true, 'Security Findings', 'Advanced Security · Max only', 'security', <FindingsPage status={status} />)} />
            <Route path="/security/risks" element={ws(session, true, 'Risk Prioritization', 'Advanced Security · Max only', 'security', <RisksPage status={status} />)} />
            <Route path="/security/remediation" element={ws(session, true, 'Remediation Guidance', 'Advanced Security · Max only', 'security', <RemediationPage status={status} />)} />
            <Route path="/security/history" element={ws(session, true, 'History & Reports', 'Advanced Security · Max only', 'security', <HistoryPage status={status} />)} />
            <Route path="/search" element={<Navigate to="/intelligence/search" replace />} />
            <Route path="/gbp" element={<Navigate to="/intelligence/gbp" replace />} />
            <Route path="/social-visibility" element={<Navigate to="/intelligence/social-visibility" replace />} />
            <Route path="/social-management" element={<Navigate to="/growth/social-management" replace />} />
            <Route path="/guide" element={<Navigate to="/growth/guide" replace />} />
            <Route path="/media" element={<Navigate to="/growth/media" replace />} />
            <Route path="/shorts" element={<Navigate to="/growth/shorts" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer status={status} />
    </div>
  );
}
