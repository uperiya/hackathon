import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../services/authService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const msg = await requestPasswordReset(email);
      setSentMessage(msg);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch password reset link.');
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
          Reset your account password
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800">
          {sentMessage ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Link Dispatched
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sentMessage}
              </p>
              <Link to="/login">
                <Button variant="primary" className="w-full mt-4" size="md">
                  Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {error}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Enter your account email address and we'll send you instructions and a secure link to reset your password.
              </p>

              <Input
                label="Email address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="w-full mt-2"
                size="lg"
              >
                Send Reset Link
              </Button>

              <div className="pt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
