import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorBox, Loading } from '../components/components';
import { ScoreCard, WorkspaceLayout } from '../components/workspace';
import { SECURITY_CHECKS, securityFindings, securityScore, type SecurityRun } from '../lib/data';
import { useBusinessData } from '../lib/useData';
import { uid } from '../lib/data';
import type { SessionStatus } from '../lib/account';

function Page({ status, title, eyebrow, accent, children }: { status: SessionStatus; title: string; eyebrow: string; accent: string; children: ReactNode }): ReactNode {
  return <WorkspaceLayout status={status} title={title} eyebrow={eyebrow} accent={accent}>{children}</WorkspaceLayout>;
}

function latestRun(data: { securityRuns: SecurityRun[] }): SecurityRun | null {
  if (data.securityRuns.length === 0) return null;
  return [...data.securityRuns].sort((a, b) => b.date.localeCompare(a.date))[0];
}

const SEVERITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function SecurityOverview({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const run = latestRun(data);
  const findings = run ? securityFindings(run.answers) : [];
  return (
    <Page status={status} title="Advanced Security" eyebrow="Workspace 3 · Advanced Security · Max only" accent="security">
      <div className="score-grid">
        <ScoreCard label="Latest checklist score" score={run ? run.score : null} detail={run ? 'Recorded on ' + run.date.slice(0, 10) + '.' : 'No checklist run recorded yet.'} />
        <ScoreCard label="Open findings" score={null} detail={findings.length + ' findings in the latest run.'} />
        <ScoreCard label="High severity findings" score={null} detail={findings.filter((f) => f.severity === 'High').length + ' high severity findings in the latest run.'} />
      </div>
      <div className="section-grid">
        <Link to="/security/assessment" className="tool-card tool-link"><h3>Security Assessment</h3><p>Answer the security checklist and record a scored run.</p></Link>
        <Link to="/security/findings" className="tool-card tool-link"><h3>Security Findings</h3><p>Every finding from the latest run with its severity.</p></Link>
        <Link to="/security/risks" className="tool-card tool-link"><h3>Risk Prioritization</h3><p>Findings ordered High first, then Medium, then Low.</p></Link>
        <Link to="/security/remediation" className="tool-card tool-link"><h3>Remediation Guidance</h3><p>What to fix for each finding, in priority order.</p></Link>
        <Link to="/security/history" className="tool-card tool-link"><h3>History &amp; Reports</h3><p>Past runs, scores and trends over time.</p></Link>
      </div>
      <div className="card">
        <h3>Automated server-side scanning</h3>
        <p>The checklist above is fully functional today from your own answers. Automated server-side scanning of a website runs on the business-api Worker, which deploys after the business assertion approval. No automated scan result is shown until that Worker is live.</p>
      </div>
    </Page>
  );
}

export function AssessmentPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded, save } = useBusinessData();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (loaded && !prefilled) {
      const run = latestRun(data);
      if (run) setAnswers(run.answers);
      setPrefilled(true);
    }
  }, [loaded, prefilled, data]);
  if (!loaded) return <Loading />;
  const score = securityScore(answers);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (score === null) {
      setError('Answer at least one checklist question before saving a run.');
      return;
    }
    setError('');
    await save('securityRuns', { id: uid(), date: new Date().toISOString(), answers, score });
    setSaved(true);
  };
  return (
    <Page status={status} title="Security Assessment" eyebrow="Advanced Security · Max only" accent="security">
      <div className="card">
        <h3>Security checklist</h3>
        <p>Answer honestly from what you know about the website. Yes means the control is in place. No creates a finding. Unknown is excluded from the score.</p>
        <form onSubmit={(e) => void submit(e)}>
          {SECURITY_CHECKS.map((c) => (
            <div key={c.id} className="checklist-row">
              <span>{c.question} <span className="pill pill-plain">{c.severity}</span></span>
              <select className="field-input" value={answers[c.id] || 'unknown'} onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          ))}
          <p>Checklist score now: {score === null ? 'Answer at least one question.' : score + ' / 100.'}</p>
          <ErrorBox message={error} />
          {saved ? <p>Run saved. Open Findings to work through it.</p> : null}
          <button type="submit" className="primary-btn">Save checklist run</button>
        </form>
      </div>
    </Page>
  );
}

export function FindingsPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const run = latestRun(data);
  if (!run) return <Page status={status} title="Security Findings" eyebrow="Advanced Security · Max only" accent="security"><EmptyState title="No findings yet" body="Run the security checklist first. Findings appear here from your answers." /><Link to="/security/assessment" className="ghost-btn">Open assessment</Link></Page>;
  const findings = securityFindings(run.answers);
  return (
    <Page status={status} title="Security Findings" eyebrow="Advanced Security · Max only" accent="security">
      <p>Latest run: {run.date.slice(0, 10)} · Score {run.score} / 100 · {findings.length} findings.</p>
      {findings.length === 0 ? <EmptyState title="No findings in the latest run" body="Every answered checklist question was Yes. Re-run the checklist after any website change." /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Check</th><th>Severity</th><th>Remediation</th></tr></thead><tbody>
          {findings.map((f) => <tr key={f.id}><td>{f.question}</td><td><span className={'badge badge-' + f.severity.toLowerCase()}>{f.severity}</span></td><td>{f.remediation}</td></tr>)}
        </tbody></table></div>
      )}
    </Page>
  );
}

export function RisksPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const run = latestRun(data);
  if (!run) return <Page status={status} title="Risk Prioritization" eyebrow="Advanced Security · Max only" accent="security"><EmptyState title="No risks yet" body="Run the security checklist first. Risks are prioritized from your findings." /></Page>;
  const findings = securityFindings(run.answers).sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  return (
    <Page status={status} title="Risk Prioritization" eyebrow="Advanced Security · Max only" accent="security">
      <p>Priority order is fixed: High severity first, then Medium, then Low. Fix in this order.</p>
      {findings.length === 0 ? <EmptyState title="No open risks" body="The latest run has no findings." /> : findings.map((f, i) => (
        <div key={f.id} className="rec-card">
          <strong>Priority {i + 1} · {f.severity} severity</strong>
          <p>{f.question}</p>
          <p>{f.remediation}</p>
        </div>
      ))}
    </Page>
  );
}

export function RemediationPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const run = latestRun(data);
  if (!run) return <Page status={status} title="Remediation Guidance" eyebrow="Advanced Security · Max only" accent="security"><EmptyState title="No remediation steps yet" body="Run the security checklist first. Each finding gets a remediation step here." /></Page>;
  const findings = securityFindings(run.answers).sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  return (
    <Page status={status} title="Remediation Guidance" eyebrow="Advanced Security · Max only" accent="security">
      <p>Work through each step, then save a new checklist run. A new run replaces the old findings, so fixed items disappear from the list.</p>
      {findings.length === 0 ? <EmptyState title="Nothing to remediate" body="The latest run has no findings." /> : findings.map((f) => (
        <div key={f.id} className="rec-card">
          <strong>{f.severity} · {f.question}</strong>
          <p>Fix: {f.remediation}</p>
          <Link to="/security/assessment" className="ghost-btn">Re-run checklist after fixing</Link>
        </div>
      ))}
    </Page>
  );
}

export function HistoryPage({ status }: { status: SessionStatus }): ReactNode {
  const { data, loaded } = useBusinessData();
  if (!loaded) return <Loading />;
  const runs = [...data.securityRuns].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Page status={status} title="History & Reports" eyebrow="Advanced Security · Max only" accent="security">
      {runs.length === 0 ? <EmptyState title="No runs yet" body="Saved checklist runs appear here with their scores and finding counts." /> : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={runs.map((r) => ({ date: r.date.slice(0, 10), score: r.score }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#141272" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Score</th><th>Findings</th></tr></thead><tbody>
            {runs.map((r) => <tr key={r.id}><td>{r.date.slice(0, 10)}</td><td>{r.score} / 100</td><td>{securityFindings(r.answers).length}</td></tr>)}
          </tbody></table></div>
        </>
      )}
    </Page>
  );
}
