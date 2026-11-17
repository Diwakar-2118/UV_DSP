import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Eye, EyeOff, MessagesSquare, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../lib/context';
import { Badge, Button, Card, EmptyState, ErrorBox, Input, Modal, PageHeader, Spinner, Tabs } from '../components/ui';

interface Topic { topic: string; summary: string; keyConcepts: string[]; example?: string; questionCount: number; performance: { avg: number; attempts: number } | null }
interface BankQ { id: string; category: string; topic: string; difficulty: string; qtype: string; question: string; options: string[] | null; correct_option: number | null; ideal_answer: string; key_points: { point: string }[]; source: string }

const DIFF_TONE: Record<string, 'green' | 'amber' | 'red'> = { Beginner: 'green', Intermediate: 'amber', Advanced: 'red' };

export function QuestionItem({ q }: { q: BankQ }) {
  const [show, setShow] = useState(false);
  return (
    <li className="rounded-xl border border-slate-200 p-4 dark:border-slate-800" data-testid="bank-question">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={DIFF_TONE[q.difficulty]}>{q.difficulty}</Badge>
        <Badge tone="navy">{q.qtype}</Badge>
        <Badge>{q.topic}</Badge>
        {q.source === 'ai_generated' && <Badge tone="purple">AI-generated practice</Badge>}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{q.question}</p>
      {q.options && (
        <ol className="mt-2 space-y-1 text-sm">
          {q.options.map((o, i) => (
            <li key={i} className={show && i === q.correct_option ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
              {String.fromCharCode(65 + i)}. {o}
            </li>
          ))}
        </ol>
      )}
      <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={() => setShow(!show)} aria-expanded={show}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? 'Hide answer' : 'Show ideal answer'}
      </Button>
      {show && (
        <div className="fade-in mt-2 rounded-lg bg-emerald-50/60 p-3 dark:bg-emerald-950/30">
          <p className="prose-answer">{q.ideal_answer}</p>
          {q.key_points.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold text-slate-600 uppercase dark:text-slate-400">Key points interviewers look for</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">{q.key_points.map((k) => <li key={k.point}>{k.point}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function Prep() {
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi(() => api.get<{ categories: { category: string; topics: Topic[] }[] }>('/prep/topics'));
  const [cat, setCat] = useState('Manual Testing');
  const [topic, setTopic] = useState<Topic | null>(null);
  const [search, setSearch] = useState('');
  const questions = useApi(
    () => (topic || search.length > 2 ? api.get<{ questions: BankQ[] }>('/prep/questions', topic ? { category: cat, topic: topic.topic } : { q: search }) : Promise.resolve({ questions: [] })),
    [topic?.topic, cat, search.length > 2 ? search : ''],
  );

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const current = data?.categories.find((c) => c.category === cat);

  return (
    <div>
      <PageHeader
        title="Interview Preparation"
        subtitle="Study notes, key concepts and curated questions with ideal answers – from QA fundamentals to payments and ISO 8583."
        actions={<Button onClick={() => nav('/mock-interview', { state: { category: cat } })}><MessagesSquare className="h-4 w-4" /> Practise {cat}</Button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input aria-label="Search questions" placeholder="Search all questions (e.g. settlement, JOIN, 401)…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {search.length > 2 ? (
        <Card className="p-5">
          {questions.loading ? <Spinner /> : questions.data?.questions.length === 0 ? <EmptyState title="No questions found" /> : (
            <ul className="space-y-3">{questions.data?.questions.map((q) => <QuestionItem key={q.id} q={q} />)}</ul>
          )}
        </Card>
      ) : (
        <>
          <Tabs tabs={(data?.categories ?? []).map((c) => ({ id: c.category, label: c.category }))} value={cat} onChange={(c) => { setCat(c); setTopic(null); }} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {current?.topics.map((t) => (
              <button key={t.topic} onClick={() => setTopic(t)} className="card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md" data-testid="topic-card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t.topic}</h3>
                  {t.performance && <Badge tone={t.performance.avg >= 7.5 ? 'green' : t.performance.avg >= 6 ? 'navy' : 'red'}>{t.performance.avg}/10</Badge>}
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600 dark:text-slate-400">{t.summary}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{t.questionCount} practice question{t.questionCount === 1 ? '' : 's'}</span>
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      <Modal open={!!topic} onClose={() => setTopic(null)} title={`${cat} · ${topic?.topic ?? ''}`} wide footer={<Button onClick={() => nav('/mock-interview', { state: { category: cat } })}><MessagesSquare className="h-4 w-4" /> Mock interview on {cat}</Button>}>
        {topic && (
          <div className="space-y-5">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-navy-600" /> Study notes</p>
              <p className="prose-answer mt-1">{topic.summary}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Key concepts</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{topic.keyConcepts.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
            {topic.example && (
              <div>
                <p className="text-sm font-semibold">Example</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs whitespace-pre-wrap text-slate-100">{topic.example}</pre>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">Practice questions</p>
              {questions.loading ? <Spinner /> : questions.data?.questions.length === 0 ? <p className="mt-1 text-sm text-slate-500">No questions for this topic yet.</p> : (
                <ul className="mt-2 space-y-3">{questions.data?.questions.map((q) => <QuestionItem key={q.id} q={q} />)}</ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
