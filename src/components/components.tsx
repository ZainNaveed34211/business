import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LOGO_URL, LOGO_DARK_URL } from '../logoData';
import { TOOL_ORDER, TOOL_TITLES, type SessionStatus } from '../lib/account';
import { ADSENSE_CLIENT } from '../lib/analytics';
import { dashboardUrl, loginUrl, paymentsUrl, signupUrl } from '../lib/url';

export function Logo({ dark }: { dark?: boolean }): ReactNode {
  return <img src={dark ? LOGO_DARK_URL : LOGO_URL} alt="Kluzar" className="logo" />;
}

export function Pill({ kind, children }: { kind: 'premium' | 'plain'; children: ReactNode }): ReactNode {
  return <span className={'pill pill-' + kind}>{children}</span>;
}

export function Loading(): ReactNode {
  return (
    <div className="loading">
      <div className="spinner" />
      Checking your subscription…
    </div>
  );
}

export function ErrorBox({ message }: { message: string }): ReactNode {
  if (!message) return null;
  return <div className="error-box">{message}</div>;
}

export function EmptyState({ title, body }: { title: string; body: string }): ReactNode {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function AdSlot(): ReactNode {
  return (
    <div className="ad-slot">
      <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={ADSENSE_CLIENT} data-ad-slot="auto" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>
  );
}

export function ThemeToggle(): ReactNode {
  const [theme, setTheme] = useState(() => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'));
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kluzar-business-theme', next);
    setTheme(next);
  };
  return (
    <button type="button" className="ghost-btn" onClick={toggle}>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

export function planLabel(status: SessionStatus): string {
  if (status === 'growth') return 'Growth';
  if (status === 'max') return 'Max';
  if (status === 'free') return 'Free';
  return '';
}

export function Header({ status, email, onSignOut, signingOut }: { status: SessionStatus; email: string; onSignOut: () => void; signingOut: boolean }): ReactNode {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <Logo />
      </Link>
      <nav className="header-nav">
        <ThemeToggle />
        {status === 'loading' ? null : status === 'guest' || status === 'unknown' ? (
          <>
            <a className="ghost-btn" href={loginUrl()}>Log in</a>
            <a className="primary-btn" href={signupUrl()}>Sign up</a>
          </>
        ) : status === 'free' ? (
          <>
            <span className="account-email">{email}</span>
            <Pill kind="plain">Free</Pill>
            <a className="ghost-btn" href={paymentsUrl()}>Get Premium</a>
            <button type="button" className="ghost-btn" onClick={onSignOut} disabled={signingOut}>Sign out</button>
          </>
        ) : (
          <>
            <span className="account-email">{email}</span>
            <Pill kind="premium">{planLabel(status)}</Pill>
            <a className="ghost-btn" href={dashboardUrl()}>Account</a>
            <button type="button" className="ghost-btn" onClick={onSignOut} disabled={signingOut}>Sign out</button>
          </>
        )}
      </nav>
    </header>
  );
}

export function DashboardLayout({ status, children }: { status: SessionStatus; children: ReactNode }): ReactNode {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand">
          <Logo dark />
        </Link>
        <nav className="sidebar-nav">
          <Link to="/" className="sidebar-link">Dashboard</Link>
          {TOOL_ORDER.map((tool) => (
            <Link key={tool} to={'/' + tool} className="sidebar-link">
              {TOOL_TITLES[tool]}
              {tool === 'security' && status !== 'max' ? <span className="lock-badge">Max only</span> : null}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="dashboard-main">{children}</div>
    </div>
  );
}

export function Footer(): ReactNode {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Logo />
        <p>Business visibility and reputation, managed in one premium place.</p>
      </div>
      <div className="footer-links">
        <a href="https://kluzar.com/">Kluzar</a>
        <a href={loginUrl()}>Log in</a>
        <a href={paymentsUrl()}>Get Premium</a>
      </div>
      <div className="footer-meta">
        <span>© {year} Kluzar</span>
        <span>Serving Worldwide</span>
        <span>Contact: info@kluzar.com</span>
      </div>
    </footer>
  );
}
