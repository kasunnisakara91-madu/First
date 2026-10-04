# 🦋 BESTIE API 🦋

**Fast • Powerful • Developer Friendly API Platform**

BESTIE API is a full-stack developer API platform built with Node.js, Express, TypeScript, MongoDB (Mongoose), and React. It enables developers to register accounts, generate and manage Bearer API keys, manage BESTIE Coins credits, test live APIs in real time, browse interactive multi-language documentation, and gives administrators a complete management console.

---

## ⚡ Features

- **API Portal (`/`, `/apis`, `/api/:slug`)**: Browse Featured, Popular, and Latest APIs organized by category with method, endpoint, live status, and coin cost.
- **BESTIE Coin System**: Configurable per-endpoint coin deduction, new account welcome bonus, once-per-day Daily Bonus reward, and full transaction ledger.
- **API Key Management**: Generate, copy, regenerate, enable, disable, and revoke `Authorization: Bearer bst_live_...` API keys.
- **Live API Tester (`/tester`)**: Send real HTTP requests against backend endpoints using your API key, inspect status codes, response latency (`ms`), coin headers, and JSON payloads.
- **Interactive Documentation (`/docs`)**: Complete endpoint specifications with parameters, error codes, and copy-ready code examples in **JavaScript**, **Node.js**, **Python**, and **cURL**.
- **Custom Script & Existing API Integration Engine**: Connect your own working Node.js scripts or upstream APIs directly via the Admin API Manager (`/admin/apis`) or `server/services/apiExecutor.ts` with automatic API key authentication, coin deduction, rate limiting, and request logging.
- **Admin Control Panel (`/admin/*`)**:
  - `/admin/login` — Secure JWT Admin authentication configured via `.env`
  - `/admin/dashboard` — Real-time metrics, charts, request volume, coin distribution, and server uptime
  - `/admin/users` — View, search, edit, ban/unban, delete users, and reset API keys
  - `/admin/apis` — Add, edit, enable/disable, delete APIs & categories, and attach custom scripts
  - `/admin/api-keys` — Monitor and control all developer API keys
  - `/admin/coins` — Add, remove, or set user coin balances with audit logs
  - `/admin/transactions` — Complete platform coin transaction history
  - `/admin/logs` — Real-time API request logs with latency and status codes
  - `/admin/docs` — Manage public API documentation dynamically
  - `/admin/settings` — Configure branding, coin bonuses, rate limits, and maintenance mode

---

## 🚀 Deployment (Railway / Render / VPS)

### 1. Environment Variables (`.env`)

Configure the following variables in your hosting environment:

```env
PORT=3000
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bestie_api"
JWT_SECRET="replace_with_a_strong_random_secret"
ADMIN_EMAIL="admin@bestieapi.dev"
ADMIN_PASSWORD="YourStrongAdminPassword!"
PUBLIC_URL="https://your-domain.com"
SERVER_URL="https://your-domain.com"
GEMINI_API_KEY="your_gemini_api_key"
```

### 2. Build & Start Commands

- **Install**: `npm install`
- **Build**: `npm run build`
- **Start**: `npm start`
