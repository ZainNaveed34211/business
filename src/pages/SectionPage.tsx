import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TOOL_DESCRIPTIONS, TOOL_TITLES, toolAllowed, type SessionStatus, type ToolId } from '../lib/account';
import { paymentsUrl } from '../lib/url';

export default function SectionPage({ tool, status }: { tool: ToolId; status: SessionStatus }): ReactNode {
  if (!toolAllowed(status, tool)) {
    return (
      <div className="page">
        <div className="card locked">
          <p className="eyebrow">Kluzar Business &amp; Reputation</p>
          <h2>{TOOL_TITLES[tool]}</h2>
          <p>This section is included in the Max plan only.</p>
          <p>Your current plan does not include it. Upgrade to Max to open this section.</p>
          <a className="primary-btn" href={paymentsUrl()}>Get Premium</a>
          <p className="plans-note">After payment, you return right here.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="card">
        <p className="eyebrow">Kluzar Business &amp; Reputation</p>
        <h2>{TOOL_TITLES[tool]}</h2>
        <p>{TOOL_DESCRIPTIONS[tool]}</p>
        <div className="placeholder-box">
          <strong>Coming soon</strong>
          <p>This workspace opens here. Your data and tools for this section will appear here when the section launches.</p>
        </div>
        <Link to="/" className="ghost-btn">Back to dashboard</Link>
      </div>
    </div>
  );
}
