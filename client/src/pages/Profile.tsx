import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, useToast } from '../lib/context';
import { IT_ROLES, LOCATIONS, QA_ROLES, type User } from '../lib/types';
import { Button, Card, CardHeader, ChipGroup, Field, Input, PageHeader, TagInput, Textarea, RoleChips } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [p, setP] = useState(user!.profile);
  const [pr, setPr] = useState(user!.preferences);
  const [busy, setBusy] = useState<'profile' | 'prefs' | null>(null);
  const extraLocations = pr.locations.filter((l) => !(LOCATIONS as readonly string[]).includes(l));

  const saveProfile = async () => {
    setBusy('profile');
    try {
      const r = await api.put<{ user: User }>('/profile', p);
      setUser(r.user);
      toast('Profile saved');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const savePrefs = async () => {
    setBusy('prefs');
    try {
      const r = await api.put<{ user: User }>('/profile/preferences', pr);
      setUser(r.user);
      toast('Job preferences saved');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Used for job matching, alerts, resume suggestions and study plans." />
      <Card>
        <CardHeader title="Professional profile" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name">{(id) => <Input id={id} value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} data-testid="profile-name" />}</Field>
          <Field label="Email">{(id) => <Input id={id} value={user!.email} disabled />}</Field>
          <Field label="Current role">{(id) => <Input id={id} value={p.currentRole} onChange={(e) => setP({ ...p, currentRole: e.target.value })} />}</Field>
          <Field label="Total experience (years)">{(id) => <Input id={id} type="number" step="0.5" min={0} max={60} value={p.totalExperience} onChange={(e) => setP({ ...p, totalExperience: Number(e.target.value) })} data-testid="profile-exp" />}</Field>
          <Field label="Current company">{(id) => <Input id={id} value={p.currentCompany} onChange={(e) => setP({ ...p, currentCompany: e.target.value })} />}</Field>
          <Field label="Current location">{(id) => <Input id={id} value={p.currentLocation} onChange={(e) => setP({ ...p, currentLocation: e.target.value })} />}</Field>
          <Field label="Expected salary (LPA)">{(id) => <Input id={id} type="number" min={0} value={p.expectedSalaryLpa ?? ''} onChange={(e) => setP({ ...p, expectedSalaryLpa: e.target.value === '' ? null : Number(e.target.value) })} />}</Field>
          <Field label="Notice period (days)">{(id) => <Input id={id} type="number" min={0} max={365} value={p.noticePeriodDays ?? ''} onChange={(e) => setP({ ...p, noticePeriodDays: e.target.value === '' ? null : Number(e.target.value) })} />}</Field>
          <div className="sm:col-span-2"><Field label="LinkedIn profile">{(id) => <Input id={id} type="url" placeholder="https://www.linkedin.com/in/…" value={p.linkedinUrl} onChange={(e) => setP({ ...p, linkedinUrl: e.target.value })} />}</Field></div>
          <div className="sm:col-span-2"><Field label="Technical skills" hint="Press Enter or comma to add">{(id) => <TagInput id={id} value={p.technicalSkills} onChange={(technicalSkills) => setP({ ...p, technicalSkills })} placeholder="Add a skill…" />}</Field></div>
          <div className="sm:col-span-2"><Field label="Industry experience">{(id) => <TagInput id={id} value={p.industries} onChange={(industries) => setP({ ...p, industries })} placeholder="Add an industry…" />}</Field></div>
          <div className="sm:col-span-2"><Field label="Previous projects">{(id) => <Textarea id={id} rows={4} value={p.projects} onChange={(e) => setP({ ...p, projects: e.target.value })} placeholder="e.g. Payment gateway QA – tested authorization, settlement and refund flows…" />}</Field></div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:col-span-2 dark:bg-slate-800/50">
            <p className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-navy-600" /> Resume: {user!.latestResume ? user!.latestResume.filename : 'not uploaded'}</p>
            <Link to="/resume" className="text-sm font-medium text-navy-700 hover:underline dark:text-navy-300">{user!.latestResume ? 'Manage resumes' : 'Upload resume'}</Link>
          </div>
          <div className="sm:col-span-2"><Button onClick={saveProfile} loading={busy === 'profile'} data-testid="save-profile">Save profile</Button></div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Job preferences" subtitle="Choose any IT roles – QA, development, data, DevOps, cloud, security and more. Used for AI Job Matching and alerts." />
        <div className="space-y-5 p-5">
          <div><p className="label">Preferred job roles</p><RoleChips label="Preferred roles" qa={QA_ROLES} it={IT_ROLES} value={pr.roles} onChange={(roles) => setPr({ ...pr, roles })} /></div>
          <div><p className="label">Preferred locations</p><ChipGroup label="Preferred locations" options={[...LOCATIONS, ...extraLocations]} value={pr.locations} onChange={(locations) => setPr({ ...pr, locations })} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Min experience">{(id) => <Input id={id} type="number" min={0} max={40} value={pr.minExperience} onChange={(e) => setPr({ ...pr, minExperience: Number(e.target.value) })} data-testid="pref-min" />}</Field>
            <Field label="Max experience">{(id) => <Input id={id} type="number" min={0} max={40} value={pr.maxExperience} onChange={(e) => setPr({ ...pr, maxExperience: Number(e.target.value) })} data-testid="pref-max" />}</Field>
            <Field label="Min salary (LPA)">{(id) => <Input id={id} type="number" min={0} value={pr.minSalaryLpa ?? ''} onChange={(e) => setPr({ ...pr, minSalaryLpa: e.target.value === '' ? null : Number(e.target.value) })} />}</Field>
          </div>
          <Field label="Preferred industries">{(id) => <TagInput id={id} value={pr.industries} onChange={(industries) => setPr({ ...pr, industries })} />}</Field>
          <div><p className="label">Job types</p><ChipGroup label="Job types" options={['Full time', 'Contract', 'Part time']} value={pr.jobTypes} onChange={(jobTypes) => setPr({ ...pr, jobTypes })} /></div>
          <Button onClick={savePrefs} loading={busy === 'prefs'} data-testid="save-preferences">Save preferences</Button>
        </div>
      </Card>
    </div>
  );
}
