import type { ReactNode } from 'react';
import { AdSlot } from '../components/components';
import { paymentsUrl } from '../lib/url';

export default function UpgradeScreen({ email }: { email: string }): ReactNode {
  return (
    <div className="page">
      <div className="card upgrade">
        <p className="eyebrow">Kluzar Business &amp; Reputation</p>
        <h2>This is a premium service</h2>
        <p>Signed in as {email}. Your current plan is Free, so the Business tools are locked. Upgrade to Growth or Max to open them.</p>
        <div className="plan-cards">
          <div className="plan-card">
            <h3>Growth</h3>
            <p className="plan-price">$10 <span>/ month</span></p>
            <p>Search visibility, business profile visibility, social visibility, social management, business guide, media strategy and shorts growth.</p>
            <a className="primary-btn" href={paymentsUrl()}>Get Premium</a>
          </div>
          <div className="plan-card featured">
            <h3>Max</h3>
            <p className="plan-price">$25 <span>/ month</span></p>
            <p>Everything in Growth, plus Advanced Security and deeper, more personalised strategy.</p>
            <a className="primary-btn" href={paymentsUrl()}>Get Premium</a>
          </div>
        </div>
        <p className="plans-note">After payment, you return right here.</p>
      </div>
      <AdSlot />
    </div>
  );
}
