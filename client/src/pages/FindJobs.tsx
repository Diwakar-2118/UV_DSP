import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Filter, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useAuth, useToast } from '../lib/context';
import { LOCATIONS, ROLE_CATEGORIES, type Job, type JobSearchResponse } from '../lib/types';
import JobCard from '../components/JobCard';
import { Badge, Button, Card, ChipGroup, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner } from '../components/ui';

export interface JobFilters {
  q: string;
  roles: string[];
  locations: string[];
  expMin: string;
  expMax: string;
  company: string;
  industry: string;
  skills: string;
  salaryMin: string;
  jobType: string;
  postedWithinDays: string;
  minMatch: string;
  sort: 'latest' | 'match' | 'experience' | 'company';
  includeDemo: 'auto' | 'true' | 'false';
  savedOnly: boolean;
}

export const defaultFilters = (roles: string[] = [...ROLE_CATEGORIES], locations: string[] = [...LOCATIONS], min = 3, max = 5): JobFilters => ({
  q: '', roles, locations, expMin: String(min), expMax: String(max), company: '', industry: '', skills: '', salaryMin: '', jobType: '',
  postedWithinDays: '30', minMatch: '', sort: 'latest', includeDemo: 'auto', savedOnly: false,
});

export function useJobSearch(filters: JobFilters, page: number) {
  return useApi(
    () =>
      api.get<JobSearchResponse>('/jobs', {
        q: filters.q, roles: filters.roles, locations: filters.locations, expMin: filters.expMin, expMax: filters.expMax, company: filters.company,
        industry: filters.industry, skills: filters.skills ? filters.skills.split(',').map((s) => s.trim()) : undefined, salaryMin: filters.salaryMin,
        jobType: filters.jobType, postedWithinDays: filters.postedWithinDays, minMatch: filters.minMatch, sort: filters.sort,
        includeDemo: filters.includeDemo === 'auto' ? undefined : filters.includeDemo, savedOnly: filters.savedOnly ? 'true' : undefined, page, pageSize: 15,
      }),
    [JSON.stringify(filters), page],
  );
}

function ExternalBoards({ filters }: { filters: JobFilters }) {
  const keywords = filters.q || (filters.roles.length === 1 ? `${filters.roles[0]} Engineer`.replace('QA Engineer Engineer', 'QA Engineer') : 'QA Engineer');
  const [loc, setLoc] = useState<string>(filters.locations[0] ?? 'Bengaluru');
  const { data } = useApi(() => api.get<{ links: { id: string; name: string; url: string }[] }>('/jobs/search-links', { keywords, location: loc, days: filters.postedWithinDays || 7, expMin: filters.expMin || 3 }), [keywords, loc, filters.postedWithinDays, filters.expMin]);
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Search on job boards without a public API</p>
      <p className="mt-0.5 text-xs text-slate-500">Opens each site's own search with your filters – no scraping. Results appear on that site.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select aria-label="Board search location" value={loc} onChange={(e) => setLoc(e.target.value)} className="!w-auto py-1.5 text-xs">
          {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </Select>
        {data?.links.map((l) => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-navy-400 hover:text-navy-800 dark:border-slate-700 dark:text-slate-300">
            {l.name} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </Card>
  );
}

export function FiltersPanel({ f, set, onReset }: { f: JobFilters; set: (p: Partial<JobFilters>) => void; onReset: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="label">Job roles</p>
        <ChipGroup label="Job roles" options={ROLE_CATEGORIES} value={f.roles} onChange={(roles) => set({ roles })} />
      </div>
      <div>
        <p className="label">Locations</p>
        <ChipGroup label="Locations" options={LOCATIONS} value={f.locations} onChange={(locations) => set({ locations })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min exp (yrs)">{(id) => <Input id={id} type="number" min={0} max={30} value={f.expMin} onChange={(e) => set({ expMin: e.target.value })} />}</Field>
        <Field label="Max exp (yrs)">{(id) => <Input id={id} type="number" min={0} max={30} value={f.expMax} onChange={(e) => set({ expMax: e.target.value })} />}</Field>
      </div>
      <Field label="Date posted">
        {(id) => (
          <Select id={id} value={f.postedWithinDays} onChange={(e) => set({ postedWithinDays: e.target.value })}>
            <option value="1">Today</option>
            <option value="3">Last 3 days</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </Select>
        )}
      </Field>
      <Field label="Minimum match">
        {(id) => (
          <Select id={id} value={f.minMatch} onChange={(e) => set({ minMatch: e.target.value })}>
            <option value="">Any</option>
            <option value="70">70%+</option>
            <option value="80">80%+</option>
            <option value="90">90%+</option>
          </Select>
        )}
      </Field>
      <Field label="Company">{(id) => <Input id={id} value={f.company} placeholder="e.g. Razorpay" onChange={(e) => set({ company: e.target.value })} />}</Field>
      <Field label="Industry">
        {(id) => (
          <Select id={id} value={f.industry} onChange={(e) => set({ industry: e.target.value })}>
            <option value="">Any</option>
            <option>Fintech</option>
            <option>Banking</option>
            <option>Insurance</option>
            <option>Software</option>
          </Select>
        )}
      </Field>
      <Field label="Required skills" hint="Comma separated, e.g. Postman, SQL">{(id) => <Input id={id} value={f.skills} onChange={(e) => set({ skills: e.target.value })} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min salary (LPA)">{(id) => <Input id={id} type="number" min={0} value={f.salaryMin} onChange={(e) => set({ salaryMin: e.target.value })} />}</Field>
        <Field label="Job type">
          {(id) => (
            <Select id={id} value={f.jobType} onChange={(e) => set({ jobType: e.target.value })}>
              <option value="">Any</option>
              <option value="full">Full time</option>
              <option value="contract">Contract</option>
              <option value="part">Part time</option>
            </Select>
          )}
        </Field>
      </div>
      <Field label="Data source">
        {(id) => (
          <Select id={id} value={f.includeDemo} onChange={(e) => set({ includeDemo: e.target.value as JobFilters['includeDemo'] })}>
            <option value="auto">Live listings (demo only if none)</option>
            <option value="false">Live listings only</option>
            <option value="true">Live + demo data</option>
          </Select>
        )}
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.savedOnly} onChange={(e) => set({ savedOnly: e.target.checked })} className="h-4 w-4 rounded accent-navy-700" /> Saved jobs only
      </label>
      <Button variant="ghost" size="sm" onClick={onReset} className="w-full">
        Reset filters
      </Button>
    </div>
  );
}

export default function FindJobs({ preset }: { preset?: Partial<JobFilters> }) {
  const { user } = useAuth();
  const toast = useToast();
  const base = useMemo(
    () => ({ ...defaultFilters(user?.preferences.roles, user?.preferences.locations, user?.preferences.minExperience, user?.preferences.maxExperience), ...preset }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );
  const [f, setF] = useState<JobFilters>(base);
  const [query, setQuery] = useState(f.q);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const set = (p: Partial<JobFilters>) => {
    setF((prev) => ({ ...prev, ...p }));
    setPage(1);
  };
  useEffect(() => {
    const t = setTimeout(() => query !== f.q && set({ q: query }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const { data, error, loading, reload, setData } = useJobSearch(f, page);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await api.post<{ sources: { source: string; status: string; detail?: string; stats?: { inserted: number } }[]; alerts: { created: number } }>('/jobs/refresh');
      const ok = r.sources.filter((s) => s.status === 'ok' && s.source !== 'demo');
      const added = ok.reduce((a, s) => a + (s.stats?.inserted ?? 0), 0);
      toast(ok.length ? `Fetched from ${ok.length} live source(s): ${added} new job(s), ${r.alerts.created} new alert(s)` : 'No live source returned data – check Settings → Job sources', ok.length ? 'success' : 'info');
      await reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const updateJob = (j: Job) => data && setData({ ...data, jobs: data.jobs.map((x) => (x.id === j.id ? j : x)) });
  const pages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <PageHeader
        title={preset?.sort === 'match' ? 'AI Job Matching' : 'Find Jobs'}
        subtitle={preset?.sort === 'match' ? 'Jobs ranked by a transparent compatibility score: skills 40% · experience 25% · industry 20% · location 15%.' : 'QA & fintech roles from authorised sources, matched to your profile.'}
        actions={
          <Button variant="secondary" onClick={refresh} loading={refreshing} data-testid="refresh-jobs">
            <RefreshCw className="h-4 w-4" /> Fetch latest jobs
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className={showFilters ? 'block' : 'hidden lg:block'}>
          <Card className="p-4 lg:sticky lg:top-20">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4" /> Filters</p>
              <button className="rounded p-1 lg:hidden" onClick={() => setShowFilters(false)} aria-label="Close filters"><X className="h-4 w-4" /></button>
            </div>
            <FiltersPanel f={f} set={set} onReset={() => { setF(base); setQuery(''); setPage(1); }} />
          </Card>
        </aside>
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input aria-label="Search jobs" placeholder="Search title, company or keyword…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" data-testid="job-search" />
            </div>
            <Select aria-label="Sort by" value={f.sort} onChange={(e) => set({ sort: e.target.value as JobFilters['sort'] })} className="!w-auto" data-testid="sort-select">
              <option value="latest">Latest jobs</option>
              <option value="match">Highest match</option>
              <option value="experience">Experience relevance</option>
              <option value="company">Company name</option>
            </Select>
            <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </div>

          {data && !data.liveAvailable && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" data-testid="demo-banner">
              <strong>Showing demo data.</strong> No live source has returned jobs yet. Demo listings use fictional companies, are marked <Badge tone="amber">DEMO DATA</Badge>, and are never sent as alerts. Click “Fetch latest jobs” or configure sources in Settings.
            </div>
          )}

          <ExternalBoards filters={f} />

          {error && <ErrorBox message={error} onRetry={reload} />}
          {loading && !data ? (
            <Spinner label="Finding matching jobs…" />
          ) : data && data.jobs.length === 0 ? (
            <Card>
              <EmptyState icon={<Search className="h-6 w-6" />} title="No jobs match these filters" text="Widen the date range, lower the minimum match, or include more roles and locations." action={<Button variant="secondary" onClick={() => setF(base)}>Reset filters</Button>} />
            </Card>
          ) : (
            data && (
              <>
                <p className="text-sm text-slate-500" data-testid="results-count">
                  {data.total} job{data.total === 1 ? '' : 's'} found {data.includeDemo && data.liveAvailable && '· including demo data'}
                </p>
                <div className={loading ? 'space-y-4 opacity-60 transition' : 'space-y-4'}>
                  {data.jobs.map((j) => <JobCard key={j.id} job={j} onChange={updateJob} />)}
                </div>
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <span className="text-sm text-slate-500">Page {page} of {pages}</span>
                    <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                )}
              </>
            )
          )}
        </section>
      </div>
    </div>
  );
}
