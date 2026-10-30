export interface BusinessProfile {
  id: string;
  businessName: string;
  industry: string;
  businessType: string;
  website: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
  targetAudience: string;
  locations: string;
  objectives: string[];
  platforms: string[];
  priorities: string;
  services: string;
  photosCount: string;
}

export interface KeywordItem { id: string; keyword: string; group: string; location: string; landingPage: string; createdAt: string; }
export interface CompetitorItem { id: string; name: string; category: string; rating: string; reviewCount: string; website: string; notes: string; }
export interface ReviewItem { id: string; platform: string; author: string; rating: number; text: string; date: string; replied: boolean; replyDraft: string; }
export interface CalendarItem { id: string; title: string; platform: string; type: string; status: string; date: string; campaign: string; notes: string; }
export interface ContentItem { id: string; title: string; caption: string; hashtags: string; platform: string; type: string; template: boolean; campaign: string; createdAt: string; }
export interface CampaignItem { id: string; name: string; objective: string; startDate: string; endDate: string; platforms: string[]; }
export interface StrategyItem { id: string; name: string; objective: string; audience: string; platforms: string[]; pillars: string; frequency: string; duration: string; notes: string; }
export interface ShortItem { id: string; title: string; topic: string; status: string; date: string; hashtags: string; notes: string; }
export interface GoalItem { id: string; title: string; metric: string; target: string; deadline: string; done: boolean; }
export interface GuideDone { id: string; recId: string; completedAt: string; }
export interface SecurityRun { id: string; date: string; answers: Record<string, string>; score: number; }
export interface ScorePoint { id: string; date: string; overall: number; profile: number; consistency: number | null; guide: number; }

export interface BusinessData {
  profile: BusinessProfile | null;
  keywords: KeywordItem[];
  competitors: CompetitorItem[];
  reviews: ReviewItem[];
  calendar: CalendarItem[];
  contents: ContentItem[];
  campaigns: CampaignItem[];
  strategies: StrategyItem[];
  shorts: ShortItem[];
  goals: GoalItem[];
  guideDone: GuideDone[];
  securityRuns: SecurityRun[];
  scoreHistory: ScorePoint[];
}

export const PLATFORMS = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn'];
export const CONTENT_TYPES = ['Post', 'Short video', 'Video', 'Image', 'Text'];
export const OBJECTIVES = ['Improve Google visibility', 'Increase social engagement', 'Improve business profile completeness', 'Increase publishing consistency', 'Improve customer review response rate'];

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyProfile(): BusinessProfile {
  return { id: 'profile', businessName: '', industry: '', businessType: '', website: '', category: '', description: '', address: '', phone: '', hours: '', targetAudience: '', locations: '', objectives: [], platforms: [], priorities: '', services: '', photosCount: '' };
}

export function emptyData(): BusinessData {
  return { profile: null, keywords: [], competitors: [], reviews: [], calendar: [], contents: [], campaigns: [], strategies: [], shorts: [], goals: [], guideDone: [], securityRuns: [], scoreHistory: [] };
}

export interface SecurityCheck { id: string; question: string; severity: string; remediation: string; }

export const SECURITY_CHECKS: SecurityCheck[] = [
  { id: 'https', question: 'Does the website load over HTTPS with a valid certificate?', severity: 'High', remediation: 'Enable HTTPS with a valid certificate and redirect HTTP traffic to HTTPS.' },
  { id: 'headers', question: 'Are security headers present (nosniff, frame protection, content policy)?', severity: 'Medium', remediation: 'Add nosniff, frame-ancestors and a content security policy at the hosting or Cloudflare layer.' },
  { id: 'exposed', question: 'Are admin, backup and environment files blocked from public access?', severity: 'High', remediation: 'Block public access to admin panels, backups, environment files and version-control paths.' },
  { id: 'updates', question: 'Is the website platform and its plugins kept up to date?', severity: 'High', remediation: 'Update the platform and plugins, and remove unused extensions.' },
  { id: 'forms', question: 'Do contact and login forms use spam and abuse protection?', severity: 'Medium', remediation: 'Add captcha or rate limiting to public forms and login pages.' },
  { id: 'privacy', question: 'Does the website publish a privacy policy and contact information?', severity: 'Low', remediation: 'Publish a privacy policy and a working contact page.' },
  { id: 'backups', question: 'Are regular backups taken and tested?', severity: 'Medium', remediation: 'Schedule regular backups and test a restore at least once.' },
  { id: 'accounts', question: 'Do admin accounts use strong passwords and two-factor sign-in?', severity: 'High', remediation: 'Enforce strong passwords and two-factor sign-in for every admin account.' },
];

export function securityFindings(answers: Record<string, string>): SecurityCheck[] {
  return SECURITY_CHECKS.filter((c) => answers[c.id] === 'no');
}

export function securityScore(answers: Record<string, string>): number | null {
  const answered = SECURITY_CHECKS.filter((c) => answers[c.id] === 'yes' || answers[c.id] === 'no');
  if (answered.length === 0) return null;
  const yes = answered.filter((c) => answers[c.id] === 'yes').length;
  return Math.round((yes / answered.length) * 100);
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
}

export function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
