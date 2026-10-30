import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from './components';
import type { SessionStatus } from '../lib/account';

export interface WorkspaceSection { id: string; label: string; links: { label: string; path: string }[]; }

export const WORKSPACES: WorkspaceSection[] = [
  { id: 'intelligence', label: 'Business Intelligence', links: [
    { label: 'Overview', path: '/intelligence' },
    { label: 'Google Search Visibility', path: '/intelligence/search' },
    { label: 'Google Business Profile', path: '/intelligence/gbp' },
    { label: 'Social Media Visibility', path: '/intelligence/social-visibility' },
    { label: 'Competitor Intelligence', path: '/intelligence/competitors' },
    { label: 'Reputation Analysis', path: '/intelligence/reputation' },
    { label: 'Reports & Analytics', path: '/intelligence/reports' },
  ] },
  { id: 'growth', label: 'Growth Workspace', links: [
    { label: 'Overview', path: '/growth' },
    { label: 'Social Media Management', path: '/growth/social-management' },
    { label: 'Content Studio', path: '/growth/content-studio' },
    { label: 'Content Calendar', path: '/growth/calendar' },
    { label: 'Personal Business Guide', path: '/growth/guide' },
    { label: 'Media Strategy Builder', path: '/growth/media' },
    { label: 'Shorts Growth Studio', path: '/growth/shorts' },
    { label: 'Campaign Management', path: '/growth/campaigns' },
  ] },
  { id: 'security', label: 'Advanced Security', links: [
    { label: 'Overview', path: '/security' },
    { label: 'Security Assessment', path: '/security/assessment' },
    { label: 'Security Findings', path: '/security/findings' },
    { label: 'Risk Prioritization', path: '/security/risks' },
    { label: 'Remediation Guidance', path: '/security/remediation' },
    { label: 'History & Reports', path: '/security/history' },
  ] },
];

function loadOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('kluzar-business-sidebar');
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
  }
  return { intelligence: true, growth: true, security: true };
}

export function WorkspaceLayout({ status, title, eyebrow, accent, children }: { status: SessionStatus; title: string; eyebrow: string; accent: string; children: ReactNode }): ReactNode {
  const [open, setOpen] = useState<Record<string, boolean>>(loadOpen);
  useEffect(() => {
    localStorage.setItem('kluzar-business-sidebar', JSON.stringify(open));
  }, [open]);
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand">
          <Logo dark />
        </Link>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">Unified Dashboard</NavLink>
          {WORKSPACES.map((ws) => (
            <div key={ws.id} className="sidebar-section">
              <button type="button" className="sidebar-section-btn" onClick={() => setOpen((o) => ({ ...o, [ws.id]: !o[ws.id] }))}>
                <span>{ws.label}</span>
                <span>{ws.id === 'security' && status !== 'max' ? <span className="lock-badge">Max only</span> : null} {open[ws.id] ? '▾' : '▸'}</span>
              </button>
              {open[ws.id] ? (
                <div className="sidebar-subnav">
                  {ws.links.map((l) => (
                    <NavLink key={l.path} to={l.path} end={l.path === '/intelligence' || l.path === '/growth' || l.path === '/security'} className="sidebar-link sidebar-sublink">{l.label}</NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>
      <div className="dashboard-main">
        <div className="page">
          <div className="workspace-head" data-accent={accent}>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ScoreCard({ label, score, detail }: { label: string; score: number | null; detail: string }): ReactNode {
  return (
    <div className="score-card">
      <span className="score-label">{label}</span>
      <strong className="score-value">{score === null ? 'No data yet' : score + ' / 100'}</strong>
      <div className="score-bar"><span style={{ width: (score === null ? 0 : score) + '%' }} /></div>
      <p>{detail}</p>
    </div>
  );
}

export function ConnectNote({ title, body }: { title: string; body: string }): ReactNode {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p><span className="pill pill-plain">Not connected</span></p>
      <p>{body}</p>
      <p>No figures are shown for this connection until it is connected. Nothing here is estimated or invented.</p>
    </div>
  );
}
