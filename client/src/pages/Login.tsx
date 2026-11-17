import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Briefcase, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../lib/context';
import { Button, Field, Input } from '../components/ui';

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'register' && form.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else {
        const r = await register(form.fullName, form.email, form.password);
        if (r.needsEmailConfirmation) {
          setInfo(r.message ?? 'Check your inbox to confirm your email.');
          setMode('login');
          return;
        }
      }
      nav(loc.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">CareerPilot AI</span>
        </div>
        <div>
          <h1 className="text-4xl leading-tight font-bold">
            Find Opportunities.
            <br />
            Prepare Smarter.
            <br />
            <span className="text-navy-300">Get Hired.</span>
          </h1>
          <p className="mt-4 max-w-md text-navy-100">Your personal AI career assistant for QA, API, automation, performance and fintech testing roles in Bengaluru, Hyderabad and remote.</p>
          <ul className="mt-8 grid max-w-md grid-cols-2 gap-4 text-sm">
            {[
              [Target, 'Transparent job match scores'],
              [Bell, 'Daily job alerts'],
              [BookOpen, 'Fintech interview prep'],
              [Briefcase, 'Application tracking'],
            ].map(([Icon, t]) => {
              const I = Icon as typeof Target;
              return (
                <li key={t as string} className="flex items-center gap-2 text-navy-100">
                  <I className="h-4 w-4 text-navy-300" /> {t as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-navy-300">Jobs come only from official APIs and authorised feeds.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-navy-900 dark:text-white">CareerPilot AI</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Find Opportunities. Prepare Smarter. Get Hired.</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Sign in to continue your job search.' : 'Your QA & fintech preferences are pre-filled – edit them anytime.'}</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === 'register' && (
              <Field label="Full name">
                {(id) => <Input id={id} name="fullName" autoComplete="name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />}
              </Field>
            )}
            <Field label="Email">
              {(id) => <Input id={id} name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
            </Field>
            <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
              {(id) => (
                <Input id={id} name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              )}
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
            {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
            <Button type="submit" loading={busy} className="w-full">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              className="font-semibold text-navy-700 hover:underline dark:text-navy-300"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
