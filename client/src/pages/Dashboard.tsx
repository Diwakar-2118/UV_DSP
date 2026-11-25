import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bell, Bookmark, Briefcase, CalendarClock, CheckCircle2, Circle, GraduationCap, Search, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useAuth, useTheme } from '../lib/context';
import { APPLICATION_STATUSES } from '../lib/types';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, ProgressBar, Spinner, StatCard, timeAgo } from '../components/ui';

interface DashboardData {
  jobs: { live_total: number; new_today: number };
  savedJobs: number;
  notifications: { unread: number; total: number };
  applications: { total: number; byStatus: Record<string, number> };
  upcomingInterviews: { id: string; company: string; role_title: string; status: string; interview_at: string }[];
  interviewScores: { id: string; category: string; completed_at: string; percentage: number | null }[];
  recentNotifications: { id: string; match_score: number; created_at: string; read_at: string | null; title: string; company: string; location: string; apply_url: string | null }[];
  study: null | { total: number; completed: number; percent: number; streakDays: number; today: { id: string; category: string; topic: string; task: string; minutes: number; completed_at: string | null }[] };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { data, error, loading, reload } = useApi(() => api.get<DashboardData>('/dashboard'));
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const axis = theme === 'dark' ? '#94a3b8' : '#64748b';
  const pipeline = APPLICATION_STATUSES.map((s) => ({ status: s.replace('Resume ', '').replace(' Scheduled', ''), count: data.applications.byStatus[s] ?? 0 }));
  const scores = data.interviewScores.map((s, i) => ({ n: `#${i + 1}`, score: s.percentage ?? 0, category: s.category }));
  const hour = new Date().getHours();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-700 p-6 text-white shadow-sm">
        <div>
          <p className="text-sm text-navy-200">{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'},</p>
          <h1 className="text-2xl font-bold" data-testid="dashboard-greeting">{user?.profile.fullName || 'there'} 👋</h1>
          <p className="mt-1 text-sm text-navy-100">Find Opportunities. Prepare Smarter. Get Hired.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/jobs" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"><Search className="h-4 w-4" /> Find jobs</Link>
          <Link to="/mock-interview" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/20"><Sparkles className="h-4 w-4" /> Mock interview</Link>
        </div>
      </div>

      {data.jobs.live_total === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          No jobs collected yet. Open <Link to="/jobs" className="font-semibold underline">Find Jobs</Link> and click “Fetch latest jobs” to pull live IT jobs from company career pages, or check <Link to="/settings" className="font-semibold underline">Settings → Job sources</Link>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard testId="stat-new-jobs" label="New jobs (24h)" value={data.jobs.new_today} sub={`${data.jobs.live_total} live listings`} icon={<Search className="h-5 w-5" />} />
        <StatCard testId="stat-alerts" label="Unread alerts" value={data.notifications.unread} sub={`${data.notifications.total} total`} icon={<Bell className="h-5 w-5" />} tone="sky" />
        <StatCard testId="stat-applications" label="Applications" value={data.applications.total} sub={`${data.upcomingInterviews.length} upcoming interview(s)`} icon={<Briefcase className="h-5 w-5" />} tone="purple" />
        <StatCard testId="stat-saved" label="Saved jobs" value={data.savedJobs} sub="Ready to apply" icon={<Bookmark className="h-5 w-5" />} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Application pipeline" subtitle="Where each application currently stands" action={<Link to="/tracker" className="text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">Open tracker</Link>} />
          <div className="h-64 p-4">
            {data.applications.total === 0 ? (
              <EmptyState icon={<Briefcase className="h-6 w-6" />} title="No applications yet" text="Track jobs you apply to and watch them move through the pipeline." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: axis }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axis }} />
                  <Tooltip cursor={{ fill: theme === 'dark' ? '#0f172a' : '#f1f5f9' }} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#2551d6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon={<GraduationCap className="h-5 w-5" />} title="Today's study plan" subtitle={data.study ? `${data.study.percent}% of plan complete · ${data.study.streakDays}-day streak` : undefined} />
          <div className="p-5">
            {!data.study ? (
              <EmptyState title="No study plan yet" text="Generate a plan based on your weak areas." action={<Link to="/roadmap"><Button size="sm">Create plan</Button></Link>} />
            ) : (
              <>
                <ProgressBar value={data.study.percent} tone="green" />
                <ul className="mt-4 space-y-3">
                  {data.study.today.length === 0 && <li className="text-sm text-slate-500">Nothing scheduled today.</li>}
                  {data.study.today.map((t) => (
                    <li key={t.id} className="flex gap-2 text-sm">
                      {t.completed_at ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                      <span className={t.completed_at ? 'text-slate-400 line-through' : ''}>
                        <span className="font-medium">{t.topic}</span> <span className="text-xs text-slate-500">· {t.minutes}m</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/roadmap" className="mt-4 inline-block text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">Open study plan →</Link>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Latest matching jobs" subtitle="From your daily alerts" action={<Link to="/alerts" className="text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">All alerts</Link>} />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentNotifications.length === 0 && <li className="p-5 text-sm text-slate-500">No alerts yet. New live jobs matching your preferences will appear here after the daily run.</li>}
            {data.recentNotifications.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-5 py-3">
                <Badge tone={n.match_score >= 80 ? 'green' : 'navy'}>{n.match_score}%</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="truncate text-xs text-slate-500">{n.company} · {n.location} · {timeAgo(n.created_at)}</p>
                </div>
                {n.apply_url && <a href={n.apply_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-navy-700 hover:underline dark:text-navy-300">Apply</a>}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader icon={<CalendarClock className="h-5 w-5" />} title="Upcoming interviews" />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.upcomingInterviews.length === 0 && <li className="p-5 text-sm text-slate-500">No interviews scheduled. Add interview dates in the Application Tracker.</li>}
            {data.upcomingInterviews.map((i) => (
              <li key={i.id} className="px-5 py-3">
                <p className="text-sm font-medium">{i.company}</p>
                <p className="text-xs text-slate-500">{i.role_title} · {i.status}</p>
                <p className="mt-0.5 text-xs font-medium text-navy-700 dark:text-navy-300">{new Date(i.interview_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Mock interview scores" subtitle="Your last 12 sessions" action={<Link to="/mock-interview" className="text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">Practice now</Link>} />
        <div className="h-56 p-4">
          {scores.length === 0 ? (
            <EmptyState title="No mock interviews yet" text="Take a session to start tracking your progress." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scores} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2551d6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2551d6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="n" tick={{ fontSize: 11, fill: axis }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axis }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number, _n, p) => [`${v}%`, p.payload.category]} />
                <Area type="monotone" dataKey="score" stroke="#2551d6" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
