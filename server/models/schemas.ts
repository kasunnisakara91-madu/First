import mongoose, { Schema, Document } from 'mongoose';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  coins: number;
  coinsUsed: number;
  coinsReceived: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  status: 'active' | 'banned';
  lastDailyBonusAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAdmin {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface IAPIKey {
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

export interface IAPIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string;
  description: string;
  location: 'query' | 'body' | 'header';
}

export interface IAPIEndpoint {
  _id: string;
  name: string;
  slug: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  category: string; // category slug
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
  parameters: IAPIParameter[];
  sampleResponse?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAPIRequest {
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
  responseTime: number; // ms
  coinsUsed: number;
  ipAddress: string;
  requestParams?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
}

export interface ICoinTransaction {
  _id: string;
  userId: string;
  username: string;
  type: 'bonus' | 'daily_reward' | 'admin_add' | 'admin_remove' | 'admin_set' | 'api_usage';
  amount: number; // positive for credit, negative for debit
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface IDocumentation {
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
  parameters: IAPIParameter[];
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

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface IWebsiteSettings {
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
  updatedAt: string;
}

// Mongoose Schemas for MongoDB Persistence
const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  coins: { type: Number, default: 50 },
  coinsUsed: { type: Number, default: 0 },
  coinsReceived: { type: Number, default: 50 },
  totalRequests: { type: Number, default: 0 },
  successfulRequests: { type: Number, default: 0 },
  failedRequests: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'banned'], default: 'active' },
  lastDailyBonusAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

const AdminSchema = new Schema<IAdmin>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin'], default: 'superadmin' },
  lastLoginAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const APIKeySchema = new Schema<IAPIKey>({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['active', 'disabled', 'revoked'], default: 'active' },
  totalRequests: { type: Number, default: 0 },
  lastUsedAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const APIEndpointSchema = new Schema<IAPIEndpoint>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  categoryName: { type: String, required: true },
  coinCost: { type: Number, default: 1 },
  rateLimitPerMinute: { type: Number, default: 60 },
  rateLimitPerDay: { type: Number, default: 1000 },
  authRequired: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'disabled', 'maintenance'], default: 'active' },
  featured: { type: Boolean, default: false },
  popular: { type: Boolean, default: false },
  totalCalls: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  handlerType: { type: String, enum: ['builtin', 'script', 'proxy'], default: 'builtin' },
  builtinHandler: { type: String, default: '' },
  customScript: { type: String, default: '' },
  proxyUrl: { type: String, default: '' },
  parameters: { type: [Schema.Types.Mixed] as any, default: [] },
  sampleResponse: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

const APIRequestSchema = new Schema<IAPIRequest>({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  apiKeyId: { type: String, required: true },
  maskedKey: { type: String, required: true },
  apiId: { type: String, required: true, index: true },
  apiName: { type: String, required: true },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true },
  coinsUsed: { type: Number, required: true },
  ipAddress: { type: String, default: '127.0.0.1' },
  requestParams: { type: Object, default: {} },
  errorMessage: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString(), index: true },
});

const CoinTransactionSchema = new Schema<ICoinTransaction>({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  type: {
    type: String,
    enum: ['bonus', 'daily_reward', 'admin_add', 'admin_remove', 'admin_set', 'api_usage'],
    required: true,
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString(), index: true },
});

const DocumentationSchema = new Schema<IDocumentation>({
  apiId: { type: String, required: true, index: true },
  apiSlug: { type: String, required: true, unique: true },
  apiName: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  endpoint: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
  authentication: { type: String, default: 'Authorization: Bearer YOUR_API_KEY' },
  coinCost: { type: Number, default: 1 },
  rateLimit: { type: String, default: '60 req/min · 1000 req/day' },
  parameters: { type: [Schema.Types.Mixed] as any, default: [] },
  requestExample: { type: String, default: '' },
  responseExample: { type: String, default: '' },
  errorCodes: { type: [Schema.Types.Mixed] as any, default: [] },
  codeExamples: {
    javascript: { type: String, default: '' },
    nodejs: { type: String, default: '' },
    python: { type: String, default: '' },
    curl: { type: String, default: '' },
  },
  status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'Code' },
  order: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const WebsiteSettingsSchema = new Schema<IWebsiteSettings>({
  websiteName: { type: String, default: '🦋 BESTIE API 🦋' },
  logoText: { type: String, default: 'BESTIE API' },
  faviconUrl: { type: String, default: '/favicon.svg' },
  tagline: { type: String, default: 'Fast • Powerful • Developer Friendly API' },
  heroTitle: { type: String, default: 'Powerful APIs for Developers & Automation' },
  heroSubtitle: {
    type: String,
    default:
      'BESTIE API is a modern developer API platform that provides fast and easy-to-use APIs for bots, websites, applications and automation projects.',
  },
  apiVersion: { type: String, default: 'v1' },
  baseUrl: { type: String, default: '' },
  newAccountBonusCoins: { type: Number, default: 50 },
  dailyBonusCoins: { type: Number, default: 15 },
  defaultRateLimitPerMinute: { type: Number, default: 60 },
  defaultRateLimitPerDay: { type: Number, default: 1000 },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: {
    type: String,
    default: 'BESTIE API is currently undergoing scheduled maintenance. Please try again shortly.',
  },
  socialLinks: {
    github: { type: String, default: 'https://github.com/bestie-api' },
    telegram: { type: String, default: 'https://t.me/bestieapi' },
    discord: { type: String, default: 'https://discord.gg/bestieapi' },
    twitter: { type: String, default: 'https://x.com/bestieapi' },
    email: { type: String, default: 'support@bestieapi.dev' },
  },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const AdminModel = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
export const APIKeyModel = mongoose.models.APIKey || mongoose.model<IAPIKey>('APIKey', APIKeySchema);
export const APIEndpointModel =
  mongoose.models.APIEndpoint || mongoose.model<IAPIEndpoint>('APIEndpoint', APIEndpointSchema);
export const APIRequestModel =
  mongoose.models.APIRequest || mongoose.model<IAPIRequest>('APIRequest', APIRequestSchema);
export const CoinTransactionModel =
  mongoose.models.CoinTransaction ||
  mongoose.model<ICoinTransaction>('CoinTransaction', CoinTransactionSchema);
export const DocumentationModel =
  mongoose.models.Documentation ||
  mongoose.model<IDocumentation>('Documentation', DocumentationSchema);
export const CategoryModel =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const WebsiteSettingsModel =
  mongoose.models.WebsiteSettings ||
  mongoose.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsSchema);
