import type { ReactNode } from 'react';
import { AdSlot } from '../components/components';
import { TOOL_DESCRIPTIONS, TOOL_ORDER, TOOL_TITLES } from '../lib/account';
import { loginUrl, signupUrl } from '../lib/url';

export default function GuestLanding(): ReactNode {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Kluzar Business &amp; Reputation</p>
          <h1>Your business, visible everywhere.</h1>
          <p className="hero-sub">Search visibility, business profile strength, social presence and reputation, managed in one premium place, with clear weekly guidance.</p>
          <div className="hero-actions">
            <a className="primary-btn" href={loginUrl()}>Log in</a>
            <a className="ghost-btn" href={signupUrl()}>Sign up</a>
          </div>
          <p className="hero-note">After you log in or sign up, you return right here.</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="float-card float-a"><strong>Search</strong><span>Visibility</span></div>
          <div className="float-card float-b"><strong>Profile</strong><span>Reputation</span></div>
          <div className="float-card float-c"><strong>Social</strong><span>Growth</span></div>
        </div>
      </section>
      <section className="section-block">
        <h2>What Business &amp; Reputation covers</h2>
        <div className="section-grid">
          {TOOL_ORDER.map((tool) => (
            <div key={tool} className="tool-card">
              <h3>{TOOL_TITLES[tool]}</h3>
              <p>{TOOL_DESCRIPTIONS[tool]}</p>
              <span className="premium-tag">Premium</span>
            </div>
          ))}
        </div>
      </section>
      <section className="section-block">
        <h2>Premium plans</h2>
        <div className="plan-cards">
          <div className="plan-card">
            <h3>Growth</h3>
            <p className="plan-price">$10 <span>/ month</span></p>
            <p>All Business sections except Advanced Security.</p>
            <a className="ghost-btn" href={loginUrl()}>Log in to upgrade</a>
          </div>
          <div className="plan-card featured">
            <h3>Max</h3>
            <p className="plan-price">$25 <span>/ month</span></p>
            <p>Everything in Growth, plus Advanced Security and deeper, more personalised strategy.</p>
            <a className="primary-btn" href={loginUrl()}>Log in to upgrade</a>
          </div>
        </div>
        <p className="plans-note">Prices per user per month. Payments and plan changes live on the payments page.</p>
      </section>
      <AdSlot />
    </div>
  );
}
