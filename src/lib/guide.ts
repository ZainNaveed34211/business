import type { BusinessData } from './data';
import { consistencyScore, frequencyFromStrategies, profileScore } from './scores';

export interface Recommendation { id: string; title: string; priority: string; reason: string; evidence: string; steps: string[]; effort: string; route: string; }

function dayNum(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? NaN : Math.floor(d.getTime() / 86400000);
}

export function buildRecommendations(data: BusinessData, status: string): Recommendation[] {
  const recs: Recommendation[] = [];
  const prof = profileScore(data.profile);
  const cons = consistencyScore(data, frequencyFromStrategies(data));
  const today = Math.floor(Date.now() / 86400000);
  const unanswered = data.reviews.filter((r) => !r.replied);
  const scheduled7 = data.calendar.filter((c) => c.status === 'scheduled' && !Number.isNaN(dayNum(c.date)) && dayNum(c.date) - today >= 0 && dayNum(c.date) - today <= 7).length;

  if (prof.missing.length > 0) {
    recs.push({ id: 'profile', title: 'Complete your business profile', priority: 'High', reason: 'An incomplete profile weakens every visibility score.', evidence: prof.filled + ' of ' + prof.total + ' profile fields filled. Missing: ' + prof.missing.join(', ') + '.', steps: ['Open the Business Guide.', 'Fill the missing fields in the Business Profile form.', 'Save and re-check your profile score.'], effort: 'About 15 minutes', route: '/growth/guide' });
  }
  if (!data.profile || data.profile.website.trim().length === 0) {
    recs.push({ id: 'website', title: 'Add your website address', priority: 'High', reason: 'Search and profile checks need a website to reference.', evidence: 'No website address is saved in your business profile.', steps: ['Add the website address in the Business Profile form.', 'Save the profile.'], effort: 'About 2 minutes', route: '/growth/guide' });
  }
  if (data.keywords.length === 0) {
    recs.push({ id: 'keywords', title: 'Add keywords to track search visibility', priority: 'High', reason: 'Without keywords there is nothing to compare over time.', evidence: '0 keywords saved.', steps: ['Open Google Search Visibility.', 'Add your brand name and main service keywords.', 'Group them and add target locations.'], effort: 'About 20 minutes', route: '/intelligence/search' });
  }
  if (data.competitors.length === 0) {
    recs.push({ id: 'competitors', title: 'Add competitors to compare', priority: 'Medium', reason: 'Comparison needs at least one competitor profile entered from public pages.', evidence: '0 competitors saved.', steps: ['Open Competitor Intelligence.', 'Add a competitor name, category and public review figures.', 'Compare profile completeness side by side.'], effort: 'About 15 minutes', route: '/intelligence/competitors' });
  }
  if (unanswered.length > 0) {
    recs.push({ id: 'reviews', title: 'Reply to unanswered reviews', priority: 'High', reason: 'Unanswered reviews lower the review response rate.', evidence: unanswered.length + ' unanswered reviews in your review log.', steps: ['Open Reputation Analysis.', 'Draft a reply for each unanswered review.', 'Mark each review as replied after you publish the reply.'], effort: 'About 5 minutes per review', route: '/intelligence/reputation' });
  }
  if (scheduled7 === 0) {
    recs.push({ id: 'calendar7', title: 'Schedule content for the next 7 days', priority: 'High', reason: 'An empty week ahead means no publishing pipeline.', evidence: '0 scheduled items in the next 7 days.', steps: ['Open the Content Calendar.', 'Create items for the coming week.', 'Set each item to Scheduled with a date and platform.'], effort: 'About 30 minutes', route: '/growth/calendar' });
  }
  if (cons.published30 === 0) {
    recs.push({ id: 'published', title: 'Publish content consistently', priority: 'Medium', reason: 'No published items in the last 30 days breaks consistency.', evidence: '0 published items in the last 30 days.', steps: ['Open the Content Calendar.', 'Move ready drafts to Published as you post them.', 'Set a weekly frequency in Media Strategy.'], effort: 'Ongoing', route: '/growth/calendar' });
  }
  if (data.strategies.length === 0) {
    recs.push({ id: 'strategy', title: 'Create a media strategy', priority: 'Medium', reason: 'A strategy defines platforms, pillars and weekly frequency.', evidence: '0 media strategies saved.', steps: ['Open Media Strategy Builder.', 'Set objectives, audience, platforms and pillars.', 'Set a weekly publishing frequency.'], effort: 'About 30 minutes', route: '/growth/media' });
  }
  if (data.campaigns.length === 0) {
    recs.push({ id: 'campaign', title: 'Create a campaign', priority: 'Medium', reason: 'Campaigns group content so planned and actual results can be compared.', evidence: '0 campaigns saved.', steps: ['Open Campaign Management.', 'Create a campaign with dates and platforms.', 'Assign calendar items to the campaign name.'], effort: 'About 15 minutes', route: '/growth/campaigns' });
  }
  if (data.shorts.length === 0) {
    recs.push({ id: 'shorts', title: 'Plan short videos', priority: 'Medium', reason: 'Shorts need their own idea list and schedule.', evidence: '0 short video ideas saved.', steps: ['Open Shorts Growth Studio.', 'Add video ideas with topics and hashtags.', 'Schedule the strongest ideas.'], effort: 'About 20 minutes', route: '/growth/shorts' });
  }
  if (status === 'max' && data.securityRuns.length === 0) {
    recs.push({ id: 'security', title: 'Run a security checklist', priority: 'High', reason: 'No security assessment has been recorded yet.', evidence: '0 security checklist runs saved.', steps: ['Open Advanced Security Assessment.', 'Answer each checklist question honestly.', 'Work through the findings by severity.'], effort: 'About 20 minutes', route: '/security/assessment' });
  }
  return recs;
}

const POSITIVE = ['great', 'excellent', 'helpful', 'friendly', 'fast', 'professional', 'amazing', 'love', 'best', 'recommend', 'perfect', 'happy'];
const NEGATIVE = ['slow', 'rude', 'poor', 'bad', 'expensive', 'dirty', 'late', 'disappointed', 'terrible', 'worst', 'awful', 'unhappy'];

export function reviewThemes(texts: string[]): { positive: { word: string; count: number }[]; negative: { word: string; count: number }[] } {
  const countWords = (words: string[]) => {
    const map = new Map<string, number>();
    for (const text of texts) {
      const lower = text.toLowerCase();
      for (const w of words) {
        const hits = lower.split(w).length - 1;
        if (hits > 0) map.set(w, (map.get(w) || 0) + hits);
      }
    }
    return Array.from(map.entries()).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  };
  return { positive: countWords(POSITIVE), negative: countWords(NEGATIVE) };
}
