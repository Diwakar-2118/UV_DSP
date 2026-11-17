import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useAuth } from '../lib/context';
import JobCard, { MatchBreakdown } from '../components/JobCard';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { defaultFilters, useJobSearch } from './FindJobs';

const THRESHOLDS = [0, 70, 80, 90] as const;

export default function Matching() {
  const { user } = useAuth();
  const [min, setMin] = useState<number>(70);
  const [page, setPage] = useState(1);
  const prefs = user!.preferences;
  const f = { ...defaultFilters(prefs.roles, prefs.locations, prefs.minExperience, prefs.maxExperience), sort: 'match' as const, minMatch: min ? String(min) : '' };
  const { data, error, loading, reload, setData } = useJobSearch(f, page);
  const pages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <PageHeader title="AI Job Matching" subtitle="Every score is explainable: see exactly which skills, experience, industry and location factors contributed." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={<Target className="h-5 w-5" />} title="How your match score is calculated" />
          <div className="grid gap-3 p-5 sm:grid-cols-4">
            {[
              ['Skills', 40, 'Job skills found in your profile; +bonus if the role is one you target'],
              ['Experience', 25, `Your ${user!.profile.totalExperience} yrs vs the job's range`],
              ['Industry', 20, 'Fintech / payments jobs score highest for your preferences'],
              ['Location', 15, prefs.locations.join(', ')],
            ].map(([k, w, d]) => (
              <div key={k as string} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-2xl font-bold text-navy-800 dark:text-navy-200">{w}%</p>
                <p className="text-sm font-semibold">{k}</p>
                <p className="mt-1 text-xs text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold">Profile used for matching</p>
          <p className="mt-1 text-xs text-slate-500">{user!.profile.technicalSkills.length} skills · {user!.profile.totalExperience} yrs · {prefs.industries.slice(0, 3).join(', ')}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {user!.profile.technicalSkills.slice(0, 14).map((s) => <Badge key={s}>{s}</Badge>)}
          </div>
          <Link to="/profile" className="mt-3 inline-block text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">Edit profile →</Link>
        </Card>
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Minimum compatibility">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Show jobs with</span>
        {THRESHOLDS.map((t) => (
          <Button key={t} size="sm" variant={min === t ? 'primary' : 'secondary'} onClick={() => { setMin(t); setPage(1); }} aria-pressed={min === t}>
            {t ? `${t}%+` : 'Any score'}
          </Button>
        ))}
        {data && <span className="ml-auto text-sm text-slate-500" data-testid="match-count">{data.total} matching job{data.total === 1 ? '' : 's'}</span>}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? (
        <Spinner />
      ) : data && data.jobs.length === 0 ? (
        <Card><EmptyState icon={<Target className="h-6 w-6" />} title={`No jobs at ${min}%+ yet`} text="Lower the threshold, add skills you genuinely have to your profile, or fetch the latest jobs." /></Card>
      ) : (
        <div className="space-y-4">
          {data?.jobs.map((j, i) => (
            <div key={j.id} className="space-y-2">
              <JobCard job={j} onChange={(nj) => data && setData({ ...data, jobs: data.jobs.map((x) => (x.id === nj.id ? nj : x)) })} />
              {i < 3 && page === 1 && <MatchBreakdown job={j} />}
            </div>
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-slate-500">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
