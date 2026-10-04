import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string;
  description: string;
  location: 'query' | 'body' | 'header';
}

export interface APIEndpoint {
  _id: string;
  name: string;
  slug: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  category: string;
  categoryName: string;
  coinCost: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  authRequired: boolean;
  status: 'active' | 'disabled' | 'maintenance';
  featured: boolean;
  popular: boolean;
  totalCalls: number;
  avgResponseTime: number;
  handlerType: 'builtin' | 'script' | 'proxy';
  builtinHandler?: string;
  customScript?: string;
  proxyUrl?: string;
  parameters: APIParameter[];
  sampleResponse?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  status: 'active' | 'disabled';
}

export interface DocumentationItem {
  _id: string;
  apiId: string;
  apiSlug: string;
  apiName: string;
  category: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication: string;
  coinCost: number;
  rateLimit: string;
  parameters: APIParameter[];
  requestExample: string;
  responseExample: string;
  errorCodes: Array<{ code: number; status: string; description: string }>;
  codeExamples: {
    javascript: string;
    nodejs: string;
    python: string;
    curl: string;
  };
  status: 'enabled' | 'disabled';
  updatedAt: string;
}

export interface WebsiteSettings {
  _id: string;
  websiteName: string;
  logoText: string;
  faviconUrl: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  apiVersion: string;
  baseUrl: string;
  newAccountBonusCoins: number;
  dailyBonusCoins: number;
  defaultRateLimitPerMinute: number;
  defaultRateLimitPerDay: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  socialLinks: {
    github: string;
    telegram: string;
    discord: string;
    twitter: string;
    email: string;
  };
}

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  coins: number;
  coinsUsed: number;
  coinsReceived: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  status: 'active' | 'banned';
  lastDailyBonusAt?: string | null;
  canClaimDailyBonus?: boolean;
  dailyBonusAmount?: number;
  createdAt: string;
}

export interface APIKeyItem {
  _id: string;
  userId: string;
  username: string;
  name: string;
  key: string;
  status: 'active' | 'disabled' | 'revoked';
  totalRequests: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface CoinTransactionItem {
  _id: string;
  userId: string;
  username: string;
  type: 'bonus' | 'daily_reward' | 'admin_add' | 'admin_remove' | 'admin_set' | 'api_usage';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface APIRequestLogItem {
  _id: string;
  userId: string;
  username: string;
  apiKeyId: string;
  maskedKey: string;
  apiId: string;
  apiName: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  coinsUsed: number;
  ipAddress: string;
  requestParams?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface PlatformContextValue {
  loading: boolean;
  settings: WebsiteSettings | null;
  categories: CategoryItem[];
  apis: APIEndpoint[];
  docs: DocumentationItem[];
  metrics: {
    totalApis: number;
    totalCategories: number;
    totalUsers: number;
    totalCalls: number;
    avgLatencyMs: number;
    uptimeSeconds: number;
  };
  userToken: string | null;
  user: UserProfile | null;
  userKeys: APIKeyItem[];
  userTransactions: CoinTransactionItem[];
  userLogs: APIRequestLogItem[];
  userUsageByDay: Array<{ date: string; requests: number; coins: number }>;
  adminToken: string | null;
  admin: { _id: string; email: string; name: string; role: string } | null;
  refreshPortal: () => Promise<void>;
  refreshUserDashboard: () => Promise<void>;
  loginUserSession: (token: string, user: UserProfile) => void;
  logoutUserSession: () => void;
  loginAdminSession: (token: string, admin: { _id: string; email: string; name: string; role: string }) => void;
  logoutAdminSession: () => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  copyText: (text: string, label?: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [apis, setApis] = useState<APIEndpoint[]>([]);
  const [docs, setDocs] = useState<DocumentationItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalApis: 0,
    totalCategories: 0,
    totalUsers: 0,
    totalCalls: 0,
    avgLatencyMs: 0,
    uptimeSeconds: 0,
  });

  const [userToken, setUserToken] = useState<string | null>(() =>
    localStorage.getItem('bestie_user_token')
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userKeys, setUserKeys] = useState<APIKeyItem[]>([]);
  const [userTransactions, setUserTransactions] = useState<CoinTransactionItem[]>([]);
  const [userLogs, setUserLogs] = useState<APIRequestLogItem[]>([]);
  const [userUsageByDay, setUserUsageByDay] = useState<
    Array<{ date: string; requests: number; coins: number }>
  >([]);

  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem('bestie_admin_token')
  );
  const [admin, setAdmin] = useState<{
    _id: string;
    email: string;
    name: string;
    role: string;
  } | null>(() => {
    const saved = localStorage.getItem('bestie_admin_info');
    return saved ? JSON.parse(saved) : null;
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const copyText = useCallback(
    (text: string, label = 'Copied to clipboard') => {
      navigator.clipboard.writeText(text);
      notify(label, 'success');
    },
    [notify]
  );

  const refreshPortal = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setCategories(data.categories || []);
        setApis(data.apis || []);
        setDocs(data.docs || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Failed to fetch portal bootstrap:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUserDashboard = useCallback(async () => {
    if (!userToken) {
      setUser(null);
      setUserKeys([]);
      setUserTransactions([]);
      setUserLogs([]);
      return;
    }
    try {
      const res = await fetch('/api/user/dashboard', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUserKeys(data.apiKeys || []);
        setUserTransactions(data.transactions || []);
        setUserLogs(data.logs || []);
        setUserUsageByDay(data.usageByDay || []);
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('bestie_user_token');
        setUserToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to refresh user dashboard:', e);
    }
  }, [userToken]);

  useEffect(() => {
    refreshPortal();
  }, [refreshPortal]);

  useEffect(() => {
    refreshUserDashboard();
  }, [refreshUserDashboard]);

  const loginUserSession = (token: string, userData: UserProfile) => {
    localStorage.setItem('bestie_user_token', token);
    setUserToken(token);
    setUser(userData);
  };

  const logoutUserSession = () => {
    localStorage.removeItem('bestie_user_token');
    setUserToken(null);
    setUser(null);
    setUserKeys([]);
    setUserTransactions([]);
    setUserLogs([]);
    notify('Signed out of developer account', 'info');
  };

  const loginAdminSession = (
    token: string,
    adminData: { _id: string; email: string; name: string; role: string }
  ) => {
    localStorage.setItem('bestie_admin_token', token);
    localStorage.setItem('bestie_admin_info', JSON.stringify(adminData));
    setAdminToken(token);
    setAdmin(adminData);
  };

  const logoutAdminSession = () => {
    localStorage.removeItem('bestie_admin_token');
    localStorage.removeItem('bestie_admin_info');
    setAdminToken(null);
    setAdmin(null);
    notify('Signed out of Admin Panel', 'info');
  };

  return (
    <PlatformContext.Provider
      value={{
        loading,
        settings,
        categories,
        apis,
        docs,
        metrics,
        userToken,
        user,
        userKeys,
        userTransactions,
        userLogs,
        userUsageByDay,
        adminToken,
        admin,
        refreshPortal,
        refreshUserDashboard,
        loginUserSession,
        logoutUserSession,
        loginAdminSession,
        logoutAdminSession,
        notify,
        copyText,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#131524]/95 backdrop-blur-md border border-white/15 text-sm text-white shadow-xl transition-all duration-150"
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-violet-400 shrink-0" />}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white p-1"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </PlatformContext.Provider>
  );
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
