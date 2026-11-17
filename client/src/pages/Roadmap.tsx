import { useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Flame, Map, Target } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useToast } from '../lib/context';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, Field, Input, PageHeader, ProgressBar, Select, Spinner, StatCard } from '../components/ui';

interface Item { id: string; day_number: number; plan_date: string; category: string; topic: string; task: string; minutes: number; completed_at: string | null }
interface Plan { plan: { id: string; title: string; start_date: string; days: number; daily_goal_minutes: number; focus_areas: string[] }; items: Item[]; stats: { total: number; completed: number; percent: number; streakDays: number; byCategory: { category: string; total: number; done: number }[] } }
interface Roadmap { experienceYears: number; stages: { role: string; level: string; skills: string[]; owned: string[]; missing: string[]; readiness: number }[]; interviewReadiness: { category: string; avgScore: number | null }[]; nextActions: string[] }

export default function RoadmapPage() {
  const toast = useToast();
  const plan = useApi(() => api.get<Plan | null>('/study/plan'));
  const road = useApi(() => api.get<Roadmap>('/dashboard/roadmap'));
  const [gen, setGen] = useState({ days: 14, dailyGoalMinutes: 90 });
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState<number | null>(null);

  const generate = async () => {
    setBusy(true);
    try {
      plan.setData(await api.post<Plan>('/study/plan', gen));
      setDay(null);
      toast('Study plan generated from your weak areas');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (it: Item) => {
    try {
      await api.patch(`/study/items/${it.id}`, { completed: !it.completed_at });
      await plan.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const p = plan.data;
  const today = new Date().toISOString().slice(0, 10);
  const todayDay = p?.items.find((i) => i.plan_date === today)?.day_number ?? 1;
  const shownDay = day ?? todayDay;
  const days = p ? [...new Set(p.items.map((i) => i.day_number))] : [];
  const dayItems = p?.items.filter((i) => i.day_number === shownDay) ?? [];
  const dayMinutes = dayItems.filter((i) => i.completed_at).reduce((a, i) => a + i.minutes, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Career Roadmap" subtitle="Your path to fintech QA and SDET roles, and a daily study plan that adapts to your mock-interview weak areas." />

      <Card>
        <CardHeader icon={<CalendarDays className="h-5 w-5" />} title="Daily interview study plan" subtitle={p ? `${p.plan.title} · started ${p.plan.start_date} · focus: ${p.plan.focus_areas.join(', ')}` : 'Generate a plan weighted towards your weakest topics'} />
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <Field label="Days">{(id) => <Select id={id} value={gen.days} onChange={(e) => setGen({ ...gen, days: Number(e.target.value) })} className="!w-28">{[7, 14, 21, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</Select>}</Field>
          <Field label="Daily goal (minutes)">{(id) => <Input id={id} type="number" min={15} max={600} value={gen.dailyGoalMinutes} onChange={(e) => setGen({ ...gen, dailyGoalMinutes: Number(e.target.value) })} className="!w-32" data-testid="daily-goal" />}</Field>
          <Button onClick={generate} loading={busy} data-testid="generate-plan">{p ? 'Regenerate plan' : 'Generate plan'}</Button>
        </div>
        {plan.loading && !p ? <Spinner /> : plan.error ? <div className="p-5"><ErrorBox message={plan.error} onRetry={plan.reload} /></div> : !p ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No study plan yet" text="Take a mock interview first for a plan tuned to your weak topics – or generate a balanced plan now." />
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Plan progress" value={<span data-testid="plan-percent">{p.stats.percent}%</span>} sub={`${p.stats.completed}/${p.stats.total} tasks`} icon={<Target className="h-5 w-5" />} />
              <StatCard label="Streak" value={`${p.stats.streakDays} day${p.stats.streakDays === 1 ? '' : 's'}`} icon={<Flame className="h-5 w-5" />} tone="amber" />
              <StatCard label="Daily goal" value={`${p.plan.daily_goal_minutes} min`} sub={`${dayMinutes} min done on day ${shownDay}`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
              <Card className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase">By area</p>
                <div className="mt-2 space-y-1.5">
                  {p.stats.byCategory.map((c) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-xs"><span>{c.category}</span><span className="text-slate-500">{c.done}/{c.total}</span></div>
                      <ProgressBar value={(c.done / c.total) * 100} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="Plan day">
              {days.map((d) => {
                const its = p.items.filter((i) => i.day_number === d);
                const done = its.every((i) => i.completed_at);
                return (
                  <button key={d} role="tab" aria-selected={d === shownDay} onClick={() => setDay(d)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${d === shownDay ? 'bg-navy-900 text-white' : done ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    Day {d}{d === todayDay && ' •'}
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 space-y-2" data-testid="study-items">
              {dayItems.map((it) => (
                <li key={it.id}>
                  <button onClick={() => void toggle(it)} className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-navy-300 dark:border-slate-800" aria-pressed={!!it.completed_at} data-testid="study-item">
                    {it.completed_at ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${it.completed_at ? 'text-slate-400 line-through' : ''}`}>{it.task}</p>
                      <p className="text-xs text-slate-500">{it.category} · {it.topic} · {it.minutes} min · {it.plan_date}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {road.error && <ErrorBox message={road.error} onRetry={road.reload} />}
      {road.data && (
        <>
          <Card>
            <CardHeader icon={<Map className="h-5 w-5" />} title="Career path" subtitle={`Readiness is based on the skills in your profile (${road.data.experienceYears} yrs experience)`} />
            <ol className="relative space-y-6 p-5 pl-12">
              <span className="absolute top-8 bottom-8 left-[27px] w-0.5 bg-navy-100 dark:bg-navy-900" aria-hidden />
              {road.data.stages.map((s, i) => (
                <li key={s.role} className="relative">
                  <span className={`absolute top-0.5 -left-[29px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${s.readiness >= 80 ? 'bg-emerald-500 text-white' : 'bg-navy-100 text-navy-800 dark:bg-navy-900 dark:text-navy-100'}`}>{i + 1}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{s.role}</p>
                    <Badge>{s.level}</Badge>
                    <span className="ml-auto text-sm font-semibold">{s.readiness}% ready</span>
                  </div>
                  <div className="mt-2"><ProgressBar value={s.readiness} tone={s.readiness >= 80 ? 'green' : 'navy'} /></div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.owned.map((k) => <Badge key={k} tone="green">{k}</Badge>)}
                    {s.missing.map((k) => <Badge key={k} tone="amber">+ {k}</Badge>)}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Interview readiness by area" subtitle="Average mock-interview score over the last 60 days" />
              <div className="space-y-3 p-5">
                {road.data.interviewReadiness.map((r) => (
                  <div key={r.category}>
                    <div className="flex justify-between text-sm"><span>{r.category}</span><span className="text-slate-500">{r.avgScore == null ? 'Not practised' : `${r.avgScore}/10`}</span></div>
                    <ProgressBar value={(r.avgScore ?? 0) * 10} tone={(r.avgScore ?? 0) >= 7.5 ? 'green' : (r.avgScore ?? 0) >= 6 ? 'navy' : 'amber'} />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Next best actions" />
              <ul className="list-disc space-y-1.5 p-5 pl-10 text-sm">{road.data.nextActions.length ? road.data.nextActions.map((a) => <li key={a}>{a}</li>) : <li>You're on track – keep practising mock interviews.</li>}</ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
