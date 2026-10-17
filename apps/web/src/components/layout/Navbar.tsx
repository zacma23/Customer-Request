import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRealTime } from '../../context/RealTimeContext';
import {
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Layers,
  PlusCircle,
  FileText,
  CreditCard,
  UserCheck,
  Settings,
  ShieldAlert,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isClient, isStaff, isAdmin, isSuperAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useRealTime();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              Z
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                Zacma<span className="text-brand-600 dark:text-brand-400">Tech</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                AI Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/#services"
                  className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  Services
                </Link>
                <Link
                  to="/#pricing"
                  className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  Pricing
                </Link>
                <Link
                  to="/#testimonials"
                  className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  Reviews
                </Link>
              </>
            ) : isClient ? (
              <>
                <Link
                  to="/portal/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/portal/dashboard')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/portal/new-request"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/portal/new-request')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  New Request
                </Link>
                <Link
                  to="/portal/payments"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/portal/payments')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Payments
                </Link>
                <Link
                  to="/portal/profile"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/portal/profile')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Bot Linking
                </Link>
              </>
            ) : (
              // Staff / Admin / Super Admin
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/dashboard')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Analytics
                </Link>
                <Link
                  to="/admin/requests"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/requests')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Requests Queue
                </Link>
                <Link
                  to="/admin/payments"
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/payments')
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Verification
                </Link>
                {(isAdmin || isSuperAdmin) && (
                  <>
                    <Link
                      to="/admin/templates"
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive('/admin/templates')
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      Templates
                    </Link>
                    <Link
                      to="/admin/clients"
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive('/admin/clients')
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      Clients
                    </Link>
                  </>
                )}
                {isSuperAdmin && (
                  <Link
                    to="/admin/settings"
                    className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      isActive('/admin/settings')
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Live Pulse */}
            {isAuthenticated && (
              <div
                title={isConnected ? 'Real-time connected' : 'Connecting to live events...'}
                className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                  }`}
                />
                <Radio className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Auth Actions */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {user?.name}
                  </span>
                  <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 tracking-wider">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-6 space-y-2">
          {!isAuthenticated ? (
            <>
              <Link
                to="/#services"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Services
              </Link>
              <Link
                to="/#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-center rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-center rounded-xl font-bold bg-brand-600 text-white"
              >
                Create Account
              </Link>
            </>
          ) : isClient ? (
            <>
              <Link
                to="/portal/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Dashboard
              </Link>
              <Link
                to="/portal/new-request"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                New Request
              </Link>
              <Link
                to="/portal/payments"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Payments
              </Link>
              <Link
                to="/portal/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Bot Linking & Profile
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Analytics Dashboard
              </Link>
              <Link
                to="/admin/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Requests Queue
              </Link>
              <Link
                to="/admin/payments"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
              >
                Payment Verification
              </Link>
              {(isAdmin || isSuperAdmin) && (
                <>
                  <Link
                    to="/admin/templates"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                  >
                    Reply Templates
                  </Link>
                  <Link
                    to="/admin/clients"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                  >
                    Client Directory
                  </Link>
                </>
              )}
              {isSuperAdmin && (
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                >
                  System Settings
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
};
