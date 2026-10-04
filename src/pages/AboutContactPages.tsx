import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButterflyLogo } from '../components/ButterflyLogo';
import { usePlatform } from '../context/PlatformContext';

export const AboutPage: React.FC = () => {
  const { settings, metrics } = usePlatform();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
      <div className="space-y-4 border-b border-white/[0.08] pb-8">
        <div className="flex items-center gap-3">
          <ButterflyLogo className="w-8 h-8" />
          <span className="text-xs font-medium text-violet-300">
            {settings?.websiteName || '🦋 BESTIE API 🦋'}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-white">
          Built for Bot Creators, Web Engineers & Automation Teams
        </h1>
        <p className="text-base text-slate-300 leading-relaxed max-w-3xl">
          {settings?.heroSubtitle ||
            'BESTIE API is a modern developer API platform that provides fast and easy-to-use APIs for bots, websites, applications and automation projects.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#0D0E17] border border-white/[0.08] space-y-2">
          <p className="font-mono text-xs text-violet-400">01. Architecture</p>
          <h3 className="font-display text-lg font-bold text-white">Unified Bearer Gateway</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Authenticate every endpoint across Music, Search, Download, AI, Utility, and Web domains with a single Bearer API key.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[#0D0E17] border border-white/[0.08] space-y-2">
          <p className="font-mono text-xs text-pink-400">02. Credit Economy</p>
          <h3 className="font-display text-lg font-bold text-white">BESTIE Coin Metering</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Predictable per-endpoint coin deduction with welcome credits, daily developer rewards, and complete transaction transparency.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[#0D0E17] border border-white/[0.08] space-y-2">
          <p className="font-mono text-xs text-blue-400">03. Observability</p>
          <h3 className="font-display text-lg font-bold text-white">Real-Time Request Logs</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every request records exact HTTP status, latency in milliseconds, and coin usage directly to your developer dashboard.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-white">
            Ready to integrate {metrics.totalApis} live endpoints?
          </h2>
          <p className="text-sm text-slate-400">
            Create an account in seconds and test endpoints directly in your browser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 whitespace-nowrap"
          >
            Get API Key
          </Link>
          <Link
            to="/docs"
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] whitespace-nowrap"
          >
            Read Docs
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { settings, notify } = usePlatform();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        notify(data.message || 'Message sent!', 'success');
      } else {
        notify(data.error || 'Failed to send message', 'error');
      }
    } catch {
      notify('Network error submitting form', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5 space-y-5">
          <span className="text-xs font-medium text-violet-300">Developer Support</span>
          <h1 className="font-display text-3xl font-bold text-white">Contact BESTIE API Team</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Need custom rate limits, additional BESTIE Coins for production bots, or help integrating an endpoint? Reach out to our team.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
              <span className="text-slate-500 block mb-0.5">Direct Support Email</span>
              <span className="font-mono text-white">
                {settings?.socialLinks?.email || 'support@bestieapi.dev'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
              <span className="text-slate-500 block mb-0.5">Telegram Community</span>
              <span className="font-mono text-white">
                {settings?.socialLinks?.telegram || 'https://t.me/bestieapi'}
              </span>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 sm:p-8">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <h3 className="font-display text-xl font-bold text-white">Message Received</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Thank you for contacting BESTIE API. Our engineering team will respond to{' '}
                <span className="text-white font-mono">{email}</span> shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setSubject('');
                  setMessage('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Damith Madusanka"
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
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Coin Top-Up / Custom API Integration"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your project or question..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-95 transition-opacity cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
