import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  IUser,
  IAdmin,
  IAPIKey,
  IAPIEndpoint,
  IAPIRequest,
  ICoinTransaction,
  IDocumentation,
  ICategory,
  IWebsiteSettings,
  UserModel,
  AdminModel,
  APIKeyModel,
  APIEndpointModel,
  APIRequestModel,
  CoinTransactionModel,
  DocumentationModel,
  CategoryModel,
  WebsiteSettingsModel,
} from './models/schemas.js';
import { buildCodeExamples } from './services/codeExamples.js';

interface DiskDatabase {
  users: IUser[];
  admins: IAdmin[];
  apiKeys: IAPIKey[];
  apiEndpoints: IAPIEndpoint[];
  apiRequests: IAPIRequest[];
  coinTransactions: ICoinTransaction[];
  documentations: IDocumentation[];
  categories: ICategory[];
  websiteSettings: IWebsiteSettings[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bestie_mongodb_store.json');

export function generateId(): string {
  return crypto.randomBytes(12).toString('hex');
}

export function generateApiKeyString(): string {
  return `bst_live_${crypto.randomBytes(20).toString('hex')}`;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 14) return 'bst_live_****';
  return `${key.slice(0, 12)}••••••••${key.slice(-4)}`;
}

class DatabaseManager {
  public isMongoConnected = false;
  public storageMode: 'mongodb' | 'persistent-disk' = 'persistent-disk';
  private store: DiskDatabase = {
    users: [],
    admins: [],
    apiKeys: [],
    apiEndpoints: [],
    apiRequests: [],
    coinTransactions: [],
    documentations: [],
    categories: [],
    websiteSettings: [],
  };

  async initialize() {
    const mongoUri = (process.env.MONGODB_URI || '').trim();
    if (
      mongoUri &&
      (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://')) &&
      !mongoUri.includes('MY_MONGODB_URI')
    ) {
      try {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 5000,
        });
        this.isMongoConnected = true;
        this.storageMode = 'mongodb';
        console.log('[BESTIE DB] Connected to MongoDB successfully.');
      } catch (err: any) {
        console.warn(
          `[BESTIE DB] MongoDB connection failed (${err?.message}). Falling back to persistent disk store at ${DATA_FILE}.`
        );
        this.loadDiskStore();
      }
    } else {
      this.loadDiskStore();
    }

    await this.seedInitialData();
  }

  private loadDiskStore() {
    this.isMongoConnected = false;
    this.storageMode = 'persistent-disk';
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.store = {
          users: parsed.users || [],
          admins: parsed.admins || [],
          apiKeys: parsed.apiKeys || [],
          apiEndpoints: parsed.apiEndpoints || [],
          apiRequests: parsed.apiRequests || [],
          coinTransactions: parsed.coinTransactions || [],
          documentations: parsed.documentations || [],
          categories: parsed.categories || [],
          websiteSettings: parsed.websiteSettings || [],
        };
      } catch (e) {
        console.error('[BESTIE DB] Error reading disk store, initializing clean store:', e);
      }
    } else {
      this.saveDiskStore();
    }
  }

  private saveDiskStore() {
    if (this.isMongoConnected) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('[BESTIE DB] Failed to persist disk store:', e);
    }
  }

  private async seedInitialData() {
    const publicUrl =
      process.env.PUBLIC_URL ||
      process.env.APP_URL ||
      process.env.SERVER_URL ||
      'http://localhost:3000';
    const cleanBaseUrl = publicUrl.includes('MY_APP_URL')
      ? 'http://localhost:3000'
      : publicUrl.replace(/\/$/, '');

    // 1. Seed Website Settings
    const existingSettings = await this.getSettings();
    if (!existingSettings) {
      const defaultSettings: IWebsiteSettings = {
        _id: generateId(),
        websiteName: '🦋 BESTIE API 🦋',
        logoText: 'BESTIE API',
        faviconUrl: '/favicon.svg',
        tagline: 'Fast • Powerful • Developer Friendly API',
        heroTitle: 'Powerful APIs for Developers & Automation',
        heroSubtitle:
          'BESTIE API is a modern developer API platform that provides fast and easy-to-use APIs for bots, websites, applications and automation projects.',
        apiVersion: 'v1',
        baseUrl: cleanBaseUrl,
        newAccountBonusCoins: 50,
        dailyBonusCoins: 15,
        defaultRateLimitPerMinute: 60,
        defaultRateLimitPerDay: 1000,
        maintenanceMode: false,
        maintenanceMessage:
          'BESTIE API is currently undergoing scheduled maintenance. Please try again shortly.',
        socialLinks: {
          github: 'https://github.com/bestie-api',
          telegram: 'https://t.me/bestieapi',
          discord: 'https://discord.gg/bestieapi',
          twitter: 'https://x.com/bestieapi',
          email: 'support@bestieapi.dev',
        },
        updatedAt: new Date().toISOString(),
      };
      await this.saveSettings(defaultSettings);
    }

    // 2. Seed Admin Account from Environment Variables
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bestieapi.dev').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Bestie2026!';
    const existingAdmin = await this.getAdminByEmail(adminEmail);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await this.createAdmin({
        _id: generateId(),
        email: adminEmail,
        name: 'BESTIE Chief Administrator',
        passwordHash,
        role: 'superadmin',
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Seed API Categories
    const existingCategories = await this.getCategories();
    if (existingCategories.length === 0) {
      const defaultCategories: ICategory[] = [
        {
          _id: generateId(),
          name: 'Music APIs',
          slug: 'music',
          description: 'Search tracks, stream previews, artist discographies, and synced song lyrics.',
          icon: 'Music',
          order: 1,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: generateId(),
          name: 'Search APIs',
          slug: 'search',
          description: 'Real-time knowledge lookup across Wikipedia, GitHub repositories, and web indices.',
          icon: 'Search',
          order: 2,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: generateId(),
          name: 'Download APIs',
          slug: 'download',
          description: 'Direct release archive resolvers, QR asset generation, and media metadata fetchers.',
          icon: 'Download',
          order: 3,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: generateId(),
          name: 'AI APIs',
          slug: 'ai',
          description: 'Generative text, code synthesis, translation, and summarization powered by Gemini.',
          icon: 'Bot',
          order: 4,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: generateId(),
          name: 'Utility APIs',
          slug: 'utility',
          description: 'Cryptographic hashing, HMAC signatures, Base64/Hex encoding, and UUIDv4 generators.',
          icon: 'Wrench',
          order: 5,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: generateId(),
          name: 'Web APIs',
          slug: 'web',
          description: 'Live DNS resolution, HTTP response header inspection, latency metrics, and OpenGraph scraping.',
          icon: 'Globe',
          order: 6,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];
      for (const cat of defaultCategories) {
        await this.createCategory(cat);
      }
    }

    // 4. Seed Production API Endpoints & Documentation
    const existingApis = await this.getApis();
    if (existingApis.length === 0) {
      const now = new Date().toISOString();
      const seedApis: Omit<IAPIEndpoint, '_id'>[] = [
        {
          name: 'Music Track Search & Preview',
          slug: 'music-search',
          endpoint: '/api/v1/music/search',
          method: 'GET',
          description:
            'Search millions of songs by title or artist with high-resolution album artwork, duration, release date, and 30-second audio preview stream URLs.',
          category: 'music',
          categoryName: 'Music APIs',
          coinCost: 2,
          rateLimitPerMinute: 60,
          rateLimitPerDay: 1000,
          authRequired: true,
          status: 'active',
          featured: true,
          popular: true,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'music-search',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'query',
              type: 'string',
              required: true,
              defaultValue: 'The Weeknd Blinding Lights',
              description: 'Song title, artist name, or album keyword to search.',
              location: 'query',
            },
            {
              name: 'limit',
              type: 'number',
              required: false,
              defaultValue: '5',
              description: 'Number of tracks to return (1–25).',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/music/search',
            query: 'The Weeknd Blinding Lights',
            count: 1,
            result: [
              {
                trackId: 1488408568,
                title: 'Blinding Lights',
                artist: 'The Weeknd',
                album: 'After Hours',
                genre: 'R&B/Soul',
                durationFormatted: '3:20',
                artworkHighRes: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/.../600x600bb.jpg',
                previewAudioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/...',
              },
            ],
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'Synced Song Lyrics Lookup',
          slug: 'music-lyrics',
          endpoint: '/api/v1/music/lyrics',
          method: 'GET',
          description:
            'Fetch complete plain-text lyrics and time-synced LRC karaoke timestamps for any song by track title and optional artist name.',
          category: 'music',
          categoryName: 'Music APIs',
          coinCost: 2,
          rateLimitPerMinute: 60,
          rateLimitPerDay: 1000,
          authRequired: true,
          status: 'active',
          featured: false,
          popular: true,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'music-lyrics',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'track',
              type: 'string',
              required: true,
              defaultValue: 'Shape of You',
              description: 'Track title to search lyrics for.',
              location: 'query',
            },
            {
              name: 'artist',
              type: 'string',
              required: false,
              defaultValue: 'Ed Sheeran',
              description: 'Optional artist name for higher matching accuracy.',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/music/lyrics',
            result: {
              trackName: 'Shape of You',
              artistName: 'Ed Sheeran',
              albumName: '÷ (Deluxe)',
              durationSeconds: 233,
              plainLyrics: 'The club isn\'t the best place to find a lover...',
              syncedLyrics: '[00:12.40] The club isn\'t the best place to find a lover...',
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'Wikipedia Knowledge & Summary Search',
          slug: 'wiki-search',
          endpoint: '/api/v1/search/wikipedia',
          method: 'GET',
          description:
            'Query Wikipedia in real time to retrieve structured encyclopedic summaries, article extracts, thumbnails, and matching page links.',
          category: 'search',
          categoryName: 'Search APIs',
          coinCost: 1,
          rateLimitPerMinute: 100,
          rateLimitPerDay: 2000,
          authRequired: true,
          status: 'active',
          featured: true,
          popular: true,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'wiki-search',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'query',
              type: 'string',
              required: true,
              defaultValue: 'Sri Lanka',
              description: 'Topic, person, technology, or place to search.',
              location: 'query',
            },
            {
              name: 'lang',
              type: 'string',
              required: false,
              defaultValue: 'en',
              description: 'Wikipedia language edition code (e.g. en, si, fr, de).',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/search/wikipedia',
            query: 'Sri Lanka',
            result: {
              featuredArticle: {
                title: 'Sri Lanka',
                description: 'Island country in South Asia',
                extract: 'Sri Lanka, historically known as Ceylon...',
              },
              articles: [],
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'GitHub Repository Discovery',
          slug: 'github-search',
          endpoint: '/api/v1/search/github',
          method: 'GET',
          description:
            'Search open-source GitHub repositories sorted by star count with language breakdown, license metadata, clone URLs, and issue counts.',
          category: 'search',
          categoryName: 'Search APIs',
          coinCost: 1,
          rateLimitPerMinute: 60,
          rateLimitPerDay: 1000,
          authRequired: true,
          status: 'active',
          featured: false,
          popular: false,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'github-search',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'query',
              type: 'string',
              required: true,
              defaultValue: 'whatsapp bot nodejs',
              description: 'Search keywords or GitHub qualifiers.',
              location: 'query',
            },
            {
              name: 'limit',
              type: 'number',
              required: false,
              defaultValue: '5',
              description: 'Maximum repositories to return (1–20).',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/search/github',
            totalCount: 1420,
            result: [
              {
                fullName: 'WhiskeySockets/Baileys',
                stars: 4100,
                language: 'TypeScript',
                htmlUrl: 'https://github.com/WhiskeySockets/Baileys',
              },
            ],
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'GitHub Release & Archive Downloader',
          slug: 'github-release',
          endpoint: '/api/v1/download/github-release',
          method: 'GET',
          description:
            'Resolve direct downloadable ZIP/TAR.GZ archives and binary release assets with exact byte sizes and download statistics for any GitHub repository.',
          category: 'download',
          categoryName: 'Download APIs',
          coinCost: 3,
          rateLimitPerMinute: 40,
          rateLimitPerDay: 500,
          authRequired: true,
          status: 'active',
          featured: true,
          popular: true,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'github-release',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'repo',
              type: 'string',
              required: true,
              defaultValue: 'oven-sh/bun',
              description: 'GitHub repository in owner/name format.',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/download/github-release',
            repository: 'oven-sh/bun',
            result: {
              tagName: 'bun-v1.2.0',
              zipArchiveUrl: 'https://api.github.com/repos/oven-sh/bun/zipball/bun-v1.2.0',
              assets: [
                {
                  name: 'bun-linux-x64.zip',
                  sizeFormatted: '26.40 MB',
                  directDownloadUrl: 'https://github.com/oven-sh/bun/releases/download/...',
                },
              ],
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'QR Code SVG & PNG Asset Downloader',
          slug: 'qrcode-gen',
          endpoint: '/api/v1/download/qrcode',
          method: 'GET',
          description:
            'Generate high-resolution vector SVG and raster PNG QR codes with embedded base64 Data URIs ready for bots and web apps.',
          category: 'download',
          categoryName: 'Download APIs',
          coinCost: 2,
          rateLimitPerMinute: 100,
          rateLimitPerDay: 1500,
          authRequired: true,
          status: 'active',
          featured: false,
          popular: false,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'qrcode-gen',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'text',
              type: 'string',
              required: true,
              defaultValue: 'https://bestieapi.dev',
              description: 'URL or text payload to encode into the QR code.',
              location: 'query',
            },
            {
              name: 'size',
              type: 'number',
              required: false,
              defaultValue: '300',
              description: 'Pixel width/height between 128 and 1000.',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/download/qrcode',
            result: {
              encodedText: 'https://bestieapi.dev',
              dimensions: '300x300',
              format: 'svg',
              pngDownloadUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=...',
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'BESTIE AI Smart Completion',
          slug: 'ai-generate',
          endpoint: '/api/v1/ai/generate',
          method: 'POST',
          description:
            'Execute fast AI text generation, code synthesis, translation, and bot responses powered by Gemini 3.8 Flash.',
          category: 'ai',
          categoryName: 'AI APIs',
          coinCost: 3,
          rateLimitPerMinute: 30,
          rateLimitPerDay: 500,
          authRequired: true,
          status: 'active',
          featured: true,
          popular: true,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'ai-generate',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'prompt',
              type: 'string',
              required: true,
              defaultValue: 'Write a short welcome message for a developer joining BESTIE API.',
              description: 'User prompt or instruction for the AI model.',
              location: 'body',
            },
            {
              name: 'systemInstruction',
              type: 'string',
              required: false,
              defaultValue: 'You are BESTIE AI, a fast and helpful developer assistant.',
              description: 'Optional persona or system behavior instructions.',
              location: 'body',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/ai/generate',
            model: 'gemini-3.8-flash',
            result: {
              prompt: 'Write a short welcome message for a developer joining BESTIE API.',
              output: 'Welcome to BESTIE API! Grab your Bearer token, explore our endpoints, and build something remarkable.',
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'Cryptographic Hash & Token Utility',
          slug: 'crypto-utility',
          endpoint: '/api/v1/utility/crypto',
          method: 'POST',
          description:
            'Compute SHA-256, SHA-512, MD5, HMAC-SHA256 digests, Base64/Hex encodings, and cryptographically secure UUIDv4 tokens in one call.',
          category: 'utility',
          categoryName: 'Utility APIs',
          coinCost: 1,
          rateLimitPerMinute: 120,
          rateLimitPerDay: 3000,
          authRequired: true,
          status: 'active',
          featured: false,
          popular: false,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'crypto-utility',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'text',
              type: 'string',
              required: true,
              defaultValue: 'bestie-api-secret-payload',
              description: 'Input text string to hash and encode.',
              location: 'body',
            },
            {
              name: 'hmacSecret',
              type: 'string',
              required: false,
              defaultValue: 'my_webhook_secret',
              description: 'Optional secret key to compute an HMAC-SHA256 signature.',
              location: 'body',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/utility/crypto',
            result: {
              hashes: {
                sha256: '9c56cc51b374c3ba189210d5b6d4...',
              },
              generatedUuidV4: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          name: 'Website Metadata & DNS Inspector',
          slug: 'web-inspect',
          endpoint: '/api/v1/web/inspect',
          method: 'GET',
          description:
            'Perform live DNS A-record resolution, measure HTTP response latency, inspect security/server headers, and extract HTML title & OpenGraph tags.',
          category: 'web',
          categoryName: 'Web APIs',
          coinCost: 1,
          rateLimitPerMinute: 60,
          rateLimitPerDay: 1000,
          authRequired: true,
          status: 'active',
          featured: true,
          popular: false,
          totalCalls: 0,
          avgResponseTime: 0,
          handlerType: 'builtin',
          builtinHandler: 'web-inspect',
          customScript: '',
          proxyUrl: '',
          parameters: [
            {
              name: 'url',
              type: 'string',
              required: true,
              defaultValue: 'https://github.com',
              description: 'Target website URL or domain name to inspect.',
              location: 'query',
            },
          ],
          sampleResponse: {
            status: true,
            platform: '🦋 BESTIE API 🦋',
            endpoint: '/api/v1/web/inspect',
            result: {
              url: 'https://github.com/',
              hostname: 'github.com',
              ipv4Addresses: ['140.82.112.4'],
              httpStatus: 200,
              upstreamLatencyMs: 92,
              metadata: {
                title: 'GitHub · Build and ship software on a single, collaborative platform',
              },
            },
          },
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const apiItem of seedApis) {
        const created = await this.createApi({
          _id: generateId(),
          ...apiItem,
        });

        const codeExamples = buildCodeExamples({
          baseUrl: cleanBaseUrl,
          endpoint: created.endpoint,
          method: created.method,
          parameters: created.parameters,
        });

        const docItem: IDocumentation = {
          _id: generateId(),
          apiId: created._id,
          apiSlug: created.slug,
          apiName: created.name,
          category: created.categoryName,
          description: created.description,
          endpoint: created.endpoint,
          method: created.method,
          authentication: 'Authorization: Bearer YOUR_API_KEY',
          coinCost: created.coinCost,
          rateLimit: `${created.rateLimitPerMinute} requests/min · ${created.rateLimitPerDay} requests/day`,
          parameters: created.parameters,
          requestExample: `${created.method} ${cleanBaseUrl}${created.endpoint}`,
          responseExample: JSON.stringify(created.sampleResponse || {}, null, 2),
          errorCodes: [
            {
              code: 400,
              status: 'MISSING_REQUIRED_PARAMETER',
              description: 'A required query or JSON body parameter was omitted.',
            },
            {
              code: 401,
              status: 'UNAUTHORIZED_API_KEY',
              description: 'Missing, invalid, disabled, or revoked Bearer API key.',
            },
            {
              code: 402,
              status: 'INSUFFICIENT_BESTIE_COINS',
              description: 'Your account coin balance is lower than the endpoint coin cost.',
            },
            {
              code: 429,
              status: 'RATE_LIMIT_EXCEEDED',
              description: 'You have exceeded the per-minute or per-day request quota for this API.',
            },
          ],
          codeExamples,
          status: 'enabled',
          updatedAt: now,
        };
        await this.createDoc(docItem);
      }
    }
  }

  // ==================== SETTINGS ====================
  async getSettings(): Promise<IWebsiteSettings | null> {
    if (this.isMongoConnected) {
      const doc = await WebsiteSettingsModel.findOne().lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IWebsiteSettings) : null;
    }
    return this.store.websiteSettings[0] || null;
  }

  async saveSettings(settings: Partial<IWebsiteSettings>): Promise<IWebsiteSettings> {
    const existing = await this.getSettings();
    const updated: IWebsiteSettings = {
      ...(existing || {
        _id: generateId(),
        websiteName: '🦋 BESTIE API 🦋',
        logoText: 'BESTIE API',
        faviconUrl: '/favicon.svg',
        tagline: 'Fast • Powerful • Developer Friendly API',
        heroTitle: 'Powerful APIs for Developers & Automation',
        heroSubtitle:
          'BESTIE API is a modern developer API platform that provides fast and easy-to-use APIs for bots, websites, applications and automation projects.',
        apiVersion: 'v1',
        baseUrl: 'http://localhost:3000',
        newAccountBonusCoins: 50,
        dailyBonusCoins: 15,
        defaultRateLimitPerMinute: 60,
        defaultRateLimitPerDay: 1000,
        maintenanceMode: false,
        maintenanceMessage: 'Scheduled maintenance in progress.',
        socialLinks: {
          github: 'https://github.com/bestie-api',
          telegram: 'https://t.me/bestieapi',
          discord: 'https://discord.gg/bestieapi',
          twitter: 'https://x.com/bestieapi',
          email: 'support@bestieapi.dev',
        },
      }),
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected) {
      if (existing) {
        await WebsiteSettingsModel.updateOne({ _id: existing._id }, { $set: updated });
      } else {
        await WebsiteSettingsModel.create(updated);
      }
      return updated;
    }

    this.store.websiteSettings = [updated];
    this.saveDiskStore();
    return updated;
  }

  // ==================== ADMINS ====================
  async getAdminByEmail(email: string): Promise<IAdmin | null> {
    const normalized = email.trim().toLowerCase();
    if (this.isMongoConnected) {
      const doc = await AdminModel.findOne({ email: normalized }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAdmin) : null;
    }
    return this.store.admins.find((a) => a.email.toLowerCase() === normalized) || null;
  }

  async createAdmin(admin: IAdmin): Promise<IAdmin> {
    if (this.isMongoConnected) {
      const created = await AdminModel.create(admin);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.admins.push(admin);
    this.saveDiskStore();
    return admin;
  }

  async updateAdminLogin(id: string): Promise<void> {
    const now = new Date().toISOString();
    if (this.isMongoConnected) {
      await AdminModel.updateOne({ _id: id }, { $set: { lastLoginAt: now } });
      return;
    }
    const admin = this.store.admins.find((a) => a._id === id);
    if (admin) {
      admin.lastLoginAt = now;
      this.saveDiskStore();
    }
  }

  // ==================== USERS ====================
  async getUsers(): Promise<IUser[]> {
    if (this.isMongoConnected) {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IUser[];
    }
    return [...this.store.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getUserById(id: string): Promise<IUser | null> {
    if (this.isMongoConnected) {
      const doc = await UserModel.findById(id).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IUser) : null;
    }
    return this.store.users.find((u) => u._id === id) || null;
  }

  async getUserByEmailOrUsername(identifier: string): Promise<IUser | null> {
    const norm = identifier.trim().toLowerCase();
    if (this.isMongoConnected) {
      const doc = await UserModel.findOne({
        $or: [{ email: norm }, { username: new RegExp(`^${norm}$`, 'i') }],
      }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IUser) : null;
    }
    return (
      this.store.users.find(
        (u) => u.email.toLowerCase() === norm || u.username.toLowerCase() === norm
      ) || null
    );
  }

  async createUser(user: IUser): Promise<IUser> {
    if (this.isMongoConnected) {
      const created = await UserModel.create(user);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.users.push(user);
    this.saveDiskStore();
    return user;
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    if (this.isMongoConnected) {
      const doc = await UserModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IUser) : null;
    }
    const idx = this.store.users.findIndex((u) => u._id === id);
    if (idx === -1) return null;
    this.store.users[idx] = { ...this.store.users[idx], ...payload };
    this.saveDiskStore();
    return this.store.users[idx];
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await UserModel.findByIdAndDelete(id);
      await APIKeyModel.deleteMany({ userId: id });
      return true;
    }
    this.store.users = this.store.users.filter((u) => u._id !== id);
    this.store.apiKeys = this.store.apiKeys.filter((k) => k.userId !== id);
    this.saveDiskStore();
    return true;
  }

  // ==================== API KEYS ====================
  async getApiKeysByUser(userId: string): Promise<IAPIKey[]> {
    if (this.isMongoConnected) {
      const docs = await APIKeyModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IAPIKey[];
    }
    return this.store.apiKeys
      .filter((k) => k.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAllApiKeys(): Promise<IAPIKey[]> {
    if (this.isMongoConnected) {
      const docs = await APIKeyModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IAPIKey[];
    }
    return [...this.store.apiKeys].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getApiKeyByString(keyString: string): Promise<IAPIKey | null> {
    if (this.isMongoConnected) {
      const doc = await APIKeyModel.findOne({ key: keyString }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAPIKey) : null;
    }
    return this.store.apiKeys.find((k) => k.key === keyString) || null;
  }

  async getApiKeyById(id: string): Promise<IAPIKey | null> {
    if (this.isMongoConnected) {
      const doc = await APIKeyModel.findById(id).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAPIKey) : null;
    }
    return this.store.apiKeys.find((k) => k._id === id) || null;
  }

  async createApiKey(apiKey: IAPIKey): Promise<IAPIKey> {
    if (this.isMongoConnected) {
      const created = await APIKeyModel.create(apiKey);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.apiKeys.push(apiKey);
    this.saveDiskStore();
    return apiKey;
  }

  async updateApiKey(id: string, updates: Partial<IAPIKey>): Promise<IAPIKey | null> {
    if (this.isMongoConnected) {
      const doc = await APIKeyModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAPIKey) : null;
    }
    const idx = this.store.apiKeys.findIndex((k) => k._id === id);
    if (idx === -1) return null;
    this.store.apiKeys[idx] = { ...this.store.apiKeys[idx], ...updates };
    this.saveDiskStore();
    return this.store.apiKeys[idx];
  }

  async deleteApiKey(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await APIKeyModel.findByIdAndDelete(id);
      return true;
    }
    this.store.apiKeys = this.store.apiKeys.filter((k) => k._id !== id);
    this.saveDiskStore();
    return true;
  }

  // ==================== CATEGORIES ====================
  async getCategories(): Promise<ICategory[]> {
    if (this.isMongoConnected) {
      const docs = await CategoryModel.find().sort({ order: 1 }).lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as ICategory[];
    }
    return [...this.store.categories].sort((a, b) => a.order - b.order);
  }

  async createCategory(cat: ICategory): Promise<ICategory> {
    if (this.isMongoConnected) {
      const created = await CategoryModel.create(cat);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.categories.push(cat);
    this.saveDiskStore();
    return cat;
  }

  async updateCategory(id: string, updates: Partial<ICategory>): Promise<ICategory | null> {
    if (this.isMongoConnected) {
      const doc = await CategoryModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as ICategory) : null;
    }
    const idx = this.store.categories.findIndex((c) => c._id === id);
    if (idx === -1) return null;
    this.store.categories[idx] = { ...this.store.categories[idx], ...updates };
    this.saveDiskStore();
    return this.store.categories[idx];
  }

  async deleteCategory(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await CategoryModel.findByIdAndDelete(id);
      return true;
    }
    this.store.categories = this.store.categories.filter((c) => c._id !== id);
    this.saveDiskStore();
    return true;
  }

  // ==================== API ENDPOINTS ====================
  async getApis(): Promise<IAPIEndpoint[]> {
    if (this.isMongoConnected) {
      const docs = await APIEndpointModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IAPIEndpoint[];
    }
    return [...this.store.apiEndpoints];
  }

  async getApiBySlug(slug: string): Promise<IAPIEndpoint | null> {
    if (this.isMongoConnected) {
      const doc = await APIEndpointModel.findOne({ slug }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAPIEndpoint) : null;
    }
    return this.store.apiEndpoints.find((a) => a.slug === slug) || null;
  }

  async getApiByEndpointPath(endpointPath: string, method?: string): Promise<IAPIEndpoint | null> {
    const cleanPath = endpointPath.replace(/\/$/, '');
    if (this.isMongoConnected) {
      const query: any = { endpoint: cleanPath };
      if (method) query.method = method.toUpperCase();
      const doc = await APIEndpointModel.findOne(query).lean();
      if (doc) return { ...doc, _id: String(doc._id) } as IAPIEndpoint;
      const fallback = await APIEndpointModel.findOne({ endpoint: cleanPath }).lean();
      return fallback ? ({ ...fallback, _id: String(fallback._id) } as IAPIEndpoint) : null;
    }
    const exact = this.store.apiEndpoints.find(
      (a) =>
        a.endpoint.replace(/\/$/, '') === cleanPath &&
        (!method || a.method.toUpperCase() === method.toUpperCase())
    );
    if (exact) return exact;
    return this.store.apiEndpoints.find((a) => a.endpoint.replace(/\/$/, '') === cleanPath) || null;
  }

  async getApiById(id: string): Promise<IAPIEndpoint | null> {
    if (this.isMongoConnected) {
      const doc = await APIEndpointModel.findById(id).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAPIEndpoint) : null;
    }
    return this.store.apiEndpoints.find((a) => a._id === id) || null;
  }

  async createApi(api: IAPIEndpoint): Promise<IAPIEndpoint> {
    if (this.isMongoConnected) {
      const created = await APIEndpointModel.create(api);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.apiEndpoints.push(api);
    this.saveDiskStore();
    return api;
  }

  async updateApi(id: string, updates: Partial<IAPIEndpoint>): Promise<IAPIEndpoint | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    if (this.isMongoConnected) {
      const doc = await APIEndpointModel.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true }
      ).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IAPIEndpoint) : null;
    }
    const idx = this.store.apiEndpoints.findIndex((a) => a._id === id);
    if (idx === -1) return null;
    this.store.apiEndpoints[idx] = { ...this.store.apiEndpoints[idx], ...payload };
    this.saveDiskStore();
    return this.store.apiEndpoints[idx];
  }

  async deleteApi(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await APIEndpointModel.findByIdAndDelete(id);
      await DocumentationModel.deleteMany({ apiId: id });
      return true;
    }
    this.store.apiEndpoints = this.store.apiEndpoints.filter((a) => a._id !== id);
    this.store.documentations = this.store.documentations.filter((d) => d.apiId !== id);
    this.saveDiskStore();
    return true;
  }

  // ==================== DOCUMENTATION ====================
  async getDocs(): Promise<IDocumentation[]> {
    if (this.isMongoConnected) {
      const docs = await DocumentationModel.find().sort({ updatedAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IDocumentation[];
    }
    return [...this.store.documentations];
  }

  async getDocBySlug(apiSlug: string): Promise<IDocumentation | null> {
    if (this.isMongoConnected) {
      const doc = await DocumentationModel.findOne({ apiSlug }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IDocumentation) : null;
    }
    return this.store.documentations.find((d) => d.apiSlug === apiSlug) || null;
  }

  async createDoc(doc: IDocumentation): Promise<IDocumentation> {
    if (this.isMongoConnected) {
      const created = await DocumentationModel.create(doc);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.documentations.push(doc);
    this.saveDiskStore();
    return doc;
  }

  async updateDoc(id: string, updates: Partial<IDocumentation>): Promise<IDocumentation | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    if (this.isMongoConnected) {
      const doc = await DocumentationModel.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true }
      ).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as IDocumentation) : null;
    }
    const idx = this.store.documentations.findIndex((d) => d._id === id);
    if (idx === -1) return null;
    this.store.documentations[idx] = { ...this.store.documentations[idx], ...payload };
    this.saveDiskStore();
    return this.store.documentations[idx];
  }

  async deleteDoc(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await DocumentationModel.findByIdAndDelete(id);
      return true;
    }
    this.store.documentations = this.store.documentations.filter((d) => d._id !== id);
    this.saveDiskStore();
    return true;
  }

  // ==================== COIN TRANSACTIONS ====================
  async getTransactionsByUser(userId: string, limit = 100): Promise<ICoinTransaction[]> {
    if (this.isMongoConnected) {
      const docs = await CoinTransactionModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as ICoinTransaction[];
    }
    return this.store.coinTransactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getAllTransactions(limit = 500): Promise<ICoinTransaction[]> {
    if (this.isMongoConnected) {
      const docs = await CoinTransactionModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as ICoinTransaction[];
    }
    return [...this.store.coinTransactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async createTransaction(tx: ICoinTransaction): Promise<ICoinTransaction> {
    if (this.isMongoConnected) {
      const created = await CoinTransactionModel.create(tx);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.coinTransactions.push(tx);
    this.saveDiskStore();
    return tx;
  }

  // ==================== API REQUEST LOGS ====================
  async getLogsByUser(userId: string, limit = 100): Promise<IAPIRequest[]> {
    if (this.isMongoConnected) {
      const docs = await APIRequestModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IAPIRequest[];
    }
    return this.store.apiRequests
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getAllLogs(limit = 500): Promise<IAPIRequest[]> {
    if (this.isMongoConnected) {
      const docs = await APIRequestModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return docs.map((d) => ({ ...d, _id: String(d._id) })) as IAPIRequest[];
    }
    return [...this.store.apiRequests]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async createLog(log: IAPIRequest): Promise<IAPIRequest> {
    if (this.isMongoConnected) {
      const created = await APIRequestModel.create(log);
      return { ...created.toObject(), _id: String(created._id) };
    }
    this.store.apiRequests.push(log);
    if (this.store.apiRequests.length > 5000) {
      this.store.apiRequests = this.store.apiRequests.slice(-5000);
    }
    this.saveDiskStore();
    return log;
  }

  async countUserRequestsSince(userId: string, apiId: string, sinceIso: string): Promise<number> {
    if (this.isMongoConnected) {
      return APIRequestModel.countDocuments({
        userId,
        apiId,
        createdAt: { $gte: sinceIso },
      });
    }
    return this.store.apiRequests.filter(
      (r) => r.userId === userId && r.apiId === apiId && r.createdAt >= sinceIso
    ).length;
  }
}

export const db = new DatabaseManager();
