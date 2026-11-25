import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  Bell, BookOpen, Briefcase, Building2, ChevronDown, FileText, LayoutDashboard, LogOut, Map, Menu, MessagesSquare, Moon, Search, Settings, Sparkles, Sun, Target, User, X,
} from 'lucide-react';
import { useAuth, useTheme } from '../lib/context';
import { api } from '../lib/api';

/** Fired whenever notifications change so the header badge stays in sync. */
export const NOTIFICATIONS_CHANGED = 'cp:notifications-changed';
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Find Jobs', icon: Search },
  { to: '/alerts', label: 'Daily Job Alerts', icon: Bell },
  { to: '/matching', label: 'AI Job Matching', icon: Target },
  { to: '/prep', label: 'Interview Preparation', icon: BookOpen },
  { to: '/mock-interview', label: 'AI Mock Interview', icon: MessagesSquare },
  { to: '/companies', label: 'Company Interview Questions', icon: Building2 },
  { to: '/resume', label: 'Resume Analyzer', icon: FileText },
  { to: '/tracker', label: 'Application Tracker', icon: Briefcase },
  { to: '/roadmap', label: 'Career Roadmap', icon: Map },
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-950 text-white shadow-sm">
        <Sparkles className="h-5 w-5" aria-hidden />
      </div>
      <div className="leading-tight">
        <div className="font-bold text-navy-900 dark:text-white">CareerPilot AI</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400">Find. Prepare. Get Hired.</div>
      </div>
    </Link>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-navy-900 text-white shadow-sm dark:bg-navy-700' : 'text-slate-600 hover:bg-navy-50 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
            )
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Account menu in the header: profile, settings and sign out. */
function UserMenu({ initials, name, email, onLogout }: { initials: string; name: string; email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        data-testid="user-menu"
        className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-800 dark:bg-navy-900 dark:text-navy-100">{initials}</span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block" data-testid="user-name">{name}</span>
        <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="fade-in absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
            {email && email !== name && <p className="truncate text-xs text-slate-500">{email}</p>}
          </div>
          <div className="py-1">
            <Link role="menuitem" to="/profile" className={item}><User className="h-4 w-4" aria-hidden /> My Profile</Link>
            <Link role="menuitem" to="/settings" className={item}><Settings className="h-4 w-4" aria-hidden /> Settings</Link>
          </div>
          <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
            <button role="menuitem" type="button" onClick={onLogout} className={clsx(item, 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950')} data-testid="menu-sign-out">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation();

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get<{ unread: number }>('/notifications', { limit: 1 })
        .then((r) => alive && setUnread(r.unread))
        .catch(() => undefined);
    void load();
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [loc.pathname]);

  const initials = (user?.profile.fullName || user?.email || '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const current = NAV.find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">
          <SideNav />
        </div>
        <button onClick={() => void logout()} className="mt-4 flex items-center gap-3 rounded-xl border-t border-slate-200 px-3 pt-4 pb-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-950">
          <LogOut className="h-[18px] w-[18px]" aria-hidden /> Sign out
        </button>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="fade-in absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-4 py-5 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <SideNav onNavigate={() => setOpen(false)} />
            </div>
            <button onClick={() => void logout()} className="mt-4 flex items-center gap-3 rounded-xl border-t border-slate-200 px-3 pt-4 pb-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-800 dark:text-red-400">
              <LogOut className="h-[18px] w-[18px]" aria-hidden /> Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Open menu" data-testid="mobile-menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{current?.label ?? 'CareerPilot AI'}</div>
          <button onClick={toggle} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} data-testid="theme-toggle">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link to="/alerts" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Notifications (${unread} unread)`}>
            <Bell className="h-5 w-5" />
            {unread > 0 && <span data-testid="unread-badge" className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
          </Link>
          <UserMenu initials={initials} name={user?.profile.fullName || user?.email || ''} email={user?.email ?? ''} onLogout={() => void logout()} />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div key={loc.pathname} className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
