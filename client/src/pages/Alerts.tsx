import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, Mail, MessageCircle, Play, Send, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useToast } from '../lib/context';
import { LOCATIONS, ROLE_CATEGORIES } from '../lib/types';
import { notifyNotificationsChanged } from '../components/Layout';
import { Badge, Button, Card, CardHeader, ChipGroup, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Tabs, timeAgo } from '../components/ui';

interface Channel { configured: boolean; verified: boolean; enabled: boolean; active: boolean; detail: string; transport?: string; verifiedAt?: string | null; chatIdSet?: boolean }
interface SettingsResp {
  settings: { enabled: boolean; delivery_time: string; timezone: string; min_match_score: number; roles: string[]; locations: string[]; in_app_enabled: boolean; email_enabled: boolean; telegram_enabled: boolean; telegram_chat_id: string | null; last_digest_on: string | null; last_alert_run_at: string | null };
  channels: { inApp: Channel; email: Channel; telegram: Channel };
  scheduler: { enabled: boolean; running: boolean; timezone: string; collectCron: string; digestCheckCron: string; lastCollectionAt: string | null; nextCollectionAt: string | null };
}
interface Notif { id: string; match_score: number; created_at: string; read_at: string | null; emailed_at: string | null; title: string; company: string; location: string; apply_url: string | null; source_site: string }

function ChannelStatus({ name, icon, c, testable, onTest, testing }: { name: string; icon: React.ReactNode; c: Channel; testable?: 'email' | 'telegram'; onTest?: () => void; testing?: boolean }) {
  const [tone, label] = c.active
    ? (['green', c.transport === 'json' ? 'Active (test transport)' : 'Active'] as const)
    : !c.configured
      ? (['slate', 'Not configured'] as const)
      : !c.enabled
        ? (['slate', 'Disabled'] as const)
        : !c.verified
          ? (['amber', 'Needs a successful test'] as const)
          : (['amber', 'Inactive'] as const);
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800" data-testid={`channel-${name.toLowerCase().replace(/\W+/g, '-')}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">{icon} {name}</p>
        <Badge tone={tone} data-testid="channel-status">{label}</Badge>
      </div>
      <p className="mt-2 text-xs text-slate-500">{c.detail}</p>
      {c.verifiedAt && <p className="mt-1 text-xs text-slate-500">Last successful test: {new Date(c.verifiedAt).toLocaleString()}</p>}
      {testable && (
        <Button size="sm" variant="secondary" className="mt-3" onClick={onTest} loading={testing} disabled={!c.configured} title={!c.configured ? 'Configure this channel on the server first' : undefined} data-testid={`test-${testable}`}>
          <Send className="h-3.5 w-3.5" /> Send test
        </Button>
      )}
    </div>
  );
}

export default function Alerts() {
  const toast = useToast();
  const [tab, setTab] = useState<'inbox' | 'settings' | 'history'>('inbox');
  const notifs = useApi(async () => {
    const r = await api.get<{ notifications: Notif[]; unread: number }>('/notifications', { limit: 100 });
    notifyNotificationsChanged();
    return r;
  });
  const st = useApi(() => api.get<SettingsResp>('/notifications/settings'));
  const history = useApi(() => api.get<{ history: { id: string; channel: string; kind: string; status: string; job_count: number; transport: string | null; detail: string; created_at: string }[] }>('/notifications/history'), [tab]);
  const [form, setForm] = useState<SettingsResp['settings'] | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  useEffect(() => {
    if (st.data) setForm(st.data.settings);
  }, [st.data]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const r = await api.put<Pick<SettingsResp, 'settings' | 'channels'>>('/notifications/settings', {
        enabled: form.enabled, deliveryTime: form.delivery_time, timezone: form.timezone, minMatchScore: Number(form.min_match_score), roles: form.roles,
        locations: form.locations, inAppEnabled: form.in_app_enabled, emailEnabled: form.email_enabled, telegramEnabled: form.telegram_enabled, telegramChatId: form.telegram_chat_id || null,
      });
      st.setData(st.data ? { ...st.data, ...r } : null);
      toast('Alert settings saved');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const test = async (channel: 'email' | 'telegram') => {
    setTesting(channel);
    try {
      const r = await api.post<{ ok: boolean; transport?: string; error?: string; channels: SettingsResp['channels'] }>(`/notifications/test/${channel}`);
      st.setData(st.data ? { ...st.data, channels: r.channels } : null);
      toast(r.transport === 'json' ? 'Test recorded by the test transport (not delivered to an inbox)' : `Test ${channel} sent`);
    } catch (e) {
      toast((e as Error).message, 'error');
      await st.reload();
    } finally {
      setTesting(null);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await api.post<{ alerts: { created: number; considered: number }; delivery: Record<string, string> }>('/notifications/run');
      toast(`${r.alerts.created} new matching job(s) found. Email: ${r.delivery.email}. Telegram: ${r.delivery.telegram}.`, 'info');
      await notifs.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const markAll = async () => {
    await api.post('/notifications/read', {});
    await notifs.reload();
  };

  const s = st.data;
  const anyExternalActive = s && (s.channels.email.active || s.channels.telegram.active);
  return (
    <div>
      <PageHeader
        title="Daily Job Alerts"
        subtitle="New live jobs matching your role, location, experience and minimum score – collected daily and never sent twice."
        actions={<Button onClick={runNow} loading={running} data-testid="run-alerts"><Play className="h-4 w-4" /> Check for new matches now</Button>}
      />
      {s && (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-navy-600" /> Alerts:{' '}
              <Badge tone={s.settings.enabled ? 'green' : 'slate'} data-testid="alerts-enabled">{s.settings.enabled ? 'Enabled' : 'Disabled'}</Badge>
            </span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-navy-600" /> Daily digest at <strong>{s.settings.delivery_time}</strong> ({s.settings.timezone})</span>
            <span className="text-slate-500">Scheduler: {s.scheduler.enabled ? `job collection "${s.scheduler.collectCron}" ${s.scheduler.timezone}` : 'disabled on server'}</span>
            {s.scheduler.lastCollectionAt && <span className="text-slate-500">Last collection {timeAgo(s.scheduler.lastCollectionAt)}</span>}
          </div>
          {!anyExternalActive && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200" data-testid="external-inactive">
              Email and Telegram digests are <strong>not active</strong>. Matches are saved to your in-app inbox. To activate email, configure SMTP on the server and send a successful test from the Settings tab.
            </p>
          )}
        </Card>
      )}

      <Tabs tabs={[{ id: 'inbox', label: `Inbox${notifs.data ? ` (${notifs.data.unread} unread)` : ''}` }, { id: 'settings', label: 'Alert settings' }, { id: 'history', label: 'Delivery history' }] as const} value={tab} onChange={setTab} />

      {tab === 'inbox' && (
        <Card>
          <CardHeader title="Matched jobs" action={notifs.data?.unread ? <Button size="sm" variant="ghost" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button> : undefined} />
          {notifs.error && <div className="p-4"><ErrorBox message={notifs.error} onRetry={notifs.reload} /></div>}
          {notifs.loading && !notifs.data ? (
            <Spinner />
          ) : notifs.data?.notifications.length === 0 ? (
            <EmptyState icon={<Bell className="h-6 w-6" />} title="No alerts yet" text="When the daily job collection finds new live jobs that match your preferences, they appear here. Demo data never triggers alerts." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="notification-list">
              {notifs.data?.notifications.map((n) => (
                <li key={n.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 ${n.read_at ? '' : 'bg-navy-50/50 dark:bg-navy-950/30'}`}>
                  <Badge tone={n.match_score >= 80 ? 'green' : 'navy'}>{n.match_score}%</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{!n.read_at && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-navy-600" aria-label="unread" />}{n.title}</p>
                    <p className="truncate text-xs text-slate-500">{n.company} · {n.location} · via {n.source_site} · {timeAgo(n.created_at)}{n.emailed_at && ' · emailed'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {n.apply_url && (
                      <a href={n.apply_url} target="_blank" rel="noopener noreferrer" onClick={() => void api.post('/notifications/read', { ids: [n.id] }).then(() => notifs.reload())}className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-300">
                        Apply <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button aria-label="Delete notification" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={async () => { await api.del(`/notifications/${n.id}`); await notifs.reload(); }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'settings' && (st.loading && !form ? <Spinner /> : st.error ? <ErrorBox message={st.error} onRetry={st.reload} /> : form && s && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="space-y-5">
              <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-sm font-medium">Enable daily job alerts</span>
                <input type="checkbox" className="h-5 w-5 accent-navy-700" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} data-testid="alerts-toggle" />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Frequency">{(id) => <Select id={id} value="daily" disabled><option value="daily">Daily</option></Select>}</Field>
                <Field label="Delivery time">{(id) => <Input id={id} type="time" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} data-testid="delivery-time" />}</Field>
                <Field label="Timezone">
                  {(id) => (
                    <Select id={id} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                      {['Asia/Kolkata', 'UTC', 'Asia/Singapore', 'Asia/Dubai', 'Europe/London', 'America/New_York'].map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label={`Minimum match score: ${form.min_match_score}%`}>
                {(id) => <input id={id} type="range" min={0} max={100} step={5} value={form.min_match_score} onChange={(e) => setForm({ ...form, min_match_score: Number(e.target.value) })} className="w-full accent-navy-700" data-testid="min-score" />}
              </Field>
              <div><p className="label">Preferred job roles</p><ChipGroup label="Alert roles" options={ROLE_CATEGORIES} value={form.roles} onChange={(roles) => setForm({ ...form, roles })} /></div>
              <div><p className="label">Preferred locations</p><ChipGroup label="Alert locations" options={LOCATIONS} value={form.locations} onChange={(locations) => setForm({ ...form, locations })} /></div>
              <div className="space-y-2">
                <p className="label">Channels</p>
                {[['in_app_enabled', 'In-app notifications'], ['email_enabled', 'Daily email digest'], ['telegram_enabled', 'Telegram (optional)']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-navy-700" checked={form[k as 'in_app_enabled']} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /> {l}
                  </label>
                ))}
              </div>
              {form.telegram_enabled && (
                <Field label="Telegram chat ID" hint="Message your bot, then get your chat ID from @userinfobot. Changing it requires a new test.">
                  {(id) => <Input id={id} value={form.telegram_chat_id ?? ''} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })} placeholder="e.g. 123456789" />}
                </Field>
              )}
              <Button onClick={save} loading={saving} data-testid="save-alert-settings">Save settings</Button>
            </div>
          </Card>
          <div className="space-y-4">
            <ChannelStatus name="In-app" icon={<Bell className="h-4 w-4" />} c={s.channels.inApp} />
            <ChannelStatus name="Email digest" icon={<Mail className="h-4 w-4" />} c={s.channels.email} testable="email" onTest={() => test('email')} testing={testing === 'email'} />
            <ChannelStatus name="Telegram" icon={<MessageCircle className="h-4 w-4" />} c={s.channels.telegram} testable="telegram" onTest={() => test('telegram')} testing={testing === 'telegram'} />
          </div>
        </div>
      ))}

      {tab === 'history' && (
        <Card>
          <CardHeader title="Notification history" subtitle="Every digest and test message with its delivery outcome" />
          {history.loading && !history.data ? <Spinner /> : history.data?.history.length === 0 ? (
            <EmptyState title="No deliveries yet" text="Digests and test messages will be logged here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="history-table">
                <thead className="text-xs text-slate-500 uppercase"><tr><th className="px-5 py-2">When</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Jobs</th><th className="px-3 py-2">Detail</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.data?.history.map((h) => (
                    <tr key={h.id}>
                      <td className="px-5 py-2 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 capitalize">{h.channel}</td>
                      <td className="px-3 py-2">{h.kind}</td>
                      <td className="px-3 py-2"><Badge tone={h.status === 'sent' ? 'green' : h.status === 'failed' ? 'red' : 'amber'}>{h.status}</Badge></td>
                      <td className="px-3 py-2">{h.job_count}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{h.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
