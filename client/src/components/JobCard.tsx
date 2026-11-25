import { useState } from 'react';
import { Bookmark, BookmarkCheck, Briefcase, Building2, Calendar, ChevronDown, ExternalLink, IndianRupee, MapPin, Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '../lib/api';
import { useToast } from '../lib/context';
import type { Job } from '../lib/types';
import { Badge, Button, ScoreRing, timeAgo } from './ui';

export const expText = (j: Pick<Job, 'exp_min' | 'exp_max'>) =>
  j.exp_min == null && j.exp_max == null ? 'Not specified' : j.exp_max == null ? `${j.exp_min}+ yrs` : `${j.exp_min ?? 0}–${j.exp_max} yrs`;
export const salaryText = (j: Job) =>
  j.salary_min_lpa && j.salary_max_lpa ? `₹${j.salary_min_lpa}–${j.salary_max_lpa} LPA` : j.salary_text || (j.salary_max_lpa ? `Up to ₹${j.salary_max_lpa} LPA` : null);

export function MatchBreakdown({ job }: { job: Job }) {
  const m = job.match;
  const rows = [
    ['Skills', m.breakdown.skills, 40],
    ['Experience', m.breakdown.experience, 25],
    ['Industry', m.breakdown.industry, 20],
    ['Location', m.breakdown.location, 15],
  ] as const;
  return (
    <div className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 dark:bg-slate-800/50" data-testid="match-breakdown">
      <div className="space-y-2">
        {rows.map(([label, v, max]) => (
          <div key={label}>
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
              <span className="text-slate-500">
                {v}/{max}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-navy-600" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="pt-1 text-xs text-slate-500">{m.experienceFit}</p>
      </div>
      <div className="space-y-2">
        {m.matchingSkills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Matching skills</p>
            <div className="mt-1 flex flex-wrap gap-1">{m.matchingSkills.map((s) => <Badge key={s} tone="green">{s}</Badge>)}</div>
          </div>
        )}
        {m.missingSkills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Missing skills</p>
            <div className="mt-1 flex flex-wrap gap-1">{m.missingSkills.map((s) => <Badge key={s} tone="amber">{s}</Badge>)}</div>
          </div>
        )}
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600 dark:text-slate-400">
          {m.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function JobCard({ job, onChange }: { job: Job; onChange?: (j: Job) => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [askTrack, setAskTrack] = useState(false);
  const [tracking, setTracking] = useState(false);
  const sal = salaryText(job);
  const linkedInSearch = `https://www.linkedin.com/jobs/search/?${new URLSearchParams({ keywords: job.title.replace(/–.*$/g, '').trim(), location: job.location_tags.includes('Remote') ? 'India' : `${job.location_tags[0] ?? 'Bengaluru'}, India` })}`;

  const toggleSave = async () => {
    setSaving(true);
    try {
      if (job.saved) await api.del(`/jobs/${job.id}/save`);
      else await api.post(`/jobs/${job.id}/save`);
      onChange?.({ ...job, saved: !job.saved });
      toast(job.saved ? 'Removed from saved jobs' : 'Job saved');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const track = async (status: 'Applied' | 'Interested') => {
    setTracking(true);
    try {
      await api.post('/applications', { jobId: job.id, company: job.company, roleTitle: job.title, jobUrl: job.apply_url ?? '', location: job.location, status });
      toast(`Added to Application Tracker as "${status}"`);
      setAskTrack(false);
    } catch (e) {
      toast(e instanceof ApiError && e.status === 409 ? 'Already in your Application Tracker' : (e as Error).message, e instanceof ApiError && e.status === 409 ? 'info' : 'error');
      setAskTrack(false);
    } finally {
      setTracking(false);
    }
  };

  return (
    <article className="card p-5 transition hover:shadow-md" data-testid="job-card">
      <div className="flex gap-4">
        <ScoreRing value={job.match.score} label={`${job.match.score}% match`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">Live listing</Badge>
            {job.roles.slice(0, 3).map((r) => (
              <Badge key={r} tone="navy">
                {r}
              </Badge>
            ))}
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white" data-testid="job-title">{job.title}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location || job.location_tags.join(', ')}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{expText(job)}</span>
            {sal && <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{sal}</span>}
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{timeAgo(job.posted_at)}</span>
          </div>
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {job.skills.slice(0, 12).map((s) => (
            <span key={s} className={clsx('rounded-md px-2 py-0.5 text-xs', job.match.matchingSkills.includes(s) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
              {s}
            </span>
          ))}
        </div>
      )}

      <p className={clsx('mt-3 text-sm whitespace-pre-line text-slate-600 dark:text-slate-400', !open && 'line-clamp-3')}>{job.description}</p>
      {open && <div className="mt-3"><MatchBreakdown job={job} /></div>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Source: <span className="font-medium">{job.source_site || job.source_name}</span>
          {job.job_type && <> · {job.job_type}</>}
          {job.notice_period && <> · {job.notice_period}</>}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
            <ChevronDown className={clsx('h-4 w-4 transition', open && 'rotate-180')} /> {open ? 'Less' : 'Details & match'}
          </Button>
          <Button size="sm" variant="secondary" onClick={toggleSave} loading={saving} data-testid="save-job">
            {job.saved ? <BookmarkCheck className="h-4 w-4 text-navy-600" /> : <Bookmark className="h-4 w-4" />} {job.saved ? 'Saved' : 'Save Job'}
          </Button>
          {job.apply_url ? (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setAskTrack(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 dark:bg-navy-600"
              data-testid="apply-now"
            >
              Apply Now <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <>
              <Button size="sm" variant="subtle" onClick={() => void track('Interested')} loading={tracking} data-testid="track-job">
                <Plus className="h-4 w-4" /> Track
              </Button>
              <a href={linkedInSearch} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800" title="This job has no application link – search for similar live roles">
                <Search className="h-3.5 w-3.5" /> Find similar on LinkedIn
              </a>
            </>
          )}
        </div>
      </div>
      {askTrack && (
        <div className="fade-in mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-50 px-4 py-2.5 text-sm dark:bg-navy-950">
          <span className="text-navy-900 dark:text-navy-100">Did you apply? Track it in your pipeline.</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void track('Applied')} loading={tracking}>Mark as Applied</Button>
            <Button size="sm" variant="ghost" onClick={() => setAskTrack(false)}>Not now</Button>
          </div>
        </div>
      )}
    </article>
  );
}
