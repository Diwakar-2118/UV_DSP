import { useNavigate } from 'react-router-dom';
import { Bot, Database, Mail, Moon, MessageCircle, Plug, Shield, Sun, Timer } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useAuth, useTheme, useToast } from '../lib/context';
import { Badge, Button, Card, CardHeader, ErrorBox, Spinner, timeAgo } from '../components/ui';

interface Status {
  database: string;
  authProvider: string;
  ai: { configured: boolean; model: string | null; detail: string };
  email: { configured: boolean; transport: string; detail: string };
  telegram: { configured: boolean };
  scheduler: { enabled: boolean; running: boolean; timezone: string; collectCron: string; digestCheckCron: string; lastCollectionAt: string | null; nextCollectionAt: string | null };
  liveSourcesEnabled: boolean;
}
interface Source { id: string; name: string; kind: string; website: string; description: string; enabled: boolean; requires_credentials: boolean; is_live: boolean; last_run_at: string | null; last_status: string | null; last_error: string | null; last_fetched: number; last_relevant?: number; last_inserted: number; active_jobs: number }

export default function SettingsPage() {
  const { theme, set } = useTheme();
  const { logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const status = useApi(() => api.get<Status>('/system/status'));
  const sources = useApi(() => api.get<{ sources: Source[]; liveSourcesEnabled: boolean }>('/jobs/sources'));

  const toggleSource = async (s: Source) => {
    try {
      await api.patch(`/jobs/sources/${s.id}`, { enabled: !s.enabled });
      await sources.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Permanently delete your account, resumes, applications and all data? This cannot be undone.')) return;
    await api.del('/auth/account');
    await logout();
    nav('/login');
  };

  const st = status.data;
  const row = (icon: React.ReactNode, name: string, ok: boolean, okText: string, detail: string, testId: string) => (
    <li className="flex items-start gap-3 px-5 py-3" data-testid={testId}>
      <div className="mt-0.5 text-navy-600">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <Badge tone={ok ? 'green' : 'amber'}>{ok ? okText : 'Not configured'}</Badge>
    </li>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader title="Appearance" />
        <div className="flex gap-2 p-5">
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => set('light')}><Sun className="h-4 w-4" /> Light</Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => set('dark')}><Moon className="h-4 w-4" /> Dark</Button>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Plug className="h-5 w-5" />} title="Integrations" subtitle="Configured on the server via environment variables – keys are never sent to the browser." />
        {status.loading && !st ? <Spinner /> : status.error ? <div className="p-5"><ErrorBox message={status.error} /></div> : st && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {row(<Database className="h-4 w-4" />, 'Database', true, 'Connected', `${st.database} · auth: ${st.authProvider}`, 'int-db')}
            {row(<Bot className="h-4 w-4" />, 'OpenAI', st.ai.configured, st.ai.model ?? 'Connected', st.ai.detail, 'int-ai')}
            {row(<Mail className="h-4 w-4" />, 'Email (SMTP)', st.email.configured, st.email.transport === 'json' ? 'Test transport' : 'Configured', st.email.detail, 'int-email')}
            {row(<MessageCircle className="h-4 w-4" />, 'Telegram bot', st.telegram.configured, 'Configured', st.telegram.configured ? 'Bot token set – add your chat ID in Daily Job Alerts' : 'Set TELEGRAM_BOT_TOKEN to enable', 'int-telegram')}
            {row(<Timer className="h-4 w-4" />, 'Scheduler', st.scheduler.enabled, 'Running', `Job collection "${st.scheduler.collectCron}" · digest check "${st.scheduler.digestCheckCron}" (${st.scheduler.timezone})${st.scheduler.lastCollectionAt ? ` · last run ${timeAgo(st.scheduler.lastCollectionAt)}` : ''}`, 'int-scheduler')}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader icon={<Shield className="h-5 w-5" />} title="Job sources" subtitle="Only official APIs, authorised feeds and deep links – no scraping, CAPTCHA or login bypass." />
        {sources.data && !sources.data.liveSourcesEnabled && <p className="mx-5 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Live sources are disabled on the server (ENABLE_LIVE_SOURCES=false).</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="sources-list">
          {sources.data?.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <Badge tone={s.kind === 'search_link' ? 'slate' : 'navy'}>{s.kind === 'search_link' ? 'Deep links only' : s.kind === 'career_page' ? 'Career pages API' : s.kind === 'user' ? 'Added by you' : 'API'}</Badge>
                  {s.requires_credentials && <Badge>needs API key</Badge>}
                  {s.last_status && <Badge tone={s.last_status === 'ok' ? 'green' : s.last_status === 'error' ? 'red' : 'slate'}>{s.last_status}</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{s.description}</p>
                {s.kind !== 'search_link' && (
                  <p className="mt-1 text-xs text-slate-500">
                    {s.active_jobs} active job(s){s.last_run_at && ` · last run ${timeAgo(s.last_run_at)}: fetched ${s.last_fetched}, QA roles ${s.last_relevant ?? 0}, new ${s.last_inserted}`}
                    {s.last_error && <span className="text-amber-700"> · {s.last_error}</span>}
                  </p>
                )}
              </div>
              {s.kind !== 'search_link' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-navy-700" checked={s.enabled} onChange={() => void toggleSource(s)} aria-label={`Enable ${s.name}`} /> Enabled
                </label>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Privacy & account" />
        <div className="space-y-3 p-5 text-sm">
          <p className="text-slate-600 dark:text-slate-400">Resumes are stored in your account only and served exclusively to you. Deleting your account removes all your data.</p>
          <Button variant="danger" onClick={deleteAccount} data-testid="delete-account">Delete account</Button>
        </div>
      </Card>
    </div>
  );
}
