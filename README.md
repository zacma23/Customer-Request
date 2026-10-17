# Zacma Technologies — Customer Request & Feedback Management Platform

[![CI Pipeline](https://github.com/zacma/customer-request-feedback-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/zacma/customer-request-feedback-platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748)](https://www.prisma.io/)
[![Anthropic Claude](https://img.shields.io/badge/Claude-3.5%20Sonnet-d97706)](https://www.anthropic.com/)

A production-ready, all-in-one business operations platform designed for technology solutions providers delivering 9 core services:
1. **Telegram Bot Development** (Telebirr & CBE integrated e-commerce & customer service bots)
2. **WhatsApp Bot Solutions** (Meta Cloud API customer intake & automation)
3. **Marketing Website Development** (High-converting, responsive landing pages)
4. **Mobile App Development** (Cross-platform iOS & Android solutions)
5. **IT Support & Systems Administration** (Infrastructure, servers & cloud monitoring)
6. **Digital Marketing & SEO** (Search engine optimization & audience growth)
7. **Facebook Marketing Campaigns** (Targeted Meta advertising & conversion funnels)
8. **YouTube Marketing & Video Production** (Channel management & sponsor campaigns)
9. **E-Commerce Platforms** (Full digital storefronts with local Ethiopian payment gateways)

---

## 1. Key Capabilities & Architectural Highlights

- **Client Self-Service Portal**: Clients register with Ethiopian mobile numbers (`+251 9...` Ethio Telecom / `+251 7...` Safaricom), submit multi-service requests, track live 7-stage project milestones, attend discovery meetings, pay via Telebirr or CBE bank transfer, upload payment receipts, and submit verified feedback.
- **Unified Admin Control Center**: Technical leadership manages incoming tickets, executes one-click status transitions, generates itemized AI quotations with 15% VAT, reviews payment slips, verifies bank transactions, and views real-time CSAT analytics.
- **Claude 3.5 Sonnet AI Engine**: Automatically analyzes request sentiment, priority, category, and language (English, Amharic, Afaan Oromo). Features deterministic offline heuristic fallbacks when working offline or without API credits.
- **Omnichannel Intake (Telegram & WhatsApp)**: Clients can start requests and receive milestone alerts directly within Telegram (`@ZacmaTechBot`) and WhatsApp.
- **Real-Time Event Hub (SSE)**: Unidirectional Server-Sent Events notify clients and admins immediately of new messages, meeting invites, payment requests, and status changes without polling.
- **Strict IDOR & Security Guardrails**: Cross-tenant data isolation, rotating 7-day HTTP-only refresh tokens, 15-minute access JWTs, account lockout protection after 5 failed logins, and automatic masking of cards, tokens, and passwords in logs and AI prompts.

---

## 2. Default Assumptions Resolved

| Area | Default Resolution | Rationale |
| :--- | :--- | :--- |
| **Timezone** | Stored in `UTC`, formatted in `Africa/Addis_Ababa` (UTC+3) | Ensures clean server-side audits while respecting Ethiopian business hours. |
| **Currencies** | `ETB` (Ethiopian Birr) primary, `USD` supported | Matches local payment realities while supporting diaspora and international clientele. |
| **Payment Gateways** | Commercial Bank of Ethiopia (CBE) and Telebirr | The two dominant payment rails in Ethiopia. Admin uploads bank details and verifies slips. |
| **OTP Provider** | `ConsoleOtpSender` in development; abstract interface for SMS gateways | Enables frictionless local testing and zero-cost test runs without consuming SMS credits. |
| **AI Model** | `claude-3-5-sonnet-20241022` with offline heuristic fallback | Provides state-of-the-art multilingual analysis while maintaining 100% test reliability offline. |

---

## 3. Tech Stack

- **Monorepo**: npm workspaces (`apps/api`, `apps/web`)
- **Backend**: Node.js 20+, Express 4, TypeScript 5.7, Prisma ORM 6.4, PostgreSQL 16
- **Frontend**: React 18, Vite 6, TypeScript 5.7, Tailwind CSS, TanStack Query, React Hook Form + Zod, Lucide Icons
- **Real-time**: Server-Sent Events (SSE) with per-user channels and administrative broadcast
- **AI**: `@anthropic-ai/sdk` (Claude 3.5 Sonnet) + Ethiopic language processing
- **Testing**: Vitest, Supertest, Playwright

---

## 4. Default Seed Accounts

The platform comes pre-seeded with test accounts for each role (`password: AdminPass123!` or `ClientPass123!`):

| Role | Name | Phone / Login | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Henok Admin | `+251911000001` (`admin@zacma.com`) | `AdminPass123!` | Full system, settings, staff, and audit trail access |
| **STAFF** | Selamawit Staff | `+251911000002` (`staff@zacma.com`) | `StaffPass123!` | Request management, meeting scheduler, AI drafts |
| **CLIENT** | Dawit Client | `+251911000003` (`dawit@example.com`) | `ClientPass123!` | Client portal, Telegram Bot request, payment proof |
| **CLIENT** | Bethlehem Haile | `+251911000004` (`betty@example.com`) | `ClientPass123!` | Client portal, E-Commerce request |
| **CLIENT** | Almaz Kebede | `+251911000005` (`almaz@example.com`) | `ClientPass123!` | Client portal, Mobile app request |

---

## 5. Local Development Setup

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher
- Docker & Docker Compose (or local PostgreSQL 16)

### Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zacma/customer-request-feedback-platform.git
   cd customer-request-feedback-platform
   ```

2. **Install all dependencies across monorepo**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Update PostgreSQL credentials or Claude API keys in `.env` if desired)*

4. **Initialize Database & Seed Data**:
   ```bash
   # Push schema to database
   npm run prisma:generate
   npx prisma db push --schema=prisma/schema.prisma

   # Seed services, templates, demo users, requests and payments
   npm run prisma:seed
   ```

5. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend Web Portal**: [http://localhost:5173](http://localhost:5173)
   - **Backend REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
   - **Interactive Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

---

## 6. Docker Deployment

Run the complete multi-container stack (PostgreSQL 16, Express API, Nginx React SPA) with a single command:

```bash
docker compose up --build -d
```

- Web Portal accessible at: `http://localhost:80`
- API accessible at: `http://localhost:5000`
- Database persistent volume: `postgres_data`

To shut down:
```bash
docker compose down
```

---

## 7. Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | API server listening port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://zacma_admin:zacma_secret_password_2026@localhost:5432/zacma_db?schema=public` |
| `JWT_ACCESS_SECRET` | Secret key for signing 15-minute access tokens | 64+ char random hex |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | 64+ char random hex |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_DAYS` | Refresh token lifetime | `7` |
| `COOKIE_SECRET` | Secret for signed httpOnly cookies | 32+ char random hex |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | `sk-ant-api03-...` (optional, falls back to heuristic engine) |
| `ANTHROPIC_MODEL` | Claude model identifier | `claude-3-5-sonnet-20241022` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token from `@BotFather` | `123456789:ABCdefGHI...` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret header token (`X-Telegram-Bot-Api-Secret-Token`) | Random string |
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API access token | `EAAB...` |
| `WHATSAPP_PHONE_NUMBER_ID`| Meta Phone Number ID | `1000123456789` |
| `WHATSAPP_VERIFY_TOKEN` | Meta Webhook subscription verification token | `zacma_meta_webhook_verify_secret_2026` |
| `STORAGE_TYPE` | File storage provider (`LOCAL` or `S3`) | `LOCAL` |
| `UPLOAD_DIR` | Local storage directory path | `./uploads` |

---

## 8. Telegram Bot Integration Guide

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`, choose a name (`Zacma Tech Bot`) and username (`ZacmaTechSolutionsBot`).
3. Copy the HTTP API token into `TELEGRAM_BOT_TOKEN` in `.env`.
4. Register the webhook pointing to your public domain or ngrok tunnel:
   ```bash
   curl -F "url=https://your-domain.com/api/v1/webhooks/telegram" \
        -F "secret_token=your_telegram_webhook_secret_here" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```
5. In the bot, users send `/start` or send a 6-digit sync code generated from **Client Profile -> Connect Telegram** to link their account and receive instant updates.

---

## 9. WhatsApp Cloud API Integration Guide

1. Create an app in [Meta for Developers](https://developers.facebook.com/) and add the **WhatsApp** product.
2. In the WhatsApp Getting Started page, copy the **Temporary Access Token** and **Phone Number ID**.
3. In **Configuration -> Webhooks**:
   - Callback URL: `https://your-domain.com/api/v1/webhooks/whatsapp`
   - Verify Token: Matches `WHATSAPP_VERIFY_TOKEN` from `.env`.
4. Subscribe to the `messages` webhook field.
5. Inbound client messages to the WhatsApp business number will automatically map to customer profiles and notify account managers.

---

## 10. Automated Testing & Quality Assurance

Run all test suites across the monorepo:

```bash
# Run unit & integration test suites
npm run test:api

# Run full TypeScript validation & production build for backend
npm run build:api

# Run full TypeScript validation & production build for web frontend
npm run build:web
```

### Test Coverage Highlights:
- **Phone Number Parsing**: E.164 normalization, Ethiopian prefixes (`09...`, `07...`, `+251...`), Safaricom & Ethio Telecom routing, and length bounds.
- **Sensitive Data Masking**: Automatic redacting of credit card numbers, passwords, auth tokens, and API keys.
- **Security & IDOR**: Verifies that unauthenticated requests and cross-client requests to protected tickets receive HTTP 401/403.
- **AI Heuristics & Multilingual Engine**: Tests classification across all 9 services, Amharic Ethiopic script detection, Afaan Oromo keyword matching, and 15% VAT quotation calculations.

---

## 11. Documentation Links

- [System Architecture Specification](docs/architecture.md)
- [Entity-Relationship Diagram (19 Models)](docs/er-diagram.md)
- [OpenAPI 3.0 Specification (JSON)](docs/openapi.json)
- [Interactive Swagger UI](http://localhost:5000/api/docs)

---

## 12. License

Distributed under the MIT License. Built with excellence for **Zacma Technologies**.
