export type SessionStatus = 'loading' | 'guest' | 'free' | 'growth' | 'max' | 'unknown';

export interface SessionState {
  status: SessionStatus;
  email: string;
  csrfToken: string;
}

export type ToolId = 'search' | 'gbp' | 'social-visibility' | 'social-management' | 'guide' | 'media' | 'shorts' | 'security';

export interface EntitlementShape {
  plan?: unknown;
  status?: unknown;
  premium?: unknown;
}

export function planFromEntitlement(ent: EntitlementShape | null | undefined): 'free' | 'growth' | 'max' {
  if (!ent) return 'free';
  const premium = ent.premium === true;
  const plan = typeof ent.plan === 'string' ? ent.plan : '';
  const active = ent.status === 'active';
  if (premium && active && plan === 'growth') return 'growth';
  if (premium && active && plan === 'max') return 'max';
  return 'free';
}

export function toolAllowed(status: SessionStatus, tool: ToolId): boolean {
  if (status === 'max') return true;
  if (status === 'growth') return tool !== 'security';
  return false;
}

export const TOOL_ORDER: ToolId[] = ['search', 'gbp', 'social-visibility', 'social-management', 'guide', 'media', 'shorts', 'security'];

export const TOOL_TITLES: Record<ToolId, string> = {
  search: 'Google Search Visibility',
  gbp: 'Google Business Profile Visibility',
  'social-visibility': 'Social Media Visibility',
  'social-management': 'Social Media Management',
  guide: 'Personal Business Guide',
  media: 'Media Strategy',
  shorts: 'Shorts Growth',
  security: 'Advanced Security',
};

export const TOOL_DESCRIPTIONS: Record<ToolId, string> = {
  search: 'Business and brand search presence, keyword visibility, search-result analysis and website comparison, with rule-based recommendations.',
  gbp: 'Profile completeness, business information consistency, local visibility, reviews, photos and activity checks, with local competitor comparison.',
  'social-visibility': 'Profile completeness and optimisation checks, engagement and growth trends, content performance and platform-wise reports from authorised data only.',
  'social-management': 'Multi-platform content planning, interactive calendar, drafts and templates, campaigns and publishing where official APIs support it.',
  guide: 'Rule-based guidance from your actual business data: weekly action plans, visibility tasks and prioritised recommendations with reasons.',
  media: 'Platform-specific media strategy, format planning, campaigns, schedule recommendations and progress tracking.',
  shorts: 'Shorts performance, topic and format tracking, publishing schedule and growth recommendations from authorised data.',
  security: 'Advanced Security for Max only: deeper security configuration, header and TLS indicators, exposed-file checks and prioritised remediation.',
};

const SESSION_BASE_URL = 'https://account-api.kluzar.com/auth';

export async function fetchSession(): Promise<SessionState> {
  try {
    const res = await fetch(SESSION_BASE_URL + '/session', { credentials: 'include' });
    if (res.status === 401) return { status: 'guest', email: '', csrfToken: '' };
    if (!res.ok) return { status: 'unknown', email: '', csrfToken: '' };
    const data = await res.json();
    if (!data || data.authenticated !== true) return { status: 'guest', email: '', csrfToken: '' };
    const user = data.user || {};
    const email = typeof user.email === 'string' ? user.email : '';
    const csrfToken = typeof data.csrfToken === 'string' ? data.csrfToken : '';
    return { status: planFromEntitlement(data.entitlement), email, csrfToken };
  } catch {
    return { status: 'unknown', email: '', csrfToken: '' };
  }
}

export async function logout(csrfToken: string): Promise<boolean> {
  try {
    const res = await fetch(SESSION_BASE_URL + '/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    });
    return res.ok;
  } catch {
    return false;
  }
}
