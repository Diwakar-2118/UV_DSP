import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Award, CheckCircle2, Clock, Lightbulb, MessagesSquare, RotateCcw, Sparkles, Target, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useApi, useToast } from '../lib/context';
import type { Evaluation, InterviewInfo, Question } from '../lib/types';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, Field, PageHeader, ProgressBar, ScoreRing, Select, Spinner, Textarea } from '../components/ui';

interface State { interview: InterviewInfo; current: Question | null }
interface AnswerResp extends State { evaluation: Evaluation; idealAnswer: string; correctOption: number | null; keyPoints: string[] }
interface Options { categories: string[]; modes: string[]; difficulties: string[]; experienceLevels: string[] }

function Setup() {
  const nav = useNavigate();
  const toast = useToast();
  const loc = useLocation() as { state?: { category?: string; difficulty?: string; mode?: string } };
  const opts = useApi(() => api.get<Options>('/interviews/options'));
  const history = useApi(() => api.get<{ interviews: { id: string; category: string; mode: string; difficulty: string; status: string; started_at: string; percentage: number | null; question_count: number }[] }>('/interviews'));
  const [f, setF] = useState({ category: loc.state?.category ?? 'Mixed', mode: loc.state?.mode ?? 'Mixed', difficulty: loc.state?.difficulty ?? 'Intermediate', experienceLevel: '3-5 years', count: 5, timed: false, durationMinutes: 15 });
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const r = await api.post<State & { id: string; questionCount: number; requested: number }>('/interviews', {
        category: f.category, mode: f.mode, difficulty: f.difficulty, experienceLevel: f.experienceLevel, count: f.count, durationMinutes: f.timed ? f.durationMinutes : null,
      });
      if (r.questionCount < r.requested) toast(`Only ${r.questionCount} question(s) available for this combination.`, 'info');
      nav(`/mock-interview/${r.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (opts.loading && !opts.data) return <Spinner />;
  const o = opts.data!;
  return (
    <div>
      <PageHeader title="AI Mock Interview" subtitle="One question at a time. Each answer is evaluated with a score, missing points, improvement tips and the ideal answer." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader icon={<MessagesSquare className="h-5 w-5" />} title="Set up your interview" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Category">{(id) => <Select id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} data-testid="iv-category">{o.categories.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
            <Field label="Interview mode">{(id) => <Select id={id} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} data-testid="iv-mode">{o.modes.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
            <Field label="Difficulty">{(id) => <Select id={id} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} data-testid="iv-difficulty">{o.difficulties.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
            <Field label="Experience level">{(id) => <Select id={id} value={f.experienceLevel} onChange={(e) => setF({ ...f, experienceLevel: e.target.value })}>{o.experienceLevels.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
            <Field label="Number of questions">{(id) => <Select id={id} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })} data-testid="iv-count">{[3, 5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}</Select>}</Field>
            <div>
              <p className="label">Timed interview</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-navy-700" checked={f.timed} onChange={(e) => setF({ ...f, timed: e.target.checked })} data-testid="iv-timed" /> Enable</label>
                {f.timed && (
                  <Select aria-label="Duration" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: Number(e.target.value) })} className="!w-auto">
                    {[5, 10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} min</option>)}
                  </Select>
                )}
              </div>
            </div>
            {f.mode === 'Fintech Domain' && <p className="text-xs text-slate-500 sm:col-span-2">Fintech Domain mode uses the Fintech &amp; Payments category regardless of the category selected.</p>}
            {f.mode === 'HR' && <p className="text-xs text-slate-500 sm:col-span-2">HR mode uses HR questions regardless of the category selected.</p>}
            <div className="sm:col-span-2">
              <Button onClick={start} loading={busy} className="w-full sm:w-auto" data-testid="start-interview"><Sparkles className="h-4 w-4" /> Start interview</Button>
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Previous sessions" />
          {history.data?.interviews.length === 0 ? <EmptyState title="No sessions yet" text="Your results and trends will appear here." /> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.data?.interviews.slice(0, 10).map((i) => (
                <li key={i.id}>
                  <Link to={`/mock-interview/${i.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.category} · {i.mode}</p>
                      <p className="text-xs text-slate-500">{i.difficulty} · {i.question_count} Qs · {new Date(i.started_at).toLocaleDateString()}</p>
                    </div>
                    {i.status === 'in_progress' ? <Badge tone="amber">Resume</Badge> : <Badge tone={(i.percentage ?? 0) >= 70 ? 'green' : 'navy'}>{i.percentage ?? 0}%</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Timer({ endsAt, onExpire }: { endsAt: string; onExpire: () => void }) {
  const [left, setLeft] = useState(() => new Date(endsAt).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const l = new Date(endsAt).getTime() - Date.now();
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt, onExpire]);
  const s = Math.max(0, Math.floor(left / 1000));
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums', s < 60 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')} data-testid="timer">
      <Clock className="h-4 w-4" /> {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

function Summary({ iv }: { iv: InterviewInfo }) {
  const nav = useNavigate();
  const s = iv.summary!;
  const review = useApi(() => api.get<{ attempts: { position: number; question: string; answer: string; score: number; is_correct: boolean; ideal_answer: string; feedback: string; topic: string }[] }>(`/interviews/${iv.id}/review`), [iv.id]);
  return (
    <div className="space-y-6" data-testid="interview-summary">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing value={s.percentage} size={96} />
          <div className="flex-1">
            <p className="text-sm text-slate-500">{iv.status === 'expired' ? 'Time is up – ' : ''}Interview complete · {iv.category} · {iv.mode} · {iv.difficulty}</p>
            <h2 className="text-2xl font-bold">Total score: {iv.totalScore} / {iv.maxScore}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.correct} of {iv.questionCount} answers rated correct · {s.unanswered} unanswered</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => nav('/mock-interview', { state: { category: s.recommendedNext.category, difficulty: s.recommendedNext.difficulty, mode: s.recommendedNext.mode } })} data-testid="next-session">
              <RotateCcw className="h-4 w-4" /> Recommended next session
            </Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><TrendingUp className="h-4 w-4" /> Strong topics</p>
          <ul className="mt-2 space-y-1 text-sm">{s.strongTopics.length ? s.strongTopics.map((t) => <li key={t.topic}>{t.topic} <span className="text-slate-500">({t.avg}/10)</span></li>) : <li className="text-slate-500">None yet – keep practising.</li>}</ul>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700"><TrendingDown className="h-4 w-4" /> Weak topics</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="weak-topics">{s.weakTopics.length ? s.weakTopics.map((t) => <li key={t.topic}>{t.topic} <span className="text-slate-500">({t.avg}/10)</span></li>) : <li className="text-slate-500">No weak topics 🎉</li>}</ul>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-700 dark:text-navy-300"><Lightbulb className="h-4 w-4" /> Improvement suggestions</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{s.suggestions.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-3 text-xs text-slate-500">Next: {s.recommendedNext.category}{s.recommendedNext.topic ? ` – ${s.recommendedNext.topic}` : ''} at {s.recommendedNext.difficulty}</p>
        </Card>
      </div>
      <Card>
        <CardHeader title="Answer review" />
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {review.data?.attempts.map((a) => (
            <li key={a.position} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">Q{a.position}. {a.question}</p>
                <Badge tone={a.is_correct ? 'green' : 'red'}>{a.score}/10</Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500 uppercase">Your answer</p>
              <p className="prose-answer">{a.answer || '—'}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-navy-700 dark:text-navy-300">Ideal answer</summary>
                <p className="prose-answer mt-1">{a.ideal_answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Session({ id }: { id: string }) {
  const toast = useToast();
  const { data, error, loading, setData, reload } = useApi(() => api.get<State>(`/interviews/${id}`), [id]);
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResp | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Spinner label="Loading interview…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const iv = data.interview;
  if (iv.status !== 'in_progress' && !result) return <Summary iv={iv} />;
  const q = result ? null : data.current;

  const submit = async (skip = false) => {
    if (!data.current) return;
    if (!skip && data.current.options && selected === null) return toast('Select an option', 'info');
    if (!skip && !data.current.options && answer.trim().length < 3) return toast('Type your answer first (or skip)', 'info');
    setBusy(true);
    try {
      const r = await api.post<AnswerResp>(`/interviews/${id}/answer`, { questionId: data.current.id, answer: skip ? '' : answer, selectedOption: skip ? null : selected });
      setResult({ ...r, current: data.current });
    } catch (e) {
      toast((e as Error).message, 'error');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    const r = result!;
    setResult(null);
    setAnswer('');
    setSelected(null);
    setData({ interview: r.interview, current: r.interview.status === 'in_progress' ? (await api.get<State>(`/interviews/${id}`)).current : null });
  };

  const finishEarly = async () => {
    if (!confirm('End the interview now? Unanswered questions score 0.')) return;
    const r = await api.post<State>(`/interviews/${id}/finish`);
    setResult(null);
    setData(r);
  };

  const shown = result?.current ?? q!;
  const answeredNow = result ? result.interview.answered : iv.answered;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{iv.category} · {iv.mode} · {iv.difficulty}</p>
          <p className="font-semibold" data-testid="question-progress">Question {shown.position} of {shown.total}</p>
        </div>
        <div className="flex items-center gap-2">
          {iv.endsAt && iv.status === 'in_progress' && <Timer endsAt={iv.endsAt} onExpire={() => void reload()} />}
          <Button size="sm" variant="ghost" onClick={finishEarly}>End interview</Button>
        </div>
      </div>
      <ProgressBar value={(answeredNow / iv.questionCount) * 100} />
      <Card className="p-6">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="navy">{shown.topic}</Badge>
          <Badge>{shown.qtype}</Badge>
          <Badge>{shown.difficulty}</Badge>
          {shown.source === 'ai_generated' && <Badge tone="purple">AI-generated</Badge>}
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white" data-testid="question-text">{shown.question}</h2>
        {shown.options ? (
          <div className="mt-4 space-y-2" role="radiogroup">
            {shown.options.map((o, i) => {
              const isCorrect = result && i === result.correctOption;
              const isWrongPick = result && selected === i && i !== result.correctOption;
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={selected === i}
                  disabled={!!result}
                  onClick={() => setSelected(i)}
                  data-testid="mcq-option"
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition',
                    isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : isWrongPick ? 'border-red-400 bg-red-50 dark:bg-red-950' : selected === i ? 'border-navy-500 bg-navy-50 dark:bg-navy-950' : 'border-slate-200 hover:border-navy-300 dark:border-slate-700',
                  )}
                >
                  <span className="font-semibold">{String.fromCharCode(65 + i)}.</span> {o}
                </button>
              );
            })}
          </div>
        ) : (
          <Textarea aria-label="Your answer" className="mt-4 min-h-40" placeholder="Type your answer as you would say it in the interview…" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!result} data-testid="answer-input" />
        )}
        {!result && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => void submit(true)} disabled={busy}>Skip</Button>
            <Button onClick={() => void submit()} loading={busy} data-testid="submit-answer">Submit answer</Button>
          </div>
        )}
      </Card>

      {result && (
        <Card className="fade-in p-6" data-testid="feedback">
          <div className="flex flex-wrap items-center gap-4">
            <ScoreRing value={Math.round(result.evaluation.score * 10)} />
            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold">
                {result.evaluation.isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                Score: <span data-testid="answer-score">{result.evaluation.score}</span>/10
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{result.evaluation.feedback}</p>
              <p className="mt-1 text-xs text-slate-400">Evaluated by {result.evaluation.evaluator === 'ai' ? 'OpenAI' : 'the built-in key-point grader (AI not configured)'}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {result.evaluation.coveredPoints.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Target className="h-4 w-4" /> What you covered</p>
                <ul className="mt-1 list-disc pl-5 text-sm">{result.evaluation.coveredPoints.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
            {result.evaluation.missingPoints.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700"><XCircle className="h-4 w-4" /> Missing points</p>
                <ul className="mt-1 list-disc pl-5 text-sm" data-testid="missing-points">{result.evaluation.missingPoints.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
          </div>
          {result.evaluation.suggestions.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 dark:text-navy-300"><Lightbulb className="h-4 w-4" /> How to improve</p>
              <ul className="mt-1 list-disc pl-5 text-sm">{result.evaluation.suggestions.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-emerald-50/70 p-4 dark:bg-emerald-950/30">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><Award className="h-4 w-4 text-emerald-600" /> Ideal answer</p>
            <p className="prose-answer mt-1" data-testid="ideal-answer">{result.idealAnswer}</p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => void next()} data-testid="next-question">{result.interview.status === 'in_progress' ? 'Next question' : 'See results'}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function MockInterview() {
  const { id } = useParams();
  return id ? <Session key={id} id={id} /> : <Setup />;
}
