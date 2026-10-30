import type { ReactNode } from 'react';
import { paymentsUrl } from '../lib/url';

export function LockedPage(): ReactNode {
  return (
    <div className="page">
      <div className="card locked">
        <p className="eyebrow">Kluzar Business &amp; Reputation</p>
        <h2>Advanced Security is Max only</h2>
        <p>This workspace is included in the Max plan only. Your current plan does not include it. Upgrade to Max to open this workspace.</p>
        <a className="primary-btn" href={paymentsUrl()}>Upgrade to Max</a>
        <p className="plans-note">After payment, you return to Business and can open this section.</p>
      </div>
    </div>
  );
}
