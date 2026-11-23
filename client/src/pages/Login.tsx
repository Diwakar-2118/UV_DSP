import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Briefcase, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../lib/context';
import LoginScene from '../components/LoginScene';

const FEATURES = [
  [Target, 'Transparent job match scores'],
  [Bell, 'Daily job alerts'],
  [BookOpen, 'Fintech interview prep'],
  [Briefcase, 'Application tracking'],
] as const;

const inputCls =
  'w-full rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 focus:outline-none';

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

  const Pill = () => (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
      </span>
      Multi-Platform Job Discovery
    </span>
  );

  const formCard = (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-white">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p className="mt-1 text-sm text-slate-400">{mode === 'login' ? 'Sign in to continue your job search.' : 'Your QA & fintech preferences are pre-filled – edit them anytime.'}</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode === 'register' && (
          <div>
            <label htmlFor="cp-name" className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Full name</label>
            <input id="cp-name" name="fullName" autoComplete="name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
          </div>
        )}
        <div>
          <label htmlFor="cp-email" className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Email</label>
          <input id="cp-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label htmlFor="cp-password" className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Password</label>
          <input id="cp-password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          {mode === 'register' && <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>}
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/70 px-3 py-2 text-sm text-red-200">{error}</p>}
        {info && <p className="rounded-lg border border-emerald-500/40 bg-emerald-950/70 px-3 py-2 text-sm text-emerald-200">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.3)] transition hover:brightness-110 disabled:opacity-60"
        >
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" aria-hidden />}
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
        <button className="font-semibold text-white hover:text-amber-300 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {mode === 'login' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060a1e] text-white">
      {/* One deep-space midnight tone, gently lifted around the Earth and darkened at the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,#121c45_0%,#0a1130_45%,#060a1e_100%)] max-xl:bg-[radial-gradient(ellipse_90%_45%_at_50%_22%,#121c45_0%,#0a1130_50%,#060a1e_100%)]" />

      {/* One responsive tree: stacked on mobile, full-bleed scene with overlays on large screens. */}
      <header className="relative z-10 flex items-center gap-3 px-5 pt-5 xl:absolute xl:top-6 xl:left-8 xl:p-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur"><Sparkles className="h-5 w-5" /></div>
        <span className="font-bold">CareerPilot AI</span>
      </header>

      <div className="relative mt-2 h-56 sm:h-72 md:h-96 xl:absolute xl:inset-0 xl:mt-0 xl:h-auto">
        <LoginScene fit="meet" className="absolute inset-0 h-full w-full xl:hidden" />
        <LoginScene className="absolute inset-0 hidden h-full w-full xl:block" />
      </div>

      <section className="relative z-10 px-5 text-center xl:absolute xl:text-left xl:top-1/2 xl:left-8 xl:w-[min(460px,32vw)] xl:-translate-y-1/2 xl:px-0 2xl:left-10">
        <Pill />
        <h1 className="mt-3 text-2xl leading-tight font-bold xl:mt-5 xl:text-4xl 2xl:text-[2.6rem]">
          Find Opportunities.
          <br className="hidden xl:block" /> Prepare Smarter.
          <br className="hidden xl:block" />{' '}
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">Get Hired.</span>
        </h1>
        <ul className="mt-7 hidden grid-cols-2 gap-x-5 gap-y-3 text-sm xl:grid">
          {FEATURES.map(([Icon, t]) => (
            <li key={t} className="flex items-center gap-2 text-slate-100"><Icon className="h-4 w-4 shrink-0 text-amber-300" /> {t}</li>
          ))}
        </ul>
      </section>

      <p className="absolute bottom-6 left-8 z-10 hidden text-xs text-slate-400 xl:block">Jobs come only from official APIs and authorised feeds; other boards open in their own search.</p>

      <div className="relative z-10 flex justify-center px-5 py-8 xl:absolute xl:top-1/2 xl:right-[6%] xl:block xl:w-[min(380px,26vw)] xl:-translate-y-1/2 xl:rounded-2xl xl:border xl:border-amber-200/10 xl:bg-[#070b20]/70 xl:p-7 xl:shadow-2xl xl:backdrop-blur-md 2xl:right-[8%]">
        {formCard}
      </div>
    </div>
  );
}
