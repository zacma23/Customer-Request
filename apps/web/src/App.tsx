import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { supabase } from './supabaseClient';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';

// Client Portal Pages
import { ClientDashboard } from './pages/client/ClientDashboard';
import { NewRequestPage } from './pages/client/NewRequestPage';
import { RequestDetailPage } from './pages/client/RequestDetailPage';
import { ClientPaymentsPage } from './pages/client/ClientPaymentsPage';
import { ClientProfilePage } from './pages/client/ClientProfilePage';

// Admin / Staff Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRequestListPage } from './pages/admin/AdminRequestListPage';
import { AdminRequestDetailPage } from './pages/admin/AdminRequestDetailPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminFeedbackPage } from './pages/admin/AdminFeedbackPage';
import { AdminTemplatesPage } from './pages/admin/AdminTemplatesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Protected Route Guard with Supabase Session
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);
  const location = useLocation();

  React.useEffect(() => {
    let isMounted = true;

    // Check session with supabase.auth.getSession()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setHasSession(!!session);
      }
    });

    // Listen to real-time auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setHasSession(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (hasSession === null) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Client Portal Routes */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/new-request"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <NewRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/requests/:id"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <RequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/payments"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ClientPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/profile"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ClientProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin & Staff Management Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminRequestListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/requests/:id"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminRequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clients"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminFeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}>
                <AdminTemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route
            path="*"
            element={
              <div className="py-24 text-center">
                <h1 className="text-6xl font-black text-primary-600 mb-4">404</h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                  The page you are looking for does not exist.
                </p>
                <a
                  href="/"
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Return to Home
                </a>
              </div>
            }
          />
        </Routes>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
};
