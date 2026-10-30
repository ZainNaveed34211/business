import { format, startOfWeek, subWeeks } from 'date-fns';
import type { BusinessData, BusinessProfile } from './data';

export interface ProfileBreakdown { label: string; filled: boolean; }

export const PROFILE_FIELDS: { key: keyof BusinessProfile; label: string; weight: number }[] = [
  { key: 'businessName', label: 'Business name', weight: 2 },
  { key: 'industry', label: 'Industry', weight: 1 },
  { key: 'businessType', label: 'Business type', weight: 1 },
  { key: 'website', label: 'Website', weight: 2 },
  { key: 'category', label: 'Category', weight: 1 },
  { key: 'description', label: 'Description', weight: 2 },
  { key: 'address', label: 'Address', weight: 1 },
  { key: 'phone', label: 'Phone', weight: 1 },
  { key: 'hours', label: 'Opening hours', weight: 1 },
  { key: 'targetAudience', label: 'Target audience', weight: 1 },
  { key: 'locations', label: 'Target locations', weight: 1 },
  { key: 'services', label: 'Services', weight: 1 },
];

export function profileScore(profile: BusinessProfile | null): { score: number; breakdown: ProfileBreakdown[]; filled: number; total: number; missing: string[] } {
  const breakdown = PROFILE_FIELDS.map((f) => {
    const value = profile ? profile[f.key] : '';
    return { label: f.label, filled: typeof value === 'string' && value.trim().length > 0 };
  });
  const totalWeight = PROFILE_FIELDS.reduce((s, f) => s + f.weight, 0);
  const filledWeight = PROFILE_FIELDS.reduce((s, f, i) => s + (breakdown[i].filled ? f.weight : 0), 0);
  const filled = breakdown.filter((b) => b.filled).length;
  return { score: Math.round((filledWeight / totalWeight) * 100), breakdown, filled, total: PROFILE_FIELDS.length, missing: breakdown.filter((b) => !b.filled).map((b) => b.label) };
}

function dayNum(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? NaN : Math.floor(d.getTime() / 86400000);
}

export function consistencyScore(data: BusinessData, frequencyPerWeek: number | null): { score: number | null; published30: number; scheduled14: number; expected30: number | null } {
  const today = Math.floor(Date.now() / 86400000);
  const published30 = data.calendar.filter((c) => c.status === 'published' && !Number.isNaN(dayNum(c.date)) && today - dayNum(c.date) >= 0 && today - dayNum(c.date) <= 30).length;
  const scheduled14 = data.calendar.filter((c) => c.status === 'scheduled' && !Number.isNaN(dayNum(c.date)) && dayNum(c.date) - today >= 0 && dayNum(c.date) - today <= 14).length;
  const expected30 = frequencyPerWeek && frequencyPerWeek > 0 ? Math.round((frequencyPerWeek * 30) / 7) : null;
  const score = expected30 && expected30 > 0 ? Math.min(100, Math.round((published30 / expected30) * 100)) : null;
  return { score, published30, scheduled14, expected30 };
}

export function frequencyFromStrategies(data: BusinessData): number | null {
  const first = data.strategies.find((s) => s.frequency.trim().length > 0);
  if (!first) return null;
  const n = parseInt(first.frequency, 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

export function weeklyActivity(data: BusinessData): { week: string; published: number; scheduled: number }[] {
  const weeks: { week: string; published: number; scheduled: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const end = new Date(start.getTime() + 6 * 86400000);
    const inWeek = (d: string) => {
      const t = new Date(d + 'T00:00:00').getTime();
      return !Number.isNaN(t) && t >= start.getTime() && t <= end.getTime() + 86399999;
    };
    weeks.push({
      week: format(start, 'dd MMM'),
      published: data.calendar.filter((c) => c.status === 'published' && inWeek(c.date)).length,
      scheduled: data.calendar.filter((c) => c.status === 'scheduled' && inWeek(c.date)).length,
    });
  }
  return weeks;
}

export function overallScore(data: BusinessData, guidePct: number): { overall: number; parts: { label: string; score: number | null }[]; coverage: string } {
  const prof = profileScore(data.profile).score;
  const cons = consistencyScore(data, frequencyFromStrategies(data)).score;
  const parts = [
    { label: 'Business profile completeness', score: prof },
    { label: 'Publishing consistency', score: cons },
    { label: 'Guide progress', score: guidePct },
  ];
  const available = parts.filter((p) => p.score !== null) as { label: string; score: number }[];
  const overall = available.length > 0 ? Math.round(available.reduce((s, p) => s + p.score, 0) / available.length) : 0;
  const coverage = 'Based on ' + available.length + ' of 3 measurements from your own data. Search, business profile and social scores need connected accounts and are not included until you connect them.';
  return { overall, parts, coverage };
}
