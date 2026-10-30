import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { EmptyState, Loading } from '../components/components';
import { ConnectNote, ScoreCard, WorkspaceLayout } from '../components/workspace';
import { CONTENT_TYPES, OBJECTIVES, PLATFORMS, emptyProfile, uid, type BusinessProfile } from '../lib/data';
import { buildRecommendations } from '../lib/guide';
import { consistencyScore, frequencyFromStrategies, profileScore } from '../lib/scores';
import { useBusinessData } from '../lib/useData';
import type { SessionStatus } from '../lib/account';

function Page({ status, title, eyebrow, accent, children }: { status: SessionStatus; title: string; eyebrow: string; accent: string; children: ReactNode }): ReactNode {
  return <WorkspaceLayout status={status} title={title} eyebrow={eyebrow} accent={accent}>{children}</WorkspaceLayout>;
}

function Field({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return <label className="field"><span>{label}</span>{children}</label>;
}

const inputClass = 'field-input';

export function GrowthOverview({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const recs = buildRecommendations(data, status);
  const doneSet = new Set(data.guideDone.map((g) => g.recId));
  const guidePct = recs.length > 0 ? Math.round((recs.filter((r) => doneSet.has(r.id)).length / recs.length) * 100) : 0;
  return (
    <Page status={status} title="Growth Workspace" eyebrow="Workspace 2 · Growth Workspace" accent="growth">
      <div className="score-grid">
        <ScoreCard label="Guide progress" score={guidePct} detail={recs.filter((r) => doneSet.has(r.id)).length + ' of ' + recs.length + ' recommendations completed.'} />
        <ScoreCard label="Calendar items" score={null} detail={data.calendar.filter((c) => c.status === 'published').length + ' published · ' + data.calendar.filter((c) => c.status === 'scheduled').length + ' scheduled · ' + data.calendar.filter((c) => c.status === 'draft').length + ' drafts.'} />
        <ScoreCard label="Content drafts" score={null} detail={data.contents.length + ' drafts and templates saved in Content Studio.'} />
        <ScoreCard label="Campaigns and strategies" score={null} detail={data.campaigns.length + ' campaigns · ' + data.strategies.length + ' strategies · ' + data.shorts.length + ' short video ideas.'} />
      </div>
      <div className="section-grid">
        <Link to="/growth/social-management" className="tool-card tool-link"><h3>Social Media Management</h3><p>Connected accounts, platform counts and publishing pipeline.</p></Link>
        <Link to="/growth/content-studio" className="tool-card tool-link"><h3>Content Studio</h3><p>Write captions, add hashtags, save drafts and templates.</p></Link>
        <Link to="/growth/calendar" className="tool-card tool-link"><h3>Content Calendar</h3><p>Month and list views, filters, scheduling and status tracking.</p></Link>
        <Link to="/growth/guide" className="tool-card tool-link"><h3>Personal Business Guide</h3><p>Business profile, health assessment, action plan and goals.</p></Link>
        <Link to="/growth/media" className="tool-card tool-link"><h3>Media Strategy Builder</h3><p>Strategies with platforms, pillars, frequency and progress.</p></Link>
        <Link to="/growth/shorts" className="tool-card tool-link"><h3>Shorts Growth Studio</h3><p>Short video ideas, topics, hashtags and schedules.</p></Link>
        <Link to="/growth/campaigns" className="tool-card tool-link"><h3>Campaign Management</h3><p>Campaigns with planned and actual content counts.</p></Link>
      </div>
    </Page>
  );
}

const CONNECTION_NEEDS: { platform: string; need: string }[] = [
  { platform: 'Facebook', need: 'A Meta app with Facebook Pages and content publishing permissions is required.' },
  { platform: 'Instagram', need: 'A Meta app with Instagram content publishing permissions and a connected Facebook Page is required.' },
  { platform: 'YouTube', need: 'A Google Cloud OAuth client with YouTube Data API scopes is required.' },
  { platform: 'TikTok', need: 'A TikTok developer app with content posting permissions is required.' },
  { platform: 'LinkedIn', need: 'A LinkedIn developer app with organization posting permissions is required.' },
];

export function SocialManagementPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  return (
    <Page status={status} title="Social Media Management" eyebrow="Growth Workspace" accent="growth">
      <div className="table-wrap"><table className="table"><thead><tr><th>Platform</th><th>Status</th><th>Published</th><th>Scheduled</th><th>Drafts</th></tr></thead><tbody>
        {PLATFORMS.map((p) => (
          <tr key={p}><td>{p}</td><td><span className="pill pill-plain">Not connected</span></td><td>{data.calendar.filter((c) => c.platform === p && c.status === 'published').length}</td><td>{data.calendar.filter((c) => c.platform === p && c.status === 'scheduled').length}</td><td>{data.contents.filter((c) => c.platform === p).length}</td></tr>
        ))}
      </tbody></table></div>
      {CONNECTION_NEEDS.map((c) => <ConnectNote key={c.platform} title={c.platform + ' connection'} body={c.need + ' Publishing through an official API is enabled only after that connection is configured and tested. Until then, scheduling here means your own plan, not a published post.'} />)}
      <div className="card">
        <h3>Publishing pipeline</h3>
        <p>Use Content Studio to write content and the Content Calendar to plan it. When a platform is connected, scheduled items can be sent through its official API. Failed sends will show here with the API error so they can be retried safely.</p>
        <Link to="/growth/content-studio" className="ghost-btn">Open Content Studio</Link> <Link to="/growth/calendar" className="ghost-btn">Open Calendar</Link>
      </div>
    </Page>
  );
}

const CAPTION_LIMITS: Record<string, number> = { Facebook: 63206, Instagram: 2200, YouTube: 5000, TikTok: 4000, LinkedIn: 3000 };

export function StudioPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [type, setType] = useState('Post');
  const [template, setTemplate] = useState(false);
  const [campaign, setCampaign] = useState('');
  const [date, setDate] = useState('');
  if (!loaded) return <Loading />;
  const limit = CAPTION_LIMITS[platform] || 2200;
  const over = caption.length > limit;
  const reset = () => { setTitle(''); setCaption(''); setHashtags(''); setCampaign(''); setDate(''); };
  const saveDraft = async () => {
    if (title.trim().length === 0) return;
    await save('contents', { id: uid(), title: title.trim(), caption, hashtags: hashtags.trim(), platform, type, template, campaign: campaign.trim(), createdAt: new Date().toISOString() });
    reset();
  };
  const addToCalendar = async () => {
    if (title.trim().length === 0) return;
    await save('calendar', { id: uid(), title: title.trim(), platform, type, status: date ? 'scheduled' : 'draft', date: date || new Date().toISOString().slice(0, 10), campaign: campaign.trim(), notes: caption.slice(0, 500) });
    reset();
  };
  return (
    <Page status={status} title="Content Studio" eyebrow="Growth Workspace" accent="growth">
      <div className="card">
        <h3>Create content</h3>
        <form className="form-grid" onSubmit={(e: FormEvent) => { e.preventDefault(); void saveDraft(); }}>
          <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Platform"><select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Content type"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Campaign"><input className={inputClass} value={campaign} onChange={(e) => setCampaign(e.target.value)} /></Field>
          <Field label="Caption"><textarea className={inputClass} value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} /></Field>
          <Field label="Hashtags"><input className={inputClass} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#example #business" /></Field>
          <Field label="Schedule date"><input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <label className="field"><span>Reusable template</span><input type="checkbox" checked={template} onChange={(e) => setTemplate(e.target.checked)} /></label>
          <p>{caption.length} / {limit} characters for {platform}. {over ? 'Over the platform caption limit. Shorten the caption before publishing.' : 'Publishing through an official API re-validates length server-side.'}</p>
          <div className="filter-row">
            <button type="submit" className="primary-btn">Save draft or template</button>
            <button type="button" className="ghost-btn" onClick={() => void addToCalendar()}>Add to calendar</button>
          </div>
        </form>
      </div>
      {data.contents.length === 0 ? <EmptyState title="No drafts yet" body="Write content above and save it as a draft or reusable template." /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Title</th><th>Platform</th><th>Type</th><th>Template</th><th>Campaign</th><th></th></tr></thead><tbody>
          {data.contents.map((c) => <tr key={c.id}><td>{c.title}</td><td>{c.platform}</td><td>{c.type}</td><td>{c.template ? 'Yes' : 'No'}</td><td>{c.campaign || '—'}</td><td><button type="button" className="ghost-btn" onClick={() => { setTitle(c.title); setCaption(c.caption); setHashtags(c.hashtags); setPlatform(c.platform); setType(c.type); setTemplate(c.template); setCampaign(c.campaign); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Duplicate into editor</button> <button type="button" className="ghost-btn" onClick={() => void remove('contents', c.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      )}
    </Page>
  );
}

export function CalendarPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [month, setMonth] = useState(new Date());
  const [view, setView] = useState('month');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [type, setType] = useState('Post');
  const [itemStatus, setItemStatus] = useState('scheduled');
  const [date, setDate] = useState('');
  const [campaign, setCampaign] = useState('');
  const [notes, setNotes] = useState('');
  if (!loaded) return <Loading />;
  const filtered = data.calendar.filter((c) => (platformFilter === 'All' || c.platform === platformFilter) && (statusFilter === 'All' || c.status === statusFilter));
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const byDate = new Map<string, typeof data.calendar>();
  for (const c of filtered) {
    const list = byDate.get(c.date) || [];
    list.push(c);
    byDate.set(c.date, list);
  }
  const edit = (id: string) => {
    const c = data.calendar.find((x) => x.id === id);
    if (!c) return;
    setEditingId(c.id); setTitle(c.title); setPlatform(c.platform); setType(c.type); setItemStatus(c.status); setDate(c.date); setCampaign(c.campaign); setNotes(c.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length === 0 || !date) return;
    await save('calendar', { id: editingId || uid(), title: title.trim(), platform, type, status: itemStatus, date, campaign: campaign.trim(), notes: notes.trim() });
    setEditingId(''); setTitle(''); setCampaign(''); setNotes(''); setDate('');
  };
  return (
    <Page status={status} title="Content Calendar" eyebrow="Growth Workspace" accent="growth">
      <div className="card">
        <h3>{editingId ? 'Edit calendar item' : 'Add calendar item'}</h3>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Platform"><select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Content type"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Status"><select className={inputClass} value={itemStatus} onChange={(e) => setItemStatus(e.target.value)}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="failed">Failed</option></select></Field>
          <Field label="Date"><input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Campaign"><input className={inputClass} value={campaign} onChange={(e) => setCampaign(e.target.value)} /></Field>
          <Field label="Notes"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button type="submit" className="primary-btn">{editingId ? 'Save changes' : 'Add item'}</button>
        </form>
      </div>
      <div className="filter-row">
        <button type="button" className="ghost-btn" onClick={() => setView(view === 'month' ? 'list' : 'month')}>{view === 'month' ? 'Show list view' : 'Show month view'}</button>
        <label className="field"><span>Platform</span><select className={inputClass} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option>All</option>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field"><span>Status</span><select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="failed">Failed</option></select></label>
      </div>
      {view === 'month' ? (
        <div className="card">
          <div className="filter-row">
            <button type="button" className="ghost-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous month</button>
            <strong>{format(month, 'MMMM yyyy')}</strong>
            <button type="button" className="ghost-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next month</button>
          </div>
          <div className="calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="cal-head">{d}</div>)}
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const items = byDate.get(key) || [];
              return (
                <div key={key} className={'cal-cell' + (isSameMonth(d, month) ? '' : ' cal-dim')}>
                  <span className="cal-day">{format(d, 'd')}</span>
                  {items.slice(0, 3).map((c) => <button key={c.id} type="button" className={'cal-item badge-' + c.status} onClick={() => edit(c.id)}>{c.title}</button>)}
                  {items.length > 3 ? <span className="cal-more">+{items.length - 3} more</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Title</th><th>Platform</th><th>Type</th><th>Status</th><th>Campaign</th><th></th></tr></thead><tbody>
          {[...filtered].sort((a, b) => a.date.localeCompare(b.date)).map((c) => <tr key={c.id}><td>{c.date}</td><td>{c.title}</td><td>{c.platform}</td><td>{c.type}</td><td><span className={'badge badge-' + c.status}>{c.status}</span></td><td>{c.campaign || '—'}</td><td><button type="button" className="ghost-btn" onClick={() => edit(c.id)}>Edit</button> <button type="button" className="ghost-btn" onClick={() => void remove('calendar', c.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      )}
    </Page>
  );
}

export function GuidePage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [form, setForm] = useState<BusinessProfile>(emptyProfile());
  const [formLoaded, setFormLoaded] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalMetric, setGoalMetric] = useState('profile');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  useEffect(() => {
    if (loaded && !formLoaded) {
      if (data.profile) setForm(data.profile);
      setFormLoaded(true);
    }
  }, [loaded, formLoaded, data.profile]);
  if (!loaded) return <Loading />;
  const recs = buildRecommendations(data, status);
  const doneSet = new Set(data.guideDone.map((g) => g.recId));
  const prof = profileScore(data.profile);
  const cons = consistencyScore(data, frequencyFromStrategies(data));
  const toggleDone = async (recId: string) => {
    const existing = data.guideDone.find((g) => g.recId === recId);
    if (existing) await remove('guideDone', existing.id);
    else await save('guideDone', { id: uid(), recId, completedAt: new Date().toISOString() });
  };
  const setField = (key: keyof BusinessProfile, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggleList = (key: 'objectives' | 'platforms', value: string) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    await save('profile', { ...form, id: 'profile' });
  };
  const addGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (goalTitle.trim().length === 0) return;
    await save('goals', { id: uid(), title: goalTitle.trim(), metric: goalMetric, target: goalTarget.trim(), deadline: goalDeadline, done: false });
    setGoalTitle(''); setGoalTarget(''); setGoalDeadline('');
  };
  const goalProgress = (metric: string, target: string, done: boolean): string => {
    if (metric === 'profile') return 'Profile score now ' + prof.score + ' / 100.';
    if (metric === 'calendar') return 'Published in last 30 days: ' + cons.published30 + (target ? ' (target ' + target + ')' : '') + '.';
    return done ? 'Marked done.' : 'Not done yet.';
  };
  return (
    <Page status={status} title="Personal Business Guide" eyebrow="Growth Workspace" accent="growth">
      <div className="card">
        <h3>Business Profile</h3>
        <p>This information drives your health scores and recommendations. It is stored in your browser for now and syncs to the business database when the business-api Worker deploys.</p>
        <form className="form-grid" onSubmit={(e) => void saveProfile(e)}>
          <Field label="Business name"><input className={inputClass} value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} /></Field>
          <Field label="Industry"><input className={inputClass} value={form.industry} onChange={(e) => setField('industry', e.target.value)} /></Field>
          <Field label="Business type"><input className={inputClass} value={form.businessType} onChange={(e) => setField('businessType', e.target.value)} /></Field>
          <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://example.com" /></Field>
          <Field label="Category"><input className={inputClass} value={form.category} onChange={(e) => setField('category', e.target.value)} /></Field>
          <Field label="Description"><textarea className={inputClass} value={form.description} onChange={(e) => setField('description', e.target.value)} /></Field>
          <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></Field>
          <Field label="Opening hours"><input className={inputClass} value={form.hours} onChange={(e) => setField('hours', e.target.value)} /></Field>
          <Field label="Target audience"><input className={inputClass} value={form.targetAudience} onChange={(e) => setField('targetAudience', e.target.value)} /></Field>
          <Field label="Target locations"><input className={inputClass} value={form.locations} onChange={(e) => setField('locations', e.target.value)} /></Field>
          <Field label="Services"><textarea className={inputClass} value={form.services} onChange={(e) => setField('services', e.target.value)} /></Field>
          <Field label="Photos count"><input className={inputClass} value={form.photosCount} onChange={(e) => setField('photosCount', e.target.value)} /></Field>
          <Field label="Priorities"><textarea className={inputClass} value={form.priorities} onChange={(e) => setField('priorities', e.target.value)} /></Field>
          <div className="field"><span>Objectives</span>{OBJECTIVES.map((o) => <label key={o} className="check-line"><input type="checkbox" checked={form.objectives.includes(o)} onChange={() => toggleList('objectives', o)} /> {o}</label>)}</div>
          <div className="field"><span>Preferred platforms</span>{PLATFORMS.map((p) => <label key={p} className="check-line"><input type="checkbox" checked={form.platforms.includes(p)} onChange={() => toggleList('platforms', p)} /> {p}</label>)}</div>
          <button type="submit" className="primary-btn">Save business profile</button>
        </form>
      </div>
      <div className="score-grid">
        <ScoreCard label="Profile completeness" score={prof.score} detail={prof.filled + ' of ' + prof.total + ' fields filled.'} />
        <ScoreCard label="Publishing consistency" score={cons.score} detail={cons.score === null ? 'Set a weekly frequency in Media Strategy to measure consistency.' : cons.published30 + ' published in last 30 days, ' + cons.scheduled14 + ' scheduled in next 14 days.'} />
      </div>
      <div className="card">
        <h3>Business health assessment</h3>
        {prof.breakdown.map((b) => <p key={b.label}>{b.label}: {b.filled ? 'Filled' : 'Missing'}</p>)}
      </div>
      <div className="card">
        <h3>Personalized action plan</h3>
        <p>Each recommendation shows its evidence from your saved data. No recommendation is generated by AI. Expected benefits are estimates, never guarantees.</p>
        {recs.length === 0 ? <p>No open recommendations. Add data to generate the next plan.</p> : recs.map((r) => (
          <div key={r.id} className="rec-card">
            <strong>{r.priority} · {r.title}</strong>
            <p>Reason: {r.reason}</p>
            <p>Evidence: {r.evidence}</p>
            <p>Steps: {r.steps.join(' ')}</p>
            <p>Estimated effort: {r.effort}</p>
            <div className="filter-row">
              <button type="button" className="ghost-btn" onClick={() => void toggleDone(r.id)}>{doneSet.has(r.id) ? 'Mark pending' : 'Mark completed'}</button>
              <Link to={r.route} className="ghost-btn">Open tool</Link>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Business goals</h3>
        <form className="form-grid" onSubmit={(e) => void addGoal(e)}>
          <Field label="Goal"><input className={inputClass} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required /></Field>
          <Field label="Metric"><select className={inputClass} value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)}><option value="profile">Profile completeness</option><option value="calendar">Publishing consistency</option><option value="manual">Manual check-in</option></select></Field>
          <Field label="Target"><input className={inputClass} value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="e.g. 80 or 12" /></Field>
          <Field label="Deadline"><input className={inputClass} type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} /></Field>
          <button type="submit" className="primary-btn">Add goal</button>
        </form>
        {data.goals.map((g) => <p key={g.id}>{g.title} · {goalProgress(g.metric, g.target, g.done)} <button type="button" className="ghost-btn" onClick={() => void save('goals', { ...g, done: !g.done })}>{g.done ? 'Reopen' : 'Mark done'}</button> <button type="button" className="ghost-btn" onClick={() => void remove('goals', g.id)}>Delete</button></p>)}
      </div>
    </Page>
  );
}

export function MediaPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [pillars, setPillars] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  if (!loaded) return <Loading />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length === 0) return;
    await save('strategies', { id: uid(), name: name.trim(), objective: objective.trim(), audience: audience.trim(), platforms, pillars: pillars.trim(), frequency: frequency.trim(), duration: duration.trim(), notes: notes.trim() });
    setName(''); setObjective(''); setAudience(''); setPlatforms([]); setPillars(''); setFrequency(''); setDuration(''); setNotes('');
  };
  return (
    <Page status={status} title="Media Strategy Builder" eyebrow="Growth Workspace" accent="growth">
      <div className="card">
        <h3>Create a strategy</h3>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Strategy name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Objective"><input className={inputClass} value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
          <Field label="Target audience"><input className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value)} /></Field>
          <Field label="Content pillars"><textarea className={inputClass} value={pillars} onChange={(e) => setPillars(e.target.value)} placeholder="One pillar per line or separated by commas" /></Field>
          <Field label="Weekly publishing frequency"><input className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. 3" /></Field>
          <Field label="Duration"><input className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 3 months" /></Field>
          <Field label="Notes"><textarea className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="field"><span>Platforms</span>{PLATFORMS.map((p) => <label key={p} className="check-line"><input type="checkbox" checked={platforms.includes(p)} onChange={() => setPlatforms((list) => list.includes(p) ? list.filter((x) => x !== p) : [...list, p])} /> {p}</label>)}</div>
          <button type="submit" className="primary-btn">Save strategy</button>
        </form>
      </div>
      {data.strategies.length === 0 ? <EmptyState title="No strategies yet" body="Create a strategy with objectives, audience, platforms, pillars and a weekly frequency." /> : data.strategies.map((s) => {
        const published = data.calendar.filter((c) => s.platforms.includes(c.platform) && c.status === 'published').length;
        const scheduled = data.calendar.filter((c) => s.platforms.includes(c.platform) && c.status === 'scheduled').length;
        return (
          <div key={s.id} className="card">
            <h3>{s.name}</h3>
            <p>Objective: {s.objective || '—'} · Audience: {s.audience || '—'} · Frequency: {s.frequency ? s.frequency + ' per week' : '—'} · Duration: {s.duration || '—'}</p>
            <p>Platforms: {s.platforms.join(', ') || '—'}</p>
            <p>Pillars: {s.pillars || '—'}</p>
            <p>Progress from your calendar: {published} published and {scheduled} scheduled on strategy platforms.</p>
            <button type="button" className="ghost-btn" onClick={() => void remove('strategies', s.id)}>Delete strategy</button>
          </div>
        );
      })}
    </Page>
  );
}

export function ShortsPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [itemStatus, setItemStatus] = useState('idea');
  const [date, setDate] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  if (!loaded) return <Loading />;
  const topics = ['All', ...Array.from(new Set(data.shorts.map((s) => s.topic).filter((t) => t.length > 0)))];
  const shown = topicFilter === 'All' ? data.shorts : data.shorts.filter((s) => s.topic === topicFilter);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length === 0) return;
    await save('shorts', { id: uid(), title: title.trim(), topic: topic.trim(), status: itemStatus, date, hashtags: hashtags.trim(), notes: notes.trim() });
    setTitle(''); setTopic(''); setDate(''); setHashtags(''); setNotes('');
  };
  return (
    <Page status={status} title="Shorts Growth Studio" eyebrow="Growth Workspace" accent="growth">
      <div className="card">
        <h3>Plan a short video</h3>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Topic category"><input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
          <Field label="Status"><select className={inputClass} value={itemStatus} onChange={(e) => setItemStatus(e.target.value)}><option value="idea">Idea</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select></Field>
          <Field label="Date"><input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Hashtags"><input className={inputClass} value={hashtags} onChange={(e) => setHashtags(e.target.value)} /></Field>
          <Field label="Notes"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button type="submit" className="primary-btn">Save short video idea</button>
        </form>
      </div>
      <div className="filter-row">
        <label className="field"><span>Topic filter</span><select className={inputClass} value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>{topics.map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      {shown.length === 0 ? <EmptyState title="No short video ideas yet" body="Add ideas with topics and hashtags, then schedule the strongest ones." /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Title</th><th>Topic</th><th>Status</th><th>Date</th><th>Hashtags</th><th></th></tr></thead><tbody>
          {shown.map((s) => <tr key={s.id}><td>{s.title}</td><td>{s.topic || '—'}</td><td>{s.status}</td><td>{s.date || '—'}</td><td>{s.hashtags || '—'}</td><td><button type="button" className="ghost-btn" onClick={() => void remove('shorts', s.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      )}
      <ConnectNote title="Shorts analytics" body="Views, likes, comments, watch time and retention come from the YouTube Data API after a Google OAuth connection. No Shorts performance figures are shown until that connection is configured." />
    </Page>
  );
}

export function CampaignsPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  if (!loaded) return <Loading />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length === 0) return;
    await save('campaigns', { id: uid(), name: name.trim(), objective: objective.trim(), startDate, endDate, platforms });
    setName(''); setObjective(''); setStartDate(''); setEndDate(''); setPlatforms([]);
  };
  return (
    <Page status={status} title="Campaign Management" eyebrow="Growth Workspace" accent="growth">
      <div className="card">
        <h3>Create a campaign</h3>
        <form className="form-grid" onSubmit={(e) => void submit(e)}>
          <Field label="Campaign name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Objective"><input className={inputClass} value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
          <Field label="Start date"><input className={inputClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="End date"><input className={inputClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <div className="field"><span>Platforms</span>{PLATFORMS.map((p) => <label key={p} className="check-line"><input type="checkbox" checked={platforms.includes(p)} onChange={() => setPlatforms((list) => list.includes(p) ? list.filter((x) => x !== p) : [...list, p])} /> {p}</label>)}</div>
          <button type="submit" className="primary-btn">Save campaign</button>
        </form>
      </div>
      {data.campaigns.length === 0 ? <EmptyState title="No campaigns yet" body="Create a campaign, then assign calendar items to its name to compare planned and actual content." /> : data.campaigns.map((c) => {
        const items = data.calendar.filter((x) => x.campaign === c.name);
        return (
          <div key={c.id} className="card">
            <h3>{c.name}</h3>
            <p>Objective: {c.objective || '—'} · {c.startDate || '—'} to {c.endDate || '—'} · Platforms: {c.platforms.join(', ') || '—'}</p>
            <p>Planned and actual from your calendar: {items.filter((x) => x.status === 'scheduled').length} scheduled · {items.filter((x) => x.status === 'published').length} published · {items.filter((x) => x.status === 'draft').length} drafts.</p>
            <button type="button" className="ghost-btn" onClick={() => void remove('campaigns', c.id)}>Delete campaign</button>
          </div>
        );
      })}
    </Page>
  );
}
