import type { ReactNode } from 'react';
import { loginUrl } from '../lib/url';

export default function UnknownScreen({ onRetry }: { onRetry: () => void }): ReactNode {
  return (
    <div className="page">
      <div className="card">
        <h2>Could not verify your subscription</h2>
        <p>Your sign-in state could not be confirmed. This can happen when the connection is interrupted. Please try again, or log in again.</p>
        <button type="button" className="primary-btn" onClick={onRetry}>Try again</button>
        <span> </span>
        <a className="ghost-btn" href={loginUrl()}>Log in</a>
      </div>
    </div>
  );
}
