import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './index.css';
import { AuthProvider, ThemeProvider, ToastProvider, useAuth } from './lib/context';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import LoginPage from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const FindJobs = lazy(() => import('./pages/FindJobs'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Matching = lazy(() => import('./pages/Matching'));
const Prep = lazy(() => import('./pages/Prep'));
const MockInterview = lazy(() => import('./pages/MockInterview'));
const Companies = lazy(() => import('./pages/Companies'));
const Resume = lazy(() => import('./pages/Resume'));
const Tracker = lazy(() => import('./pages/Tracker'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Profile = lazy(() => import('./pages/Profile'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function Protected() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Loading CareerPilot AI…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Layout />;
}

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/" replace /> : <LoginPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/login" element={<PublicOnly />} />
                <Route element={<Protected />}>
                  <Route index element={<Dashboard />} />
                  <Route path="jobs" element={<FindJobs />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="matching" element={<Matching />} />
                  <Route path="prep" element={<Prep />} />
                  <Route path="mock-interview" element={<MockInterview />} />
                  <Route path="mock-interview/:id" element={<MockInterview />} />
                  <Route path="companies" element={<Companies />} />
                  <Route path="resume" element={<Resume />} />
                  <Route path="tracker" element={<Tracker />} />
                  <Route path="roadmap" element={<Roadmap />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
