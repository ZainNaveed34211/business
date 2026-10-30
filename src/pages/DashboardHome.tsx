import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Pill, planLabel } from '../components/components';
import { TOOL_DESCRIPTIONS, TOOL_ORDER, TOOL_TITLES, type SessionStatus } from '../lib/account';
import { dashboardUrl } from '../lib/url';

export default function DashboardHome({ status, email }: { status: SessionStatus; email: string }): ReactNode {
  return (
    <div className="page">
      <div className="card welcome">
        <h2>Welcome back</h2>
        <p>Signed in as {email} <Pill kind="premium">{planLabel(status)}</Pill></p>
        <p>Choose a section to open its workspace.</p>
      </div>
      <div className="section-grid">
        {TOOL_ORDER.map((tool) => (
          <Link key={tool} to={'/' + tool} className="tool-card tool-link">
            <h3>{TOOL_TITLES[tool]}</h3>
            <p>{TOOL_DESCRIPTIONS[tool]}</p>
            {tool === 'security' && status !== 'max' ? <span className="lock-badge">Max only</span> : <span className="coming-tag">Coming soon</span>}
          </Link>
        ))}
      </div>
      <div className="card">
        <h3>Your account</h3>
        <p>{email}</p>
        <p>Plan: {planLabel(status)}</p>
        <a className="ghost-btn" href={dashboardUrl()}>Open account dashboard</a>
      </div>
    </div>
  );
}
