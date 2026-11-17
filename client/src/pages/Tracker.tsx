import { useState } from 'react';
import { Briefcase, CalendarClock, ExternalLink, Pencil, Plus, Search, Trash2, TrendingUp, Trophy, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useToast } from '../lib/context';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../lib/types';
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner, StatCard, Textarea } from '../components/ui';

interface Stats { total: number; submitted: number; interviewsScheduled: number; shortlisted: number; selectionRate: number; responseRate: number; pipeline: { status: string; count: number }[] }

const STATUS_TONE: Record<ApplicationStatus, 'slate' | 'navy' | 'sky' | 'purple' | 'amber' | 'green' | 'red'> = {
  Interested: 'slate', Applied: 'navy', 'Resume Shortlisted': 'sky', 'Interview Scheduled': 'purple', 'Technical Round': 'purple', 'HR Round': 'amber', Selected: 'green', Rejected: 'red',
};

const empty = { company: '', roleTitle: '', jobUrl: '', location: '', status: 'Applied' as ApplicationStatus, appliedOn: new Date().toISOString().slice(0, 10), interviewAt: '', recruiterName: '', recruiterEmail: '', recruiterPhone: '', companyNotes: '', notes: '', jobId: null as string | null };
type FormT = typeof empty;

const toForm = (a: Application): FormT => ({
  company: a.company, roleTitle: a.role_title, jobUrl: a.job_url, location: a.location, status: a.status, appliedOn: a.applied_on ?? '',
  interviewAt: a.interview_at ? new Date(new Date(a.interview_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
  recruiterName: a.recruiter_name, recruiterEmail: a.recruiter_email, recruiterPhone: a.recruiter_phone, companyNotes: a.company_notes, notes: a.notes, jobId: a.job_id,
});

export default function Tracker() {
  const toast = useToast();
  const [filter, setFilter] = useState<ApplicationStatus | ''>('');
  const [q, setQ] = useState('');
  const apps = useApi(() => api.get<{ applications: Application[] }>('/applications', { status: filter || undefined, q: q || undefined }), [filter, q]);
  const stats = useApi(() => api.get<Stats>('/applications/stats'));
  const [editing, setEditing] = useState<{ id: string | null; form: FormT } | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('board');

  const reloadAll = async () => {
    await Promise.all([apps.reload(), stats.reload()]);
  };

  const save = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.company.trim() || !f.roleTitle.trim()) return toast('Company and role are required', 'error');
    setSaving(true);
    try {
      const body = { ...f, appliedOn: f.appliedOn || null, interviewAt: f.interviewAt ? new Date(f.interviewAt).toISOString() : null };
      if (editing.id) await api.put(`/applications/${editing.id}`, body);
      else await api.post('/applications', body);
      toast(editing.id ? 'Application updated' : 'Application added');
      setEditing(null);
      await reloadAll();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (a: Application, status: ApplicationStatus) => {
    try {
      await api.patch(`/applications/${a.id}/status`, { status });
      await reloadAll();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const remove = async (a: Application) => {
    if (!confirm(`Delete the ${a.company} application?`)) return;
    await api.del(`/applications/${a.id}`);
    toast('Application deleted');
    await reloadAll();
  };

  const s = stats.data;
  const set = (p: Partial<FormT>) => editing && setEditing({ ...editing, form: { ...editing.form, ...p } });
  const card = (a: Application) => (
    <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900" data-testid="application-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{a.company}</p>
          <p className="truncate text-xs text-slate-500">{a.role_title}</p>
        </div>
        <div className="flex shrink-0">
          <button aria-label={`Edit ${a.company}`} onClick={() => setEditing({ id: a.id, form: toForm(a) })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-700"><Pencil className="h-3.5 w-3.5" /></button>
          <button aria-label={`Delete ${a.company}`} onClick={() => void remove(a)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {a.interview_at && <p className="mt-2 flex items-center gap-1 text-xs text-violet-700 dark:text-violet-300"><CalendarClock className="h-3 w-3" /> {new Date(a.interview_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>}
      {a.applied_on && <p className="mt-1 text-xs text-slate-500">Applied {a.applied_on}</p>}
      <div className="mt-2 flex items-center gap-2">
        <Select aria-label={`Status for ${a.company}`} value={a.status} onChange={(e) => void setStatus(a, e.target.value as ApplicationStatus)} className="!py-1 text-xs" data-testid="status-select">
          {APPLICATION_STATUSES.map((st) => <option key={st}>{st}</option>)}
        </Select>
        {a.job_url && <a href={a.job_url} target="_blank" rel="noopener noreferrer" aria-label="Open job posting" className="rounded p-1 text-slate-500 hover:text-navy-700"><ExternalLink className="h-4 w-4" /></a>}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Application Tracker" subtitle="Manage every application from interest to offer." actions={<Button onClick={() => setEditing({ id: null, form: { ...empty } })} data-testid="add-application"><Plus className="h-4 w-4" /> Add application</Button>} />
      {s && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard testId="stat-total" label="Total applications" value={s.total} sub={`${s.submitted} submitted`} icon={<Briefcase className="h-5 w-5" />} />
          <StatCard testId="stat-interviews" label="Interviews scheduled" value={s.interviewsScheduled} sub="Upcoming" icon={<CalendarClock className="h-5 w-5" />} tone="purple" />
          <StatCard testId="stat-shortlisted" label="Shortlisted" value={s.shortlisted} sub={`${s.responseRate}% response rate`} icon={<Users className="h-5 w-5" />} tone="sky" />
          <StatCard testId="stat-selection" label="Selection rate" value={`${s.selectionRate}%`} sub="Selected ÷ decided" icon={<Trophy className="h-5 w-5" />} tone="green" />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search applications" placeholder="Search company or role…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value as ApplicationStatus | '')} className="!w-auto">
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((st) => <option key={st}>{st}</option>)}
        </Select>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {(['board', 'list'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-lg px-3 py-1 text-sm capitalize ${view === v ? 'bg-white shadow-sm dark:bg-slate-800' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>
      </div>

      {apps.error && <ErrorBox message={apps.error} onRetry={apps.reload} />}
      {apps.loading && !apps.data ? <Spinner /> : apps.data?.applications.length === 0 ? (
        <Card><EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No applications yet" text="Add applications manually, or use “Apply Now” / “Track” on any job card." action={<Button onClick={() => setEditing({ id: null, form: { ...empty } })}>Add your first application</Button>} /></Card>
      ) : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="pipeline-board">
          {APPLICATION_STATUSES.filter((st) => !filter || st === filter).map((st) => {
            const items = apps.data?.applications.filter((a) => a.status === st) ?? [];
            return (
              <div key={st} className="w-64 shrink-0 rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center justify-between">
                  <Badge tone={STATUS_TONE[st]}>{st}</Badge>
                  <span className="text-xs font-semibold text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2">{items.map(card)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase"><tr><th className="px-5 py-3">Company</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Applied</th><th className="px-3 py-3">Interview</th><th className="px-3 py-3">Recruiter</th><th className="px-3 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apps.data?.applications.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-medium">{a.company}</td>
                  <td className="px-3 py-3">{a.role_title}</td>
                  <td className="px-3 py-3"><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></td>
                  <td className="px-3 py-3 whitespace-nowrap">{a.applied_on ?? '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{a.interview_at ? new Date(a.interview_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-3 py-3">{a.recruiter_name || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button aria-label={`Edit ${a.company}`} onClick={() => setEditing({ id: a.id, form: toForm(a) })} className="rounded p-1 text-slate-400 hover:text-navy-700"><Pencil className="h-4 w-4" /></button>
                    <button aria-label={`Delete ${a.company}`} onClick={() => void remove(a)} className="rounded p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit application' : 'Add application'} wide footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={saving} data-testid="save-application">Save</Button></>}>
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company *">{(id) => <Input id={id} value={editing.form.company} onChange={(e) => set({ company: e.target.value })} data-testid="app-company" />}</Field>
            <Field label="Role *">{(id) => <Input id={id} value={editing.form.roleTitle} onChange={(e) => set({ roleTitle: e.target.value })} data-testid="app-role" />}</Field>
            <Field label="Job URL">{(id) => <Input id={id} type="url" value={editing.form.jobUrl} onChange={(e) => set({ jobUrl: e.target.value })} placeholder="https://" />}</Field>
            <Field label="Location">{(id) => <Input id={id} value={editing.form.location} onChange={(e) => set({ location: e.target.value })} />}</Field>
            <Field label="Status">{(id) => <Select id={id} value={editing.form.status} onChange={(e) => set({ status: e.target.value as ApplicationStatus })} data-testid="app-status">{APPLICATION_STATUSES.map((st) => <option key={st}>{st}</option>)}</Select>}</Field>
            <Field label="Applied on">{(id) => <Input id={id} type="date" value={editing.form.appliedOn} onChange={(e) => set({ appliedOn: e.target.value })} />}</Field>
            <Field label="Interview date & time">{(id) => <Input id={id} type="datetime-local" value={editing.form.interviewAt} onChange={(e) => set({ interviewAt: e.target.value })} data-testid="app-interview" />}</Field>
            <Field label="Recruiter name">{(id) => <Input id={id} value={editing.form.recruiterName} onChange={(e) => set({ recruiterName: e.target.value })} />}</Field>
            <Field label="Recruiter email">{(id) => <Input id={id} type="email" value={editing.form.recruiterEmail} onChange={(e) => set({ recruiterEmail: e.target.value })} />}</Field>
            <Field label="Recruiter phone">{(id) => <Input id={id} type="tel" value={editing.form.recruiterPhone} onChange={(e) => set({ recruiterPhone: e.target.value })} />}</Field>
            <div className="sm:col-span-2"><Field label="Company information">{(id) => <Textarea id={id} rows={2} value={editing.form.companyNotes} onChange={(e) => set({ companyNotes: e.target.value })} placeholder="Product, team, tech stack, interview process…" />}</Field></div>
            <div className="sm:col-span-2"><Field label="Notes">{(id) => <Textarea id={id} rows={3} value={editing.form.notes} onChange={(e) => set({ notes: e.target.value })} data-testid="app-notes" />}</Field></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
