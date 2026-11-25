import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Briefcase, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../lib/context';
import ParticleChakra from '../components/ParticleChakra';

const FEATURES = [
  [Target, 'Transparent job match scores'],
  [Bell, 'Daily job alerts'],
  [BookOpen, 'Fintech interview prep'],
  [Briefcase, 'Application tracking'],
] as const;

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 transition focus:border-amber-200/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-amber-200/10 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-medium text-white/60';

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

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white selection:bg-amber-200/30">
      {/* Interactive stardust Sudarshana Chakra fills the background */}
      <ParticleChakra className="absolute inset-0 h-full w-full touch-pan-y lg:touch-none" />
      {/* Soft vignette keeps the text and card readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)]" />

      <header className="pointer-events-none relative z-10 flex items-center gap-2.5 px-6 pt-6 lg:absolute lg:top-8 lg:left-[7%] lg:p-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/30 bg-amber-200/10">
          <Sparkles className="h-4 w-4 text-amber-200" />
        </div>
        <span className="text-sm font-semibold tracking-[0.2em] text-white/85 uppercase">CareerPilot AI</span>
      </header>

      <main className="pointer-events-none relative z-10 flex min-h-screen flex-col px-6 pb-10 lg:block lg:pb-0">
        {/* Left: headline. Click-through so the stars underneath stay interactive. */}
        <section className="mt-[34vh] text-center lg:absolute lg:top-1/2 lg:left-[7%] lg:mt-0 lg:w-[min(440px,30vw)] lg:-translate-y-1/2 lg:text-left">
          <h1 className="text-3xl leading-[1.1] font-light tracking-tight text-white sm:text-4xl xl:text-5xl">
            Find Opportunities.
            <br />
            Prepare Smarter.
            <br />
            <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-orange-300 bg-clip-text font-normal text-transparent">Get Hired.</span>
          </h1>
          <ul className="mt-7 hidden flex-wrap gap-2 lg:flex">
            {FEATURES.map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm">
                <Icon className="h-3.5 w-3.5 text-amber-200/80" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-8 hidden text-[11px] tracking-wide text-white/35 lg:block">Move to stir the stars · click to send a pulse · drag to tilt the Chakram</p>
        </section>

        {/* Right: auth card */}
        <div className="mt-8 flex justify-center lg:absolute lg:top-1/2 lg:right-[7%] lg:mt-0 lg:block lg:-translate-y-1/2">
          <div className="pointer-events-auto relative w-full max-w-[400px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-8 lg:w-[400px]">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />

            {/* Segmented switch */}
            <div className="relative grid grid-cols-2 rounded-full border border-white/10 bg-black/40 p-1 text-sm" role="tablist">
              <span
                className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white/10 transition-transform duration-300 ${mode === 'register' ? 'translate-x-full' : ''}`}
                aria-hidden
              />
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative z-10 rounded-full py-2 font-medium transition ${mode === m ? 'text-white' : 'text-white/45 hover:text-white/70'}`}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <h2 className="mt-7 text-2xl font-light tracking-tight">{mode === 'login' ? 'Welcome back' : 'Begin your journey'}</h2>
            <p className="mt-1 text-sm text-white/45">
              {mode === 'login' ? 'Sign in to continue your job search.' : 'Your QA & fintech preferences are pre-filled – edit them anytime.'}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="cp-name" className={labelCls}>Full name</label>
                  <input id="cp-name" name="fullName" autoComplete="name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
                </div>
              )}
              <div>
                <label htmlFor="cp-email" className={labelCls}>Email</label>
                <input id="cp-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label htmlFor="cp-password" className={labelCls}>Password</label>
                <input
                  id="cp-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                />
                {mode === 'register' && <p className="mt-1.5 text-xs text-white/35">At least 8 characters</p>}
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
              {info && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{info}</p>}
              <button
                type="submit"
                disabled={busy}
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 px-4 py-3 text-sm font-semibold text-black shadow-[0_0_40px_-8px_rgba(253,230,138,0.6)] transition hover:shadow-[0_0_50px_-6px_rgba(253,230,138,0.8)] hover:brightness-105 disabled:opacity-60"
              >
                {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />}
                {mode === 'login' ? 'Sign in' : 'Create account'}
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-white/30">Jobs come only from official APIs and authorised feeds; other boards open in their own search.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
