import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db, generateId, generateApiKeyString, maskApiKey } from './server/db.js';
import { executeApiEndpoint } from './server/services/apiExecutor.js';
import { buildCodeExamples } from './server/services/codeExamples.js';
import { IAPIEndpoint, IDocumentation } from './server/models/schemas.js';

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bestie_api_jwt_secret_key_2026_secure';
const SERVER_START_TIME = Date.now();

interface AuthRequest extends Request {
  user?: { id: string; username: string; email: string };
  admin?: { id: string; email: string; role: string };
}

function signUserToken(user: { _id: string; username: string; email: string }) {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, type: 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function signAdminToken(admin: { _id: string; email: string; role: string }) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role, type: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function requireUserAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'user') {
      res.status(403).json({ error: 'Invalid user token.' });
      return;
    }
    req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'admin') {
      res.status(403).json({ error: 'Admin privileges required.' });
      return;
    }
    req.admin = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: 'Admin session expired or invalid token.' });
  }
}

function canClaimDailyBonus(lastClaimedIso?: string | null): boolean {
  if (!lastClaimedIso) return true;
  const lastDate = new Date(lastClaimedIso).toISOString().slice(0, 10);
  const todayDate = new Date().toISOString().slice(0, 10);
  return lastDate !== todayDate;
}

async function startServer() {
  await db.initialize();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Powered-By', 'BESTIE-API-Engine');
    next();
  });

  // ============================================================================
  // 1. PUBLIC PORTAL ENDPOINTS
  // ============================================================================
  app.get('/api/public/bootstrap', async (req, res) => {
    try {
      const [settings, categories, apis, docs, users, logs] = await Promise.all([
        db.getSettings(),
        db.getCategories(),
        db.getApis(),
        db.getDocs(),
        db.getUsers(),
        db.getAllLogs(1000),
      ]);

      const activeCategories = categories.filter((c) => c.status === 'active');
      const publicApis = apis.filter((a) => a.status !== 'disabled');
      const enabledDocs = docs.filter((d) => d.status === 'enabled');

      const totalCalls = apis.reduce((acc, a) => acc + (a.totalCalls || 0), 0);
      const avgLatency =
        logs.length > 0
          ? Math.round(logs.reduce((acc, l) => acc + (l.responseTime || 0), 0) / logs.length)
          : 42;

      res.json({
        settings,
        categories: activeCategories,
        apis: publicApis.map((a) => ({
          ...a,
          customScript: undefined, // Never expose backend script code publicly
        })),
        docs: enabledDocs,
        metrics: {
          totalApis: publicApis.length,
          totalCategories: activeCategories.length,
          totalUsers: users.length,
          totalCalls,
          avgLatencyMs: avgLatency,
          uptimeSeconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load portal data' });
    }
  });

  app.get('/api/public/apis/:slug', async (req, res) => {
    try {
      const api = await db.getApiBySlug(req.params.slug);
      if (!api || api.status === 'disabled') {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      const doc = await db.getDocBySlug(req.params.slug);
      res.json({
        api: { ...api, customScript: undefined },
        doc: doc && doc.status === 'enabled' ? doc : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load API details' });
    }
  });

  app.post('/api/public/contact', async (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required.' });
      return;
    }
    res.json({
      success: true,
      message: `Thank you, ${name}. Your inquiry regarding "${subject || 'BESTIE API'}" has been received by our engineering team.`,
    });
  });

  // ============================================================================
  // 2. USER AUTHENTICATION & DASHBOARD
  // ============================================================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body || {};
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required.' });
        return;
      }
      const cleanUsername = String(username).trim();
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanUsername.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        res.status(400).json({
          error: 'Username must be at least 3 characters (letters, numbers, _, ., -).',
        });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (String(password).length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      const existingByUsername = await db.getUserByEmailOrUsername(cleanUsername);
      const existingByEmail = await db.getUserByEmailOrUsername(cleanEmail);
      if (existingByUsername || existingByEmail) {
        res.status(409).json({ error: 'Username or email is already registered.' });
        return;
      }

      const settings = await db.getSettings();
      const bonusCoins = settings?.newAccountBonusCoins ?? 50;
      const passwordHash = await bcrypt.hash(String(password), 10);
      const now = new Date().toISOString();
      const userId = generateId();

      const newUser = await db.createUser({
        _id: userId,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        coins: bonusCoins,
        coinsUsed: 0,
        coinsReceived: bonusCoins,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        status: 'active',
        lastDailyBonusAt: null,
        createdAt: now,
        updatedAt: now,
      });

      // Record welcome coin bonus transaction
      await db.createTransaction({
        _id: generateId(),
        userId: newUser._id,
        username: newUser.username,
        type: 'bonus',
        amount: bonusCoins,
        balanceAfter: bonusCoins,
        description: `New developer account welcome bonus (+${bonusCoins} BESTIE Coins)`,
        createdAt: now,
      });

      // Automatically provision a primary API key for immediate developer onboarding
      await db.createApiKey({
        _id: generateId(),
        userId: newUser._id,
        username: newUser.username,
        name: 'Default Production Key',
        key: generateApiKeyString(),
        status: 'active',
        totalRequests: 0,
        lastUsedAt: null,
        createdAt: now,
      });

      const token = signUserToken(newUser);
      const { passwordHash: _ph, ...safeUser } = newUser;
      res.status(201).json({
        token,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, email, password } = req.body || {};
      const loginId = String(identifier || email || '').trim();
      if (!loginId || !password) {
        res.status(400).json({ error: 'Email/Username and password are required.' });
        return;
      }

      const user = await db.getUserByEmailOrUsername(loginId);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      const valid = await bcrypt.compare(String(password), user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      if (user.status === 'banned') {
        res.status(403).json({
          error: 'Your account has been suspended by an administrator. Contact support.',
        });
        return;
      }

      const token = signUserToken(user);
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({
        token,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Login failed.' });
    }
  });

  app.get('/api/user/dashboard', requireUserAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await db.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (user.status === 'banned') {
        res.status(403).json({ error: 'Account is suspended.' });
        return;
      }

      const [apiKeys, transactions, logs, settings] = await Promise.all([
        db.getApiKeysByUser(userId),
        db.getTransactionsByUser(userId, 100),
        db.getLogsByUser(userId, 100),
        db.getSettings(),
      ]);

      // Compute 7-day usage breakdown for user dashboard charts
      const usageByDay: Array<{ date: string; requests: number; coins: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const dayLogs = logs.filter((l) => l.createdAt.slice(0, 10) === d);
        usageByDay.push({
          date: d.slice(5),
          requests: dayLogs.length,
          coins: dayLogs.reduce((acc, l) => acc + (l.coinsUsed || 0), 0),
        });
      }

      const { passwordHash: _ph, ...safeUser } = user;
      res.json({
        user: {
          ...safeUser,
          canClaimDailyBonus: canClaimDailyBonus(user.lastDailyBonusAt),
          dailyBonusAmount: settings?.dailyBonusCoins ?? 15,
        },
        apiKeys,
        transactions,
        logs,
        usageByDay,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load user dashboard.' });
    }
  });

  app.post('/api/user/daily-bonus', requireUserAuth, async (req: AuthRequest, res) => {
    try {
      const user = await db.getUserById(req.user!.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (!canClaimDailyBonus(user.lastDailyBonusAt)) {
        res.status(400).json({
          error: 'Daily bonus already claimed today. Come back tomorrow!',
        });
        return;
      }

      const settings = await db.getSettings();
      const reward = settings?.dailyBonusCoins ?? 15;
      const now = new Date().toISOString();
      const newBalance = (user.coins || 0) + reward;
      const newReceived = (user.coinsReceived || 0) + reward;

      const updatedUser = await db.updateUser(user._id, {
        coins: newBalance,
        coinsReceived: newReceived,
        lastDailyBonusAt: now,
      });

      const tx = await db.createTransaction({
        _id: generateId(),
        userId: user._id,
        username: user.username,
        type: 'daily_reward',
        amount: reward,
        balanceAfter: newBalance,
        description: `Claimed daily developer reward (+${reward} BESTIE Coins)`,
        createdAt: now,
      });

      res.json({
        message: `Claimed +${reward} BESTIE Coins daily reward!`,
        coins: updatedUser?.coins ?? newBalance,
        transaction: tx,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Could not claim daily bonus.' });
    }
  });

  // User API Key Management
  app.post('/api/user/api-keys', requireUserAuth, async (req: AuthRequest, res) => {
    try {
      const user = await db.getUserById(req.user!.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const existingKeys = await db.getApiKeysByUser(user._id);
      if (existingKeys.filter((k) => k.status !== 'revoked').length >= 10) {
        res.status(400).json({ error: 'Maximum of 10 active API keys allowed per account.' });
        return;
      }

      const name = String(req.body?.name || `API Key #${existingKeys.length + 1}`).trim();
      const newKey = await db.createApiKey({
        _id: generateId(),
        userId: user._id,
        username: user.username,
        name,
        key: generateApiKeyString(),
        status: 'active',
        totalRequests: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({ apiKey: newKey });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to generate API key.' });
    }
  });

  app.post('/api/user/api-keys/:id/regenerate', requireUserAuth, async (req: AuthRequest, res) => {
    try {
      const keyDoc = await db.getApiKeyById(req.params.id);
      if (!keyDoc || keyDoc.userId !== req.user!.id) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      const updated = await db.updateApiKey(keyDoc._id, {
        key: generateApiKeyString(),
        status: 'active',
      });
      res.json({ apiKey: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to regenerate API key.' });
    }
  });

  app.patch('/api/user/api-keys/:id/status', requireUserAuth, async (req: AuthRequest, res) => {
    try {
      const keyDoc = await db.getApiKeyById(req.params.id);
      if (!keyDoc || keyDoc.userId !== req.user!.id) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      const status = req.body?.status;
      if (!['active', 'disabled', 'revoked'].includes(status)) {
        res.status(400).json({ error: 'Invalid key status.' });
        return;
      }
      const updated = await db.updateApiKey(keyDoc._id, { status });
      res.json({ apiKey: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update API key status.' });
    }
  });

  app.delete('/api/user/api-keys/:id', requireUserAuth, async (req: AuthRequest, res) => {
    try {
      const keyDoc = await db.getApiKeyById(req.params.id);
      if (!keyDoc || keyDoc.userId !== req.user!.id) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      await db.deleteApiKey(keyDoc._id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete API key.' });
    }
  });

  // ============================================================================
  // 3. ADMIN AUTHENTICATION & MANAGEMENT PANEL
  // ============================================================================
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ error: 'Admin email and password are required.' });
        return;
      }
      const normEmail = String(email).trim().toLowerCase();
      const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@bestieapi.dev').trim().toLowerCase();
      const envAdminPass = process.env.ADMIN_PASSWORD || 'Admin@Bestie2026!';

      let admin = await db.getAdminByEmail(normEmail);

      // Verify against DB admin record or current environment variable configuration
      let isValid = false;
      if (admin) {
        isValid = await bcrypt.compare(String(password), admin.passwordHash);
      }
      if (!isValid && normEmail === envAdminEmail && String(password) === envAdminPass) {
        isValid = true;
        if (!admin) {
          admin = await db.createAdmin({
            _id: generateId(),
            email: envAdminEmail,
            name: 'BESTIE Chief Administrator',
            passwordHash: await bcrypt.hash(envAdminPass, 10),
            role: 'superadmin',
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (!isValid || !admin) {
        res.status(401).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      await db.updateAdminLogin(admin._id);
      const token = signAdminToken(admin);
      res.json({
        token,
        admin: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Admin login failed.' });
    }
  });

  app.get('/api/admin/stats', requireAdminAuth, async (_req, res) => {
    try {
      const [users, apiKeys, apis, logs, transactions, categories] = await Promise.all([
        db.getUsers(),
        db.getAllApiKeys(),
        db.getApis(),
        db.getAllLogs(2000),
        db.getAllTransactions(2000),
        db.getCategories(),
      ]);

      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.status === 'active').length;
      const bannedUsers = users.filter((u) => u.status === 'banned').length;
      const totalApiKeys = apiKeys.length;
      const activeApiKeys = apiKeys.filter((k) => k.status === 'active').length;

      const totalRequests = logs.length;
      const successfulRequests = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 400).length;
      const failedRequests = totalRequests - successfulRequests;

      const totalCoinsUsed = users.reduce((acc, u) => acc + (u.coinsUsed || 0), 0);
      const totalCoinsDistributed = users.reduce((acc, u) => acc + (u.coinsReceived || 0), 0);
      const avgResponseTime =
        logs.length > 0
          ? Math.round(logs.reduce((acc, l) => acc + (l.responseTime || 0), 0) / logs.length)
          : 0;

      // Build 7-day charts from real DB records
      const requestsPerDay: Array<{
        date: string;
        total: number;
        success: number;
        failed: number;
        coinsUsed: number;
      }> = [];
      const usersGrowth: Array<{ date: string; newUsers: number; totalUsers: number }> = [];

      let cumulativeUsers = 0;
      const sevenDaysAgoIso = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      cumulativeUsers = users.filter((u) => u.createdAt.slice(0, 10) < sevenDaysAgoIso).length;

      for (let i = 6; i >= 0; i--) {
        const dayIso = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const dayLabel = dayIso.slice(5);
        const dayLogs = logs.filter((l) => l.createdAt.slice(0, 10) === dayIso);
        const daySuccess = dayLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 400).length;
        const dayFailed = dayLogs.length - daySuccess;
        const dayCoins = dayLogs.reduce((acc, l) => acc + (l.coinsUsed || 0), 0);

        requestsPerDay.push({
          date: dayLabel,
          total: dayLogs.length,
          success: daySuccess,
          failed: dayFailed,
          coinsUsed: dayCoins,
        });

        const dayNewUsers = users.filter((u) => u.createdAt.slice(0, 10) === dayIso).length;
        cumulativeUsers += dayNewUsers;
        usersGrowth.push({
          date: dayLabel,
          newUsers: dayNewUsers,
          totalUsers: cumulativeUsers,
        });
      }

      const apiUsage = apis.map((a) => ({
        name: a.name,
        slug: a.slug,
        calls: a.totalCalls || 0,
        avgLatency: a.avgResponseTime || 0,
        coinCost: a.coinCost,
      }));

      res.json({
        overview: {
          totalUsers,
          activeUsers,
          bannedUsers,
          totalApiKeys,
          activeApiKeys,
          totalRequests,
          successfulRequests,
          failedRequests,
          totalCoinsUsed,
          totalCoinsDistributed,
          avgResponseTime,
          serverUptimeSeconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
          storageMode: db.storageMode,
          totalApis: apis.length,
          totalCategories: categories.length,
        },
        charts: {
          requestsPerDay,
          usersGrowth,
          apiUsage,
          statusBreakdown: [
            { name: 'Successful (2xx)', value: successfulRequests },
            { name: 'Failed (4xx/5xx)', value: failedRequests },
          ],
        },
        recentLogs: logs.slice(0, 12),
        recentTransactions: transactions.slice(0, 10),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to compute admin stats.' });
    }
  });

  // Admin Users Management
  app.get('/api/admin/users', requireAdminAuth, async (_req, res) => {
    try {
      const users = await db.getUsers();
      res.json({
        users: users.map(({ passwordHash: _ph, ...u }) => u),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch users.' });
    }
  });

  app.get('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
      const user = await db.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const [apiKeys, transactions, logs] = await Promise.all([
        db.getApiKeysByUser(user._id),
        db.getTransactionsByUser(user._id, 50),
        db.getLogsByUser(user._id, 50),
      ]);
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ user: safeUser, apiKeys, transactions, logs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch user details.' });
    }
  });

  app.patch('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
      const { username, email, status } = req.body || {};
      const updates: any = {};
      if (username) updates.username = String(username).trim();
      if (email) updates.email = String(email).trim().toLowerCase();
      if (status && ['active', 'banned'].includes(status)) updates.status = status;

      const updated = await db.updateUser(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const { passwordHash: _ph, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update user.' });
    }
  });

  app.delete('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
      await db.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete user.' });
    }
  });

  app.post('/api/admin/users/:id/reset-key', requireAdminAuth, async (req, res) => {
    try {
      const user = await db.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const keys = await db.getApiKeysByUser(user._id);
      if (keys.length > 0) {
        const updated = await db.updateApiKey(keys[0]._id, {
          key: generateApiKeyString(),
          status: 'active',
        });
        res.json({ apiKey: updated });
      } else {
        const created = await db.createApiKey({
          _id: generateId(),
          userId: user._id,
          username: user.username,
          name: 'Admin Reset Key',
          key: generateApiKeyString(),
          status: 'active',
          totalRequests: 0,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        });
        res.json({ apiKey: created });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to reset user API key.' });
    }
  });

  // Admin Coin Management
  app.post('/api/admin/coins', requireAdminAuth, async (req, res) => {
    try {
      const { userId, action, amount, reason } = req.body || {};
      const numAmount = Math.max(0, Number(amount) || 0);
      const user = await db.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      let newBalance = user.coins || 0;
      let newReceived = user.coinsReceived || 0;
      let txType: 'admin_add' | 'admin_remove' | 'admin_set' = 'admin_add';
      let delta = 0;

      if (action === 'add') {
        newBalance += numAmount;
        newReceived += numAmount;
        delta = numAmount;
        txType = 'admin_add';
      } else if (action === 'remove') {
        delta = -Math.min(newBalance, numAmount);
        newBalance = Math.max(0, newBalance - numAmount);
        txType = 'admin_remove';
      } else if (action === 'set') {
        delta = numAmount - newBalance;
        if (delta > 0) newReceived += delta;
        newBalance = numAmount;
        txType = 'admin_set';
      } else {
        res.status(400).json({ error: 'Invalid coin action. Use add, remove, or set.' });
        return;
      }

      const updatedUser = await db.updateUser(user._id, {
        coins: newBalance,
        coinsReceived: newReceived,
      });

      const tx = await db.createTransaction({
        _id: generateId(),
        userId: user._id,
        username: user.username,
        type: txType,
        amount: delta,
        balanceAfter: newBalance,
        description:
          reason ||
          `Admin ${action.toUpperCase()} coins (${delta >= 0 ? '+' : ''}${delta} BESTIE Coins)`,
        createdAt: new Date().toISOString(),
      });

      const { passwordHash: _ph, ...safeUser } = updatedUser!;
      res.json({ user: safeUser, transaction: tx });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update user coins.' });
    }
  });

  // Admin API Keys Management
  app.get('/api/admin/api-keys', requireAdminAuth, async (_req, res) => {
    try {
      const apiKeys = await db.getAllApiKeys();
      res.json({ apiKeys });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch API keys.' });
    }
  });

  app.patch('/api/admin/api-keys/:id', requireAdminAuth, async (req, res) => {
    try {
      const { status, regenerate } = req.body || {};
      const updates: any = {};
      if (status && ['active', 'disabled', 'revoked'].includes(status)) {
        updates.status = status;
      }
      if (regenerate) {
        updates.key = generateApiKeyString();
        updates.status = 'active';
      }
      const updated = await db.updateApiKey(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      res.json({ apiKey: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update API key.' });
    }
  });

  app.delete('/api/admin/api-keys/:id', requireAdminAuth, async (req, res) => {
    try {
      await db.deleteApiKey(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete API key.' });
    }
  });

  // Admin Categories Management
  app.get('/api/admin/categories', requireAdminAuth, async (_req, res) => {
    try {
      const categories = await db.getCategories();
      res.json({ categories });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch categories.' });
    }
  });

  app.post('/api/admin/categories', requireAdminAuth, async (req, res) => {
    try {
      const { name, slug, description, icon, order, status } = req.body || {};
      if (!name || !slug) {
        res.status(400).json({ error: 'Category name and slug are required.' });
        return;
      }
      const cat = await db.createCategory({
        _id: generateId(),
        name: String(name).trim(),
        slug: String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: String(description || ''),
        icon: String(icon || 'Code'),
        order: Number(order) || 1,
        status: status === 'disabled' ? 'disabled' : 'active',
        createdAt: new Date().toISOString(),
      });
      res.status(201).json({ category: cat });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create category.' });
    }
  });

  app.put('/api/admin/categories/:id', requireAdminAuth, async (req, res) => {
    try {
      const updated = await db.updateCategory(req.params.id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      res.json({ category: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update category.' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdminAuth, async (req, res) => {
    try {
      await db.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete category.' });
    }
  });

  // Admin APIs Management
  app.get('/api/admin/apis', requireAdminAuth, async (_req, res) => {
    try {
      const apis = await db.getApis();
      res.json({ apis });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch APIs.' });
    }
  });

  app.post('/api/admin/apis', requireAdminAuth, async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.name || !body.slug || !body.endpoint) {
        res.status(400).json({ error: 'API Name, Slug, and Endpoint path are required.' });
        return;
      }
      const cleanSlug = String(body.slug)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
      const cleanEndpoint = String(body.endpoint).startsWith('/')
        ? String(body.endpoint).trim()
        : `/api/v1/${cleanSlug}`;

      const categories = await db.getCategories();
      const matchedCat = categories.find((c) => c.slug === body.category);
      const now = new Date().toISOString();

      const newApi: IAPIEndpoint = {
        _id: generateId(),
        name: String(body.name).trim(),
        slug: cleanSlug,
        endpoint: cleanEndpoint,
        method: (body.method || 'GET').toUpperCase(),
        description: String(body.description || ''),
        category: String(body.category || 'utility'),
        categoryName: matchedCat?.name || String(body.categoryName || 'Utility APIs'),
        coinCost: Math.max(0, Number(body.coinCost ?? 1)),
        rateLimitPerMinute: Math.max(1, Number(body.rateLimitPerMinute ?? 60)),
        rateLimitPerDay: Math.max(1, Number(body.rateLimitPerDay ?? 1000)),
        authRequired: body.authRequired !== false,
        status: body.status || 'active',
        featured: Boolean(body.featured),
        popular: Boolean(body.popular),
        totalCalls: 0,
        avgResponseTime: 0,
        handlerType: body.handlerType || 'builtin',
        builtinHandler: body.builtinHandler || cleanSlug,
        customScript: body.customScript || '',
        proxyUrl: body.proxyUrl || '',
        parameters: Array.isArray(body.parameters) ? body.parameters : [],
        sampleResponse: body.sampleResponse || {
          status: true,
          platform: '🦋 BESTIE API 🦋',
          endpoint: cleanEndpoint,
          result: { message: 'Live response from ' + body.name },
        },
        createdAt: now,
        updatedAt: now,
      };

      const created = await db.createApi(newApi);

      // Automatically create corresponding Documentation record so /docs updates immediately
      const settings = await db.getSettings();
      const baseUrl = settings?.baseUrl || 'http://localhost:3000';
      const codeExamples = buildCodeExamples({
        baseUrl,
        endpoint: created.endpoint,
        method: created.method,
        parameters: created.parameters,
      });

      const docRecord: IDocumentation = {
        _id: generateId(),
        apiId: created._id,
        apiSlug: created.slug,
        apiName: created.name,
        category: created.categoryName,
        description: created.description,
        endpoint: created.endpoint,
        method: created.method,
        authentication: created.authRequired ? 'Authorization: Bearer YOUR_API_KEY' : 'Public (None)',
        coinCost: created.coinCost,
        rateLimit: `${created.rateLimitPerMinute} req/min · ${created.rateLimitPerDay} req/day`,
        parameters: created.parameters,
        requestExample: `${created.method} ${baseUrl}${created.endpoint}`,
        responseExample: JSON.stringify(created.sampleResponse, null, 2),
        errorCodes: [
          { code: 400, status: 'MISSING_REQUIRED_PARAMETER', description: 'Required parameter missing.' },
          { code: 401, status: 'UNAUTHORIZED_API_KEY', description: 'Invalid or missing Bearer API key.' },
          { code: 402, status: 'INSUFFICIENT_BESTIE_COINS', description: 'Insufficient coin balance.' },
          { code: 429, status: 'RATE_LIMIT_EXCEEDED', description: 'Rate limit exceeded.' },
        ],
        codeExamples,
        status: created.status === 'disabled' ? 'disabled' : 'enabled',
        updatedAt: now,
      };
      await db.createDoc(docRecord);

      res.status(201).json({ api: created, doc: docRecord });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create API endpoint.' });
    }
  });

  app.put('/api/admin/apis/:id', requireAdminAuth, async (req, res) => {
    try {
      const existing = await db.getApiById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'API endpoint not found.' });
        return;
      }
      const body = req.body || {};
      const categories = await db.getCategories();
      const matchedCat = categories.find((c) => c.slug === (body.category || existing.category));

      const updated = await db.updateApi(existing._id, {
        ...body,
        categoryName: matchedCat?.name || body.categoryName || existing.categoryName,
        coinCost: body.coinCost !== undefined ? Number(body.coinCost) : existing.coinCost,
        rateLimitPerMinute:
          body.rateLimitPerMinute !== undefined
            ? Number(body.rateLimitPerMinute)
            : existing.rateLimitPerMinute,
        rateLimitPerDay:
          body.rateLimitPerDay !== undefined
            ? Number(body.rateLimitPerDay)
            : existing.rateLimitPerDay,
      });

      // Keep corresponding documentation synced
      if (updated) {
        const existingDoc = await db.getDocBySlug(existing.slug);
        if (existingDoc) {
          const settings = await db.getSettings();
          const baseUrl = settings?.baseUrl || 'http://localhost:3000';
          const codeExamples = buildCodeExamples({
            baseUrl,
            endpoint: updated.endpoint,
            method: updated.method,
            parameters: updated.parameters,
          });
          await db.updateDoc(existingDoc._id, {
            apiSlug: updated.slug,
            apiName: updated.name,
            category: updated.categoryName,
            description: updated.description,
            endpoint: updated.endpoint,
            method: updated.method,
            coinCost: updated.coinCost,
            rateLimit: `${updated.rateLimitPerMinute} req/min · ${updated.rateLimitPerDay} req/day`,
            parameters: updated.parameters,
            codeExamples,
          });
        }
      }

      res.json({ api: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update API endpoint.' });
    }
  });

  app.delete('/api/admin/apis/:id', requireAdminAuth, async (req, res) => {
    try {
      await db.deleteApi(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete API endpoint.' });
    }
  });

  // Admin Documentation Management
  app.get('/api/admin/docs', requireAdminAuth, async (_req, res) => {
    try {
      const docs = await db.getDocs();
      res.json({ docs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch documentation.' });
    }
  });

  app.post('/api/admin/docs', requireAdminAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const settings = await db.getSettings();
      const baseUrl = settings?.baseUrl || 'http://localhost:3000';
      const parameters = Array.isArray(body.parameters) ? body.parameters : [];
      const method = (body.method || 'GET').toUpperCase();
      const endpoint = body.endpoint || '/api/v1/custom';
      const codeExamples =
        body.codeExamples && body.codeExamples.javascript
          ? body.codeExamples
          : buildCodeExamples({ baseUrl, endpoint, method, parameters });

      const created = await db.createDoc({
        _id: generateId(),
        apiId: body.apiId || generateId(),
        apiSlug: String(body.apiSlug || body.apiName || 'custom-doc')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-'),
        apiName: String(body.apiName || 'Untitled API'),
        category: String(body.category || 'Utility APIs'),
        description: String(body.description || ''),
        endpoint,
        method,
        authentication: String(body.authentication || 'Authorization: Bearer YOUR_API_KEY'),
        coinCost: Number(body.coinCost ?? 1),
        rateLimit: String(body.rateLimit || '60 req/min · 1000 req/day'),
        parameters,
        requestExample: String(body.requestExample || `${method} ${baseUrl}${endpoint}`),
        responseExample: String(body.responseExample || '{\n  "status": true\n}'),
        errorCodes: Array.isArray(body.errorCodes) ? body.errorCodes : [],
        codeExamples,
        status: body.status === 'disabled' ? 'disabled' : 'enabled',
        updatedAt: new Date().toISOString(),
      });
      res.status(201).json({ doc: created });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create documentation.' });
    }
  });

  app.put('/api/admin/docs/:id', requireAdminAuth, async (req, res) => {
    try {
      const updated = await db.updateDoc(req.params.id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: 'Documentation record not found.' });
        return;
      }
      res.json({ doc: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update documentation.' });
    }
  });

  app.delete('/api/admin/docs/:id', requireAdminAuth, async (req, res) => {
    try {
      await db.deleteDoc(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete documentation.' });
    }
  });

  // Admin Transactions & Request Logs & Settings
  app.get('/api/admin/transactions', requireAdminAuth, async (_req, res) => {
    try {
      const transactions = await db.getAllTransactions(500);
      res.json({ transactions });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load transactions.' });
    }
  });

  app.get('/api/admin/logs', requireAdminAuth, async (_req, res) => {
    try {
      const logs = await db.getAllLogs(500);
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load request logs.' });
    }
  });

  app.get('/api/admin/settings', requireAdminAuth, async (_req, res) => {
    try {
      const settings = await db.getSettings();
      res.json({ settings, storageMode: db.storageMode });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load website settings.' });
    }
  });

  app.put('/api/admin/settings', requireAdminAuth, async (req, res) => {
    try {
      const updated = await db.saveSettings(req.body || {});
      res.json({ settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save website settings.' });
    }
  });

  // ============================================================================
  // 4. REAL LIVE DEVELOPER API GATEWAY (/api/v1/*)
  // ============================================================================
  app.all('/api/v1/*', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestPath = req.path.replace(/\/$/, '');
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    try {
      // Step 1: Check Website Maintenance Mode
      const settings = await db.getSettings();
      if (settings?.maintenanceMode) {
        res.status(503).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'MAINTENANCE_MODE',
          message: settings.maintenanceMessage || 'Platform is currently under maintenance.',
        });
        return;
      }

      // Step 2: Lookup API Endpoint in DB
      const apiEndpoint = await db.getApiByEndpointPath(requestPath, req.method);
      if (!apiEndpoint) {
        res.status(404).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'ENDPOINT_NOT_FOUND',
          message: `No API endpoint registered for ${req.method} ${requestPath}`,
        });
        return;
      }

      if (apiEndpoint.status !== 'active') {
        res.status(503).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'ENDPOINT_UNAVAILABLE',
          message: `API '${apiEndpoint.name}' is currently ${apiEndpoint.status}.`,
        });
        return;
      }

      if (apiEndpoint.method.toUpperCase() !== req.method.toUpperCase()) {
        res.status(405).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'METHOD_NOT_ALLOWED',
          message: `Endpoint ${requestPath} requires HTTP ${apiEndpoint.method}.`,
        });
        return;
      }

      // Step 3: Check API Key Authentication
      const authHeader = String(req.headers.authorization || '');
      const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const headerKey = String(req.headers['x-api-key'] || '').trim();
      const queryKey = String(req.query.apikey || req.query.api_key || '').trim();
      const rawApiKey = bearerKey || headerKey || queryKey;

      if (!rawApiKey) {
        res.status(401).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'UNAUTHORIZED_API_KEY',
          message:
            'Missing API Key. Pass Header "Authorization: Bearer YOUR_API_KEY" with your request.',
        });
        return;
      }

      const apiKeyDoc = await db.getApiKeyByString(rawApiKey);
      if (!apiKeyDoc) {
        res.status(401).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'INVALID_API_KEY',
          message: 'The provided API key does not exist.',
        });
        return;
      }

      if (apiKeyDoc.status !== 'active') {
        res.status(403).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'API_KEY_INACTIVE',
          message: `This API key is currently ${apiKeyDoc.status}. Enable it or generate a new key in your dashboard.`,
        });
        return;
      }

      // Step 4: Check User Status
      const user = await db.getUserById(apiKeyDoc.userId);
      if (!user) {
        res.status(401).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'USER_ACCOUNT_NOT_FOUND',
          message: 'Account associated with this API key no longer exists.',
        });
        return;
      }

      if (user.status === 'banned') {
        res.status(403).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'USER_ACCOUNT_SUSPENDED',
          message: 'Your developer account has been suspended by an administrator.',
        });
        return;
      }

      // Step 5: Check Real Rate Limit (per minute & per day)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [reqsLastMinute, reqsLastDay] = await Promise.all([
        db.countUserRequestsSince(user._id, apiEndpoint._id, oneMinuteAgo),
        db.countUserRequestsSince(user._id, apiEndpoint._id, oneDayAgo),
      ]);

      const limitMin = apiEndpoint.rateLimitPerMinute || 60;
      const limitDay = apiEndpoint.rateLimitPerDay || 1000;

      res.setHeader('X-RateLimit-Limit-Minute', String(limitMin));
      res.setHeader('X-RateLimit-Remaining-Minute', String(Math.max(0, limitMin - reqsLastMinute - 1)));
      res.setHeader('X-RateLimit-Limit-Day', String(limitDay));
      res.setHeader('X-RateLimit-Remaining-Day', String(Math.max(0, limitDay - reqsLastDay - 1)));

      if (reqsLastMinute >= limitMin || reqsLastDay >= limitDay) {
        const responseTime = Date.now() - startTime;
        await db.createLog({
          _id: generateId(),
          userId: user._id,
          username: user.username,
          apiKeyId: apiKeyDoc._id,
          maskedKey: maskApiKey(apiKeyDoc.key),
          apiId: apiEndpoint._id,
          apiName: apiEndpoint.name,
          endpoint: apiEndpoint.endpoint,
          method: req.method,
          statusCode: 429,
          responseTime,
          coinsUsed: 0,
          ipAddress,
          requestParams: { ...req.query, ...req.body },
          errorMessage: 'RATE_LIMIT_EXCEEDED',
          createdAt: new Date().toISOString(),
        });
        await db.updateUser(user._id, {
          totalRequests: (user.totalRequests || 0) + 1,
          failedRequests: (user.failedRequests || 0) + 1,
        });

        res.status(429).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'RATE_LIMIT_EXCEEDED',
          message:
            reqsLastMinute >= limitMin
              ? `Rate limit exceeded: maximum ${limitMin} requests/minute allowed for ${apiEndpoint.name}.`
              : `Daily quota exceeded: maximum ${limitDay} requests/day allowed for ${apiEndpoint.name}.`,
          limits: {
            perMinute: limitMin,
            usedThisMinute: reqsLastMinute,
            perDay: limitDay,
            usedToday: reqsLastDay,
          },
        });
        return;
      }

      // Step 6: Check Coin Balance
      const coinCost = Math.max(0, apiEndpoint.coinCost || 0);
      if ((user.coins || 0) < coinCost) {
        const responseTime = Date.now() - startTime;
        await db.createLog({
          _id: generateId(),
          userId: user._id,
          username: user.username,
          apiKeyId: apiKeyDoc._id,
          maskedKey: maskApiKey(apiKeyDoc.key),
          apiId: apiEndpoint._id,
          apiName: apiEndpoint.name,
          endpoint: apiEndpoint.endpoint,
          method: req.method,
          statusCode: 402,
          responseTime,
          coinsUsed: 0,
          ipAddress,
          requestParams: { ...req.query, ...req.body },
          errorMessage: 'INSUFFICIENT_BESTIE_COINS',
          createdAt: new Date().toISOString(),
        });
        await db.updateUser(user._id, {
          totalRequests: (user.totalRequests || 0) + 1,
          failedRequests: (user.failedRequests || 0) + 1,
        });

        res.status(402).json({
          status: false,
          platform: '🦋 BESTIE API 🦋',
          error: 'INSUFFICIENT_BESTIE_COINS',
          message: `Insufficient BESTIE Coins. '${apiEndpoint.name}' requires ${coinCost} coin(s), but your current balance is ${user.coins} coin(s).`,
          requiredCoins: coinCost,
          currentBalance: user.coins,
        });
        return;
      }

      // Step 7: Execute Actual Backend API / Script
      const cleanQuery = { ...req.query };
      delete cleanQuery.apikey;
      delete cleanQuery.api_key;

      const execResult = await executeApiEndpoint(apiEndpoint, {
        query: cleanQuery,
        body: req.body || {},
        headers: req.headers,
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = execResult.statusCode >= 200 && execResult.statusCode < 400;
      const deductedCoins = isSuccess ? coinCost : 0;
      const newBalance = Math.max(0, (user.coins || 0) - deductedCoins);
      const nowIso = new Date().toISOString();

      // Step 8: Deduct Coins & Log Coin Transaction (if coins were spent)
      if (deductedCoins > 0) {
        await db.createTransaction({
          _id: generateId(),
          userId: user._id,
          username: user.username,
          type: 'api_usage',
          amount: -deductedCoins,
          balanceAfter: newBalance,
          description: `API Request: ${apiEndpoint.name} (${apiEndpoint.endpoint})`,
          createdAt: nowIso,
        });
      }

      // Step 9: Save Request Log
      await db.createLog({
        _id: generateId(),
        userId: user._id,
        username: user.username,
        apiKeyId: apiKeyDoc._id,
        maskedKey: maskApiKey(apiKeyDoc.key),
        apiId: apiEndpoint._id,
        apiName: apiEndpoint.name,
        endpoint: apiEndpoint.endpoint,
        method: req.method,
        statusCode: execResult.statusCode,
        responseTime,
        coinsUsed: deductedCoins,
        ipAddress,
        requestParams: { ...cleanQuery, ...(req.body || {}) },
        errorMessage: isSuccess ? '' : String(execResult.payload?.error || ''),
        createdAt: nowIso,
      });

      // Step 10: Update User, APIKey, and APIEndpoint Statistics
      await Promise.all([
        db.updateUser(user._id, {
          coins: newBalance,
          coinsUsed: (user.coinsUsed || 0) + deductedCoins,
          totalRequests: (user.totalRequests || 0) + 1,
          successfulRequests: (user.successfulRequests || 0) + (isSuccess ? 1 : 0),
          failedRequests: (user.failedRequests || 0) + (isSuccess ? 0 : 1),
        }),
        db.updateApiKey(apiKeyDoc._id, {
          totalRequests: (apiKeyDoc.totalRequests || 0) + 1,
          lastUsedAt: nowIso,
        }),
        db.updateApi(apiEndpoint._id, {
          totalCalls: (apiEndpoint.totalCalls || 0) + 1,
          avgResponseTime:
            apiEndpoint.totalCalls > 0
              ? Math.round(
                  (apiEndpoint.avgResponseTime * apiEndpoint.totalCalls + responseTime) /
                    (apiEndpoint.totalCalls + 1)
                )
              : responseTime,
        }),
      ]);

      res.setHeader('X-Bestie-Coins-Used', String(deductedCoins));
      res.setHeader('X-Bestie-Coins-Remaining', String(newBalance));
      res.setHeader('X-Response-Time', `${responseTime}ms`);

      res.status(execResult.statusCode).json({
        ...execResult.payload,
        meta: {
          coinsUsed: deductedCoins,
          coinsRemaining: newBalance,
          responseTimeMs: responseTime,
        },
      });
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      res.status(500).json({
        status: false,
        platform: '🦋 BESTIE API 🦋',
        error: 'INTERNAL_GATEWAY_ERROR',
        message: err?.message || 'Unexpected error executing API request.',
        meta: { responseTimeMs: responseTime },
      });
    }
  });

  // ============================================================================
  // 5. VITE DEV MIDDLEWARE / PRODUCTION STATIC ASSETS
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🦋 BESTIE API Platform running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
