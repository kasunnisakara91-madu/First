import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ButterflyLogo } from '../components/ButterflyLogo';
import { usePlatform } from '../context/PlatformContext';

export const LoginPage: React.FC = () => {
  const { loginUserSession, notify, refreshUserDashboard } = usePlatform();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      loginUserSession(data.token, data.user);
      await refreshUserDashboard();
      notify(`Welcome back, ${data.user.username}!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <ButterflyLogo className="w-7 h-7" />
            <span className="text-xs font-medium text-violet-300">BESTIE Developer Account</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Sign In to Your Console</h1>
          <p className="text-xs text-slate-400">
            Access your Bearer API keys, BESTIE Coins balance, and request telemetry.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Email or Username
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="developer@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>New to BESTIE API?</span>
          <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold">
            Create Free Account →
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { loginUserSession, settings, notify, refreshPortal } = usePlatform();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      loginUserSession(data.token, data.user);
      await refreshPortal();
      notify(
        `Account created! +${data.user.coins} BESTIE Coins credited & API key generated.`,
        'success'
      );
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to registration server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <ButterflyLogo className="w-7 h-7" />
            <span className="text-xs font-medium text-amber-300">
              Includes +{settings?.newAccountBonusCoins ?? 50} Welcome BESTIE Coins
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Create Developer Account</h1>
          <p className="text-xs text-slate-400">
            Get instant access to your Bearer API key and free BESTIE Coins to start building.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="kavindu_dev"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Password (minimum 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Register & Generate API Key'}
          </button>
        </form>

        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>Already have an account?</span>
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
};
