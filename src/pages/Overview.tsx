import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, Loading } from '../components/components';
import { ConnectNote, ScoreCard, WorkspaceLayout } from '../components/workspace';
import { buildRecommendations } from '../lib/guide';
import { overallScore, profileScore, weeklyActivity } from '../lib/scores';
import { useBusinessData } from '../lib/useData';
import { uid } from '../lib/data';
import type { SessionStatus } from '../lib/account';

export function OverviewPage({ status, email }: { status: SessionStatus; email: string }): ReactNode {
  const { data, loaded, save, remove } = useBusinessData();
  if (!loaded) return <Loading />;
  const recs = buildRecommendations(data, status);
  const doneSet = new Set(data.guideDone.map((g) => g.recId));
  const guidePct = recs.length > 0 ? Math.round((recs.filter((r) => doneSet.has(r.id)).length / recs.length) * 100) : 0;
  const overall = overallScore(data, guidePct);
  const prof = profileScore(data.profile);
  const weeks = weeklyActivity(data);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.calendar.filter((c) => c.status === 'scheduled' && c.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const pending = recs.filter((r) => !doneSet.has(r.id)).slice(0, 5);

  const saveSnapshot = async () => {
    const point = { id: uid(), date: new Date().toISOString(), overall: overall.overall, profile: prof.score, consistency: overall.parts.find((p) => p.label === 'Publishing consistency')?.score ?? null, guide: guidePct };
    if (data.scoreHistory.length >= 90) {
      const oldest = [...data.scoreHistory].sort((a, b) => a.date.localeCompare(b.date))[0];
      if (oldest) await remove('scoreHistory', oldest.id);
    }
    await save('scoreHistory', point);
  };

  return (
    <WorkspaceLayout status={status} title="Unified Dashboard" eyebrow="Kluzar Business & Reputation" accent="overview">
      <div className="card">
        <h3>Welcome back</h3>
        <p>Signed in as {email}. Plan: {status === 'growth' ? 'Growth' : 'Max'}. Scores below are calculated only from your own saved data.</p>
        <p>{overall.coverage}</p>
        <button type="button" className="ghost-btn" onClick={() => void saveSnapshot()}>Save score snapshot</button>
      </div>
      <div className="score-grid">
        <ScoreCard label="Overall Business Visibility Score" score={overall.overall} detail={overall.coverage} />
        <ScoreCard label="Business profile completeness" score={prof.score} detail={prof.filled + ' of ' + prof.total + ' profile fields filled.'} />
        <ScoreCard label="Publishing consistency" score={overall.parts.find((p) => p.label === 'Publishing consistency')?.score ?? null} detail="Published items against your weekly frequency from Media Strategy." />
        <ScoreCard label="Guide progress" score={guidePct} detail={recs.filter((r) => doneSet.has(r.id)).length + ' of ' + recs.length + ' recommendations completed.'} />
      </div>
      <div className="chart-card card">
        <h3>Score history</h3>
        {data.scoreHistory.length === 0 ? <EmptyState title="No snapshots yet" body="Save a score snapshot to start a history line. Snapshots are your own saved scores, never estimated." /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={[...data.scoreHistory].sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ date: p.date.slice(0, 10), overall: p.overall, profile: p.profile }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="overall" stroke="#7c5cff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profile" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="chart-card card">
        <h3>Calendar activity, last 8 weeks</h3>
        <p>Counts from your calendar items only.</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeks}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="published" fill="#141272" />
            <Bar dataKey="scheduled" fill="#7c5cff" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="section-grid">
        <div className="card">
          <h3>Upcoming content</h3>
          {upcoming.length === 0 ? <p>No scheduled items ahead. Open the Content Calendar to schedule content.</p> : upcoming.map((c) => <p key={c.id}>{c.date} · {c.title} · {c.platform}</p>)}
          <Link to="/growth/calendar" className="ghost-btn">Open calendar</Link>
        </div>
        <div className="card">
          <h3>Pending recommendations</h3>
          {pending.length === 0 ? <p>All current recommendations are completed. New ones appear when your data changes.</p> : pending.map((r) => <p key={r.id}>{r.priority} · {r.title}</p>)}
          <Link to="/growth/guide" className="ghost-btn">Open business guide</Link>
        </div>
      </div>
      <div className="section-grid">
        <Link to="/intelligence" className="tool-card tool-link"><h3>Business Intelligence</h3><p>Search visibility, business profile, social visibility, competitors, reputation and reports.</p></Link>
        <Link to="/growth" className="tool-card tool-link"><h3>Growth Workspace</h3><p>Social management, content studio, calendar, guide, media strategy, shorts and campaigns.</p></Link>
        <Link to="/security" className="tool-card tool-link"><h3>Advanced Security</h3><p>Max only. Assessment, findings, risk prioritization, remediation and history.</p></Link>
      </div>
      <ConnectNote title="Platform connections" body="Google Search Console, Google Business Profile and social platforms need their own OAuth connections. Until you connect them, their analytics sections show no figures. The exact connection setup is listed on each platform page." />
    </WorkspaceLayout>
  );
}
