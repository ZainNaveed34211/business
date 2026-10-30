import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Loading } from '../components/components';
import { ConnectNote, ScoreCard, WorkspaceLayout } from '../components/workspace';
import { downloadText, emptyProfile, toCsv, uid, type BusinessProfile } from '../lib/data';
import { reviewThemes } from '../lib/guide';
import { overallScore, profileScore } from '../lib/scores';
import { useBusinessData } from '../lib/useData';
import type { SessionStatus } from '../lib/account';

function Page({ status, title, eyebrow, accent, children }: { status: SessionStatus; title: string; eyebrow: string; accent: string; children: ReactNode }): ReactNode {
  return <WorkspaceLayout status={status} title={title} eyebrow={eyebrow} accent={accent}>{children}</WorkspaceLayout>;
}

function Field({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function inputClass(): string {
  return 'field-input';
}

export function IntelligenceOverview({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const prof = profileScore(data.profile);
  const overall = overallScore(data, 0);
  return (
    <Page status={status} title="Business Intelligence" eyebrow="Workspace 1 · Business Intelligence" accent="intelligence">
      <div className="score-grid">
        <ScoreCard label="Overall Business Visibility Score" score={overall.overall} detail={overall.coverage} />
        <ScoreCard label="Business profile completeness" score={prof.score} detail={prof.filled + ' of ' + prof.total + ' profile fields filled.'} />
        <ScoreCard label="Keywords tracked" score={null} detail={data.keywords.length + ' keywords saved. Search performance needs a Search Console connection.'} />
        <ScoreCard label="Reviews logged" score={null} detail={data.reviews.length + ' reviews in your log. Averages below are calculated from logged reviews only.'} />
      </div>
      <div className="section-grid">
        <Link to="/intelligence/search" className="tool-card tool-link"><h3>Google Search Visibility</h3><p>Keyword tracking, groups, locations and rule-based opportunities.</p></Link>
        <Link to="/intelligence/gbp" className="tool-card tool-link"><h3>Google Business Profile</h3><p>Profile health from your own entered business information.</p></Link>
        <Link to="/intelligence/social-visibility" className="tool-card tool-link"><h3>Social Media Visibility</h3><p>Per-platform completeness from your profile and calendar data.</p></Link>
        <Link to="/intelligence/competitors" className="tool-card tool-link"><h3>Competitor Intelligence</h3><p>Public competitor information you enter, compared side by side.</p></Link>
        <Link to="/intelligence/reputation" className="tool-card tool-link"><h3>Reputation Analysis</h3><p>Review log, ratings, themes and reply workflow.</p></Link>
        <Link to="/intelligence/reports" className="tool-card tool-link"><h3>Reports &amp; Analytics</h3><p>Exportable CSV reports from your real saved data.</p></Link>
      </div>
      <ConnectNote title="Search Console and Business Profile connections" body="A Google Cloud OAuth client with Search Console and Business Profile scopes is required for clicks, impressions, position, profile views and review retrieval. No Google figures are shown until that connection is configured." />
    </Page>
  );
}

function intentOf(keyword: string, businessName: string): string {
  const k = keyword.toLowerCase();
  if (businessName && k.includes(businessName.toLowerCase())) return 'Branded';
  if (k.includes('buy') || k.includes('price') || k.includes('near me') || k.includes('service')) return 'Commercial';
  if (k.includes('how') || k.includes('what') || k.includes('why') || k.includes('guide')) return 'Informational';
  return 'General';
}

export function SearchPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [keyword, setKeyword] = useState('');
  const [group, setGroup] = useState('');
  const [location, setLocation] = useState('');
  const [landingPage, setLandingPage] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  if (!loaded) return <Loading />;
  const groups = ['All', ...Array.from(new Set(data.keywords.map((k) => k.group).filter((g) => g.length > 0)))];
  const shown = groupFilter === 'All' ? data.keywords : data.keywords.filter((k) => k.group === groupFilter);
  const missingPages = data.keywords.filter((k) => k.landingPage.trim().length === 0);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (keyword.trim().length === 0) return;
    await save('keywords', { id: uid(), keyword: keyword.trim(), group: group.trim(), location: location.trim(), landingPage: landingPage.trim(), createdAt: new Date().toISOString() });
    setKeyword(''); setGroup(''); setLocation(''); setLandingPage('');
  };
  return (
    <Page status={status} title="Google Search Visibility" eyebrow="Business Intelligence" accent="intelligence">
      <div className="card">
        <h3>Add a keyword</h3>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Keyword"><input className={inputClass()} value={keyword} onChange={(e) => setKeyword(e.target.value)} required /></Field>
          <Field label="Group"><input className={inputClass()} value={group} onChange={(e) => setGroup(e.target.value)} /></Field>
          <Field label="Target location"><input className={inputClass()} value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
          <Field label="Landing page"><input className={inputClass()} value={landingPage} onChange={(e) => setLandingPage(e.target.value)} placeholder="https://example.com/page" /></Field>
          <button type="submit" className="primary-btn">Add keyword</button>
        </form>
      </div>
      <div className="filter-row">
        <label className="field"><span>Group filter</span>
          <select className={inputClass()} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>{groups.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
      </div>
      {shown.length === 0 ? <EmptyState title="No keywords yet" body="Add your brand name and main service keywords above. Performance data appears only after a Search Console connection." /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Keyword</th><th>Group</th><th>Location</th><th>Intent rule</th><th>Landing page</th><th></th></tr></thead><tbody>
          {shown.map((k) => <tr key={k.id}><td>{k.keyword}</td><td>{k.group || '—'}</td><td>{k.location || '—'}</td><td>{intentOf(k.keyword, data.profile?.businessName || '')}</td><td>{k.landingPage || 'Missing'}</td><td><button type="button" className="ghost-btn" onClick={() => void remove('keywords', k.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      )}
      <div className="card">
        <h3>Search opportunities from your data</h3>
        {missingPages.length === 0 ? <p>Every saved keyword has a landing page recorded.</p> : missingPages.map((k) => <p key={k.id}>Keyword “{k.keyword}” has no landing page recorded. Add one so this keyword can be compared against a real page.</p>)}
      </div>
      <ConnectNote title="Search Console data" body="Clicks, impressions, CTR, average position, queries, pages, countries and devices come from the official Search Console API after authorization. None of those figures are shown here yet because no connection is configured." />
    </Page>
  );
}

export function GbpPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save } = useBusinessData();
  const [form, setForm] = useState<BusinessProfile>(emptyProfile());
  const [formLoaded, setFormLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (loaded && !formLoaded) {
      if (data.profile) setForm(data.profile);
      setFormLoaded(true);
    }
  }, [loaded, formLoaded, data.profile]);
  if (!loaded) return <Loading />;
  const setField = (key: keyof BusinessProfile, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    await save('profile', { ...form, id: 'profile' });
    setSaved(true);
  };
  const prof = profileScore(data.profile);
  return (
    <Page status={status} title="Google Business Profile" eyebrow="Business Intelligence" accent="intelligence">
      <div className="score-grid">
        <ScoreCard label="Profile completeness" score={prof.score} detail={prof.filled + ' of ' + prof.total + ' business information fields filled.'} />
      </div>
      <div className="card">
        <h3>Edit business information</h3>
        <p>Fill this in here and the checklist below updates at once. This is your own business information, not data fetched from Google.</p>
        <form className="form-grid" onSubmit={(e) => void saveProfile(e)}>
          <Field label="Business name"><input className={inputClass()} value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} /></Field>
          <Field label="Website"><input className={inputClass()} value={form.website} onChange={(e) => setField('website', e.target.value)} /></Field>
          <Field label="Description"><textarea className={inputClass()} value={form.description} onChange={(e) => setField('description', e.target.value)} /></Field>
          <Field label="Hours"><input className={inputClass()} value={form.hours} onChange={(e) => setField('hours', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass()} value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></Field>
          <Field label="Address"><input className={inputClass()} value={form.address} onChange={(e) => setField('address', e.target.value)} /></Field>
          <Field label="Photos count"><input className={inputClass()} value={form.photosCount} onChange={(e) => setField('photosCount', e.target.value)} /></Field>
          <button type="submit" className="primary-btn">Save business information</button>
        </form>
        {saved ? <p>Profile saved.</p> : null}
      </div>
      <div className="card">
        <h3>Profile health checklist</h3>
        <p>Each row uses the business information you entered in the Business Guide. Values marked Missing are not sent anywhere and are not claimed as Google data.</p>
        <div className="table-wrap"><table className="table"><thead><tr><th>Field</th><th>Value</th><th>Status</th></tr></thead><tbody>
          {prof.breakdown.map((b) => <tr key={b.label}><td>{b.label}</td><td>{b.filled ? 'Entered' : 'Not entered'}</td><td><span className={b.filled ? 'badge badge-yes' : 'badge badge-no'}>{b.filled ? 'Filled' : 'Missing'}</span></td></tr>)}
          <tr><td>Photos count</td><td>{data.profile?.photosCount || 'Not entered'}</td><td><span className={data.profile?.photosCount ? 'badge badge-yes' : 'badge badge-no'}>{data.profile?.photosCount ? 'Filled' : 'Missing'}</span></td></tr>
        </tbody></table></div>
        <Link to="/growth/guide" className="ghost-btn">Complete the profile in the Business Guide</Link>
      </div>
      <ConnectNote title="Local visibility and reviews from Google" body="Profile views, search appearances, calls, direction requests and review retrieval need a Google Business Profile API connection with an authorized location. Those figures are not shown until the connection is configured. Reviews you log manually appear in Reputation Analysis." />
    </Page>
  );
}

export function SocialVisibilityPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [figPlatform, setFigPlatform] = useState('Facebook');
  const [figDate, setFigDate] = useState('');
  const [followers, setFollowers] = useState('');
  const [reach, setReach] = useState('');
  const [impressions, setImpressions] = useState('');
  const [engagement, setEngagement] = useState('');
  if (!loaded) return <Loading />;
  const submitFigure = async (e: FormEvent) => {
    e.preventDefault();
    await save('socialFigures', { id: uid(), platform: figPlatform, date: figDate || new Date().toISOString().slice(0, 10), followers: followers.trim(), reach: reach.trim(), impressions: impressions.trim(), engagement: engagement.trim() });
    setFigDate(''); setFollowers(''); setReach(''); setImpressions(''); setEngagement('');
  };
  const selected = data.profile?.platforms || [];
  return (
    <Page status={status} title="Social Media Visibility" eyebrow="Business Intelligence" accent="intelligence">
      <div className="table-wrap"><table className="table"><thead><tr><th>Platform</th><th>Selected in profile</th><th>Published items</th><th>Scheduled items</th></tr></thead><tbody>
        {['Facebook', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn'].map((p) => (
          <tr key={p}><td>{p}</td><td>{selected.includes(p) ? 'Yes' : 'No'}</td><td>{data.calendar.filter((c) => c.platform === p && c.status === 'published').length}</td><td>{data.calendar.filter((c) => c.platform === p && c.status === 'scheduled').length}</td></tr>
        ))}
      </tbody></table></div>
      <div className="card">
        <h3>Add figures from a platform</h3>
        <p>Copy these figures yourself from the platform dashboard. They are your own entries, not fetched from any API, and they are never estimated.</p>
        <form className="form-grid" onSubmit={(e) => void submitFigure(e)}>
          <Field label="Platform"><select className={inputClass()} value={figPlatform} onChange={(e) => setFigPlatform(e.target.value)}><option>Facebook</option><option>Instagram</option><option>YouTube</option><option>TikTok</option><option>LinkedIn</option></select></Field>
          <Field label="Date"><input className={inputClass()} type="date" value={figDate} onChange={(e) => setFigDate(e.target.value)} /></Field>
          <Field label="Followers"><input className={inputClass()} value={followers} onChange={(e) => setFollowers(e.target.value)} /></Field>
          <Field label="Reach"><input className={inputClass()} value={reach} onChange={(e) => setReach(e.target.value)} /></Field>
          <Field label="Impressions"><input className={inputClass()} value={impressions} onChange={(e) => setImpressions(e.target.value)} /></Field>
          <Field label="Engagement"><input className={inputClass()} value={engagement} onChange={(e) => setEngagement(e.target.value)} /></Field>
          <button type="submit" className="primary-btn">Save figures</button>
        </form>
      </div>
      {data.socialFigures.length === 0 ? null : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Platform</th><th>Followers</th><th>Reach</th><th>Impressions</th><th>Engagement</th><th></th></tr></thead><tbody>
          {[...data.socialFigures].sort((a, b) => b.date.localeCompare(a.date)).map((f) => <tr key={f.id}><td>{f.date}</td><td>{f.platform}</td><td>{f.followers || '—'}</td><td>{f.reach || '—'}</td><td>{f.impressions || '—'}</td><td>{f.engagement || '—'}</td><td><button type="button" className="ghost-btn" onClick={() => void remove('socialFigures', f.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      )}
      <p>Published and scheduled counts come from your calendar only. Follower, reach and engagement figures need connected accounts and are not shown or estimated here.</p>
      <ConnectNote title="Social analytics connections" body="Facebook and Instagram need a Meta app with the relevant permissions. YouTube needs a Google OAuth client. TikTok and LinkedIn need their own developer apps. Each connection is configured separately and shows only data its API permits." />
    </Page>
  );
}

export function CompetitorsPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState('');
  const [reviewCount, setReviewCount] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  if (!loaded) return <Loading />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length === 0) return;
    await save('competitors', { id: uid(), name: name.trim(), category: category.trim(), rating: rating.trim(), reviewCount: reviewCount.trim(), website: website.trim(), notes: notes.trim() });
    setName(''); setCategory(''); setRating(''); setReviewCount(''); setWebsite(''); setNotes('');
  };
  return (
    <Page status={status} title="Competitor Intelligence" eyebrow="Business Intelligence" accent="intelligence">
      <div className="card">
        <h3>Add a competitor</h3>
        <p>Enter only information visible on public pages. Private competitor analytics are never claimed or shown.</p>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Business name"><input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Category"><input className={inputClass()} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
          <Field label="Public rating"><input className={inputClass()} value={rating} onChange={(e) => setRating(e.target.value)} placeholder="e.g. 4.6" /></Field>
          <Field label="Public review count"><input className={inputClass()} value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} /></Field>
          <Field label="Website"><input className={inputClass()} value={website} onChange={(e) => setWebsite(e.target.value)} /></Field>
          <Field label="Notes"><input className={inputClass()} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button type="submit" className="primary-btn">Add competitor</button>
        </form>
      </div>
      {data.competitors.length === 0 ? <EmptyState title="No competitors yet" body="Add competitors you want to compare against. Your own profile figures come from the Business Guide." /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Category</th><th>Rating</th><th>Reviews</th><th>Website</th><th></th></tr></thead><tbody>
          {data.competitors.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.category || '—'}</td><td>{c.rating || '—'}</td><td>{c.reviewCount || '—'}</td><td>{c.website || '—'}</td><td><button type="button" className="ghost-btn" onClick={() => void remove('competitors', c.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      )}
    </Page>
  );
}

const REPLY_TEMPLATES: { label: string; text: string }[] = [
  { label: 'Positive review', text: 'Thank you for your kind review. We appreciate your support and look forward to serving you again.' },
  { label: 'Neutral review', text: 'Thank you for your feedback. We have noted your comments and will use them to improve.' },
  { label: 'Negative review', text: 'Thank you for letting us know. We are sorry about your experience and would like to understand what went wrong so we can put it right.' },
];

export function ReputationPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [platform, setPlatform] = useState('Google');
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState('5');
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  if (!loaded) return <Loading />;
  const avg = data.reviews.length > 0 ? (data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length).toFixed(1) : '—';
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: data.reviews.filter((r) => r.rating === n).length }));
  const themes = reviewThemes(data.reviews.map((r) => r.text));
  const unanswered = data.reviews.filter((r) => !r.replied);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length === 0) return;
    await save('reviews', { id: uid(), platform, author: author.trim(), rating: parseInt(rating, 10), text: text.trim(), date: date || new Date().toISOString().slice(0, 10), replied: false, replyDraft: '' });
    setAuthor(''); setText(''); setDate('');
  };
  return (
    <Page status={status} title="Reputation Analysis" eyebrow="Business Intelligence" accent="intelligence">
      <div className="score-grid">
        <ScoreCard label="Average rating from logged reviews" score={null} detail={data.reviews.length > 0 ? 'Average ' + avg + ' from ' + data.reviews.length + ' logged reviews.' : 'No reviews logged yet.'} />
        <ScoreCard label="Unanswered reviews" score={null} detail={unanswered.length + ' reviews are waiting for a reply.'} />
      </div>
      <div className="card">
        <h3>Rating distribution</h3>
        {dist.map((d) => <p key={d.n}>{d.n} stars: {d.count}</p>)}
        <h3>Recurring themes in review text</h3>
        <p>Rule-based word matching only. Positive: {themes.positive.length > 0 ? themes.positive.map((t) => t.word + ' (' + t.count + ')').join(', ') : 'none found'}. Negative: {themes.negative.length > 0 ? themes.negative.map((t) => t.word + ' (' + t.count + ')').join(', ') : 'none found'}.</p>
      </div>
      <div className="card">
        <h3>Log a review</h3>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Platform"><select className={inputClass()} value={platform} onChange={(e) => setPlatform(e.target.value)}><option>Google</option><option>Facebook</option><option>Instagram</option><option>Other</option></select></Field>
          <Field label="Author"><input className={inputClass()} value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <Field label="Rating"><select className={inputClass()} value={rating} onChange={(e) => setRating(e.target.value)}><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></Field>
          <Field label="Date"><input className={inputClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Review text"><textarea className={inputClass()} value={text} onChange={(e) => setText(e.target.value)} required /></Field>
          <button type="submit" className="primary-btn">Log review</button>
        </form>
      </div>
      <div className="card">
        <h3>Reply workflow</h3>
        <p>Replies are drafted here only. Nothing is published automatically. Publish the reply on the platform yourself, then mark the review as replied.</p>
        {REPLY_TEMPLATES.map((t) => <p key={t.label}><strong>{t.label}:</strong> {t.text}</p>)}
      </div>
      {data.reviews.length === 0 ? <EmptyState title="No reviews logged yet" body="Log reviews you receive so ratings, themes and response rate are calculated from real entries." /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Platform</th><th>Author</th><th>Rating</th><th>Text</th><th>Replied</th><th></th></tr></thead><tbody>
          {[...data.reviews].sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
            <tr key={r.id}><td>{r.date}</td><td>{r.platform}</td><td>{r.author || '—'}</td><td>{r.rating}</td><td>{r.text}</td><td>{r.replied ? 'Yes' : 'No'}</td>
              <td>
                <button type="button" className="ghost-btn" onClick={() => void save('reviews', { ...r, replied: !r.replied })}>{r.replied ? 'Mark unanswered' : 'Mark replied'}</button>
                <button type="button" className="ghost-btn" onClick={() => void remove('reviews', r.id)}>Delete</button>
              </td></tr>
          ))}
        </tbody></table></div>
      )}
    </Page>
  );
}

export function ReportsPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const exportCsv = (name: string, rows: (string | number)[][]) => downloadText(name, toCsv(rows), 'text/csv');
  return (
    <Page status={status} title="Reports & Analytics" eyebrow="Business Intelligence" accent="intelligence">
      <div className="card">
        <h3>How scores are calculated</h3>
        <p>Profile completeness: filled profile fields weighted by importance, divided by total weight. Publishing consistency: published items in the last 30 days divided by the expected count from your weekly frequency in Media Strategy. Guide progress: completed recommendations divided by current recommendations. Overall: the average of the measurements that have data. Measurements without data are excluded, never estimated.</p>
        <p>Data coverage: your own saved profile, keywords, competitors, reviews, calendar, campaigns, strategies, shorts and guide data. Connected platform figures are excluded until connections are configured.</p>
        <button type="button" className="primary-btn" onClick={() => window.print()}>Print report view</button>
      </div>
      <div className="card">
        <h3>Export real data as CSV</h3>
        <div className="filter-row">
          <button type="button" className="ghost-btn" onClick={() => exportCsv('keywords.csv', [['Keyword', 'Group', 'Location', 'Landing page'], ...data.keywords.map((k) => [k.keyword, k.group, k.location, k.landingPage])])}>Keywords CSV</button>
          <button type="button" className="ghost-btn" onClick={() => exportCsv('calendar.csv', [['Title', 'Platform', 'Type', 'Status', 'Date', 'Campaign'], ...data.calendar.map((c) => [c.title, c.platform, c.type, c.status, c.date, c.campaign])])}>Calendar CSV</button>
          <button type="button" className="ghost-btn" onClick={() => exportCsv('reviews.csv', [['Date', 'Platform', 'Author', 'Rating', 'Text', 'Replied'], ...data.reviews.map((r) => [r.date, r.platform, r.author, r.rating, r.text, r.replied ? 'Yes' : 'No'])])}>Reviews CSV</button>
          <button type="button" className="ghost-btn" onClick={() => exportCsv('competitors.csv', [['Name', 'Category', 'Rating', 'Review count', 'Website'], ...data.competitors.map((c) => [c.name, c.category, c.rating, c.reviewCount, c.website])])}>Competitors CSV</button>
          <button type="button" className="ghost-btn" onClick={() => exportCsv('score-history.csv', [['Date', 'Overall', 'Profile', 'Consistency', 'Guide'], ...data.scoreHistory.map((p) => [p.date, p.overall, p.profile, p.consistency === null ? '' : p.consistency, p.guide])])}>Score history CSV</button>
        </div>
      </div>
      <div className="card">
        <h3>Saved counts</h3>
        <p>Keywords: {data.keywords.length} · Competitors: {data.competitors.length} · Reviews: {data.reviews.length} · Calendar items: {data.calendar.length} · Campaigns: {data.campaigns.length} · Strategies: {data.strategies.length} · Shorts ideas: {data.shorts.length} · Score snapshots: {data.scoreHistory.length}</p>
        {(data.keywords.length + data.competitors.length + data.reviews.length + data.calendar.length + data.campaigns.length + data.strategies.length + data.shorts.length) === 0 ? <p>No data saved yet. <Link to="/intelligence/search">Add a keyword</Link> · <Link to="/intelligence/reputation">Log a review</Link> · <Link to="/growth/content-studio">Write content</Link></p> : null}
      </div>
    </Page>
  );
}
