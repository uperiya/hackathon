import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { login, quickDemoLogin } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      showToast('success', 'Logged in successfully. Welcome to StockSense ERP!');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setSubmitting(true);
    try {
      await quickDemoLogin(role);
      showToast('success', `Logged in as demo ${role}!`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#017E84] flex items-center justify-center text-white shadow-xl shadow-[#714B67]/20">
            <Box className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>StockSense</span>
              <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-md bg-[#714B67] text-white">ERP</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Smart Inventory Management System
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to your workplace
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67]"
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-semibold text-[#714B67] hover:text-[#5c3a53] dark:text-purple-400"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full mt-2"
              size="lg"
            >
              Sign in to StockSense
            </Button>
          </form>

          {/* Quick Demo 1-Click Login Section */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#714B67]" />
              <span>Instant 1-Click Demo Evaluation</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('Admin')}
                className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/60 transition text-xs font-semibold flex flex-col items-center"
              >
                <UserCheck className="w-4 h-4 mb-1 text-[#714B67]" />
                <span>Admin</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('Inventory Manager')}
                className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition text-xs font-semibold flex flex-col items-center"
              >
                <UserCheck className="w-4 h-4 mb-1 text-blue-600" />
                <span>Manager</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Products & Ops</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('Warehouse Staff')}
                className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition text-xs font-semibold flex flex-col items-center"
              >
                <UserCheck className="w-4 h-4 mb-1 text-emerald-600" />
                <span>Staff</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Floor Execution</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="font-bold text-[#714B67] dark:text-purple-400 hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
