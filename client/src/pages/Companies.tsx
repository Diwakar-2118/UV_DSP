import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, ExternalLink, ListChecks, MessagesSquare, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../lib/context';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, Input, PageHeader, Spinner } from '../components/ui';

interface QItem { id: string; category: string; topic: string; difficulty: string; qtype: string; question: string }
interface Prep {
  company: { key: string; name: string; overview: string; segment: string; website: string; typicalRoles: string[]; skills: string[]; focusCategories: string[]; domainTopics: string[] };
  verified: boolean;
  interviewRounds: { name: string; detail: string }[];
  questions: { technical: QItem[]; domain: QItem[]; hr: QItem[]; ai?: string[] };
  recommendations: string[];
  disclaimer: string;
  generatedBy: 'curated' | 'ai' | 'generic';
}

const QList = ({ items }: { items: QItem[] }) =>
  items.length === 0 ? <p className="text-sm text-slate-500">None available.</p> : (
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      {items.map((q) => (
        <li key={q.id}>
          {q.question} <span className="text-xs text-slate-500">({q.topic} · {q.difficulty})</span>
        </li>
      ))}
    </ol>
  );

export default function Companies() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const list = useApi(() => api.get<{ companies: { key: string; name: string; segment: string; overview: string }[] }>('/companies', { q }), [q]);
  const prep = useApi(() => (selected ? api.get<Prep>(`/companies/${encodeURIComponent(selected)}`) : Promise.resolve(null)), [selected]);

  const searchAny = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length >= 2) setSelected(q.trim());
  };

  const p = prep.data;
  return (
    <div>
      <PageHeader title="Company Interview Questions" subtitle="Company-focused practice sets. Questions are practice material – not leaked or verified interview questions." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <form onSubmit={searchAny} className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Search companies" placeholder="Search a company…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="company-search" />
          </form>
          <Card>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.data?.companies.map((c) => (
                <li key={c.key}>
                  <button onClick={() => setSelected(c.key)} className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected === c.key ? 'bg-navy-50 dark:bg-navy-950' : ''}`} data-testid="company-item">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.segment}</p>
                  </button>
                </li>
              ))}
              {list.data?.companies.length === 0 && q.trim().length >= 2 && (
                <li className="p-4 text-sm">
                  <p className="text-slate-500">No curated profile for “{q}”.</p>
                  <Button size="sm" className="mt-2" onClick={() => setSelected(q.trim())} data-testid="generate-company">Generate practice set</Button>
                </li>
              )}
            </ul>
          </Card>
        </div>

        <div className="min-w-0">
          {!selected ? (
            <Card><EmptyState icon={<Building2 className="h-6 w-6" />} title="Pick a company" text="Choose a fintech or product company to see its overview, typical QA interview rounds and practice questions." /></Card>
          ) : prep.loading ? <Spinner label="Preparing company insights…" /> : prep.error ? <ErrorBox message={prep.error} onRetry={prep.reload} /> : p && (
            <div className="space-y-4" data-testid="company-prep">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{p.company.name}</h2>
                    <p className="text-sm text-slate-500">{p.company.segment}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={p.generatedBy === 'curated' ? 'navy' : p.generatedBy === 'ai' ? 'purple' : 'slate'}>{p.generatedBy === 'curated' ? 'Curated profile' : p.generatedBy === 'ai' ? 'AI-generated profile' : 'Generic practice set'}</Badge>
                    {p.company.website && <a href={p.company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">Official careers <ExternalLink className="h-3.5 w-3.5" /></a>}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{p.company.overview}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><p className="label">Typical QA roles</p><div className="flex flex-wrap gap-1">{p.company.typicalRoles.map((r) => <Badge key={r}>{r}</Badge>)}</div></div>
                  <div><p className="label">Skills to highlight</p><div className="flex flex-wrap gap-1">{p.company.skills.map((r) => <Badge key={r} tone="navy">{r}</Badge>)}</div></div>
                </div>
                <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200" data-testid="company-disclaimer"><AlertTriangle className="h-4 w-4 shrink-0" /> {p.disclaimer}</p>
              </Card>
              <Card>
                <CardHeader icon={<ListChecks className="h-5 w-5" />} title="Common interview rounds" subtitle="Typical industry pattern for QA roles – not verified for this company" />
                <ol className="space-y-3 p-5">
                  {p.interviewRounds.map((r, i) => (
                    <li key={r.name} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-800 dark:bg-navy-900 dark:text-navy-100">{i + 1}</span>
                      <div><p className="text-sm font-semibold">{r.name}</p><p className="text-sm text-slate-500">{r.detail}</p></div>
                    </li>
                  ))}
                </ol>
              </Card>
              <div className="grid gap-4 xl:grid-cols-2">
                <Card><CardHeader title="Technical practice questions" subtitle={p.company.focusCategories.join(' · ')} /><div className="p-5"><QList items={p.questions.technical} /></div></Card>
                <Card><CardHeader title="Fintech domain practice questions" subtitle={p.company.domainTopics.join(' · ')} /><div className="p-5"><QList items={p.questions.domain} /></div></Card>
                <Card><CardHeader title="HR questions" /><div className="p-5"><QList items={p.questions.hr} /></div></Card>
                <Card>
                  <CardHeader title="Preparation recommendations" />
                  <div className="p-5">
                    <ul className="list-disc space-y-1 pl-5 text-sm">{p.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
                    {p.questions.ai && p.questions.ai.length > 0 && (
                      <>
                        <p className="mt-4 text-sm font-semibold">AI-generated practice questions <Badge tone="purple">Practice only</Badge></p>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{p.questions.ai.map((x) => <li key={x}>{x}</li>)}</ol>
                      </>
                    )}
                    <Button className="mt-4" onClick={() => nav('/mock-interview', { state: { category: p.company.focusCategories.includes('Fintech & Payments') ? 'Fintech & Payments' : p.company.focusCategories[0] } })}>
                      <MessagesSquare className="h-4 w-4" /> Mock interview for {p.company.name}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
