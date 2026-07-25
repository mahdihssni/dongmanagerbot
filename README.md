# DongBot — Telegram Mini App

Persian-first Telegram Web App for group expense splitting (دانگه / dong). Built with **Next.js App Router + TypeScript**, deployable to **Vercel**.

This repository is the **frontend Mini App**, not a bot webhook server. The bot only needs a menu button / inline button pointing at the deployed URL.

## Architecture

```
src/
  app/                 # Screens + API routes
  components/          # UI primitives + shell
  features/            # Multi-step flows (expense wizard, invites)
  domain/              # Types + pure helpers
  engine/              # Calculation: money, splits, balances, settlement
  lib/db/              # MongoDB client + collections
  lib/auth/            # Telegram initData HMAC validation
  lib/services/        # Server use-cases (groups/members/expenses/invites)
  lib/telegram/        # WebApp SDK helpers
  lib/i18n/            # fa / en copy
  lib/persistence/     # localStorage cache + remote API client
  store/               # React context app state
```

**Persistence modes**

- If `MONGODB_URI` is set → MongoDB is the source of truth; the client talks to `/api/*` with Telegram `initData`.
- If unset → full localStorage mode (single-device / offline demos).

Balances/settlement stay pure client-side from fetched expenses.

### Data model (simplified)

| Entity | Key fields |
|--------|------------|
| User | id, telegramId, firstName, languageCode |
| Group | id, name, currency |
| Member | id, groupId, displayName, isActive |
| Expense | amount (integer minor units), payerId, splitType, participantIds, shares |
| Balance | memberId, net / paid / owed (derived) |
| Settlement | from → to + amount (derived, minimized transfers) |

### Split types

`equal` · `exact` · `percentage` · `shares` · `full` · `transfer` · `refund` · `adjustment`

Balances are deterministic integers. Settlement uses a greedy largest-debtor → largest-creditor algorithm that zeroes all nets with few transfers.

## Local setup

```bash
cp .env.example .env.local
yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Telegram / MongoDB, the app runs in **local development mode** with a demo user and localStorage. Theme falls back to CSS defaults.

### Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_APP_URL` | Public | Mini App HTTPS URL |
| `NEXT_PUBLIC_APP_ENV` | Public | `development` / `production` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Public | Invite deep links |
| `NEXT_PUBLIC_TELEGRAM_APP_SHORT_NAME` | Public | Optional Direct Link app name |
| `NEXT_PUBLIC_ALLOW_DEV_AUTH` | Public | Browser sends `x-dev-user` (dev only) |
| `MONGODB_URI` | Server | Atlas connection string |
| `MONGODB_DB` | Server | DB name (default `dongbot`) |
| `TELEGRAM_BOT_TOKEN` | Server | Validate WebApp `initData` (never expose) |
| `ALLOW_DEV_AUTH` | Server | Accept `x-dev-user` when token/initData missing |

## MongoDB Atlas (free) + Vercel

1. Create a free **M0** cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a DB user and allow network access (`0.0.0.0/0` for Vercel, or Atlas VPC later).
3. Copy the `mongodb+srv://…` URI into Vercel / `.env.local` as `MONGODB_URI`.
4. Set `TELEGRAM_BOT_TOKEN` from BotFather.
5. Redeploy. Check `GET /api/health` → `mongoConfigured: true`, `mongoConnected: true`.

With Mongo enabled, invites resolve by `inviteCode` on the server — friends joining via `startapp=j_<code>` share the same group.

## Scripts

```bash
yarn dev
yarn build
yarn start
yarn test
yarn typecheck
yarn lint
yarn ci
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set env vars (`NEXT_PUBLIC_APP_URL`, `MONGODB_URI`, `TELEGRAM_BOT_TOKEN`, bot username).
4. Deploy. Framework preset: **Next.js**.

Health check: `GET /api/health`.

Telegram requires **HTTPS**. Use the Vercel URL (or a custom domain).

## Invite links

Each group has an `inviteCode`. Sharing uses Telegram’s share sheet:

```text
https://t.me/<BOT_USERNAME>?startapp=j_<inviteCode>
```

Set in `.env`:

- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `NEXT_PUBLIC_TELEGRAM_APP_SHORT_NAME` (optional Direct Link app name)

Primary UX: **Invite friends** on the Members screen. Manual name add is a collapsed fallback.

When a friend opens the link, `start_param` is consumed and they join via `POST /api/invites/:code` (Mongo mode) or local shell params (localStorage mode).

## Connect to a Telegram bot

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Configure the Web App entry point:

### Menu button

In BotFather:

```
/setmenubutton
```

Choose your bot → set URL to:

```
https://YOUR_VERCEL_URL
```

### Direct Web App command (Bot API)

```http
POST https://api.telegram.org/bot<TOKEN>/setChatMenuButton
{
  "menu_button": {
    "type": "web_app",
    "text": "دانگ‌بات",
    "web_app": { "url": "https://YOUR_VERCEL_URL" }
  }
}
```

### Inline keyboard button

Send a message with:

```json
{
  "inline_keyboard": [[
    {
      "text": "باز کردن دانگ‌بات",
      "web_app": { "url": "https://YOUR_VERCEL_URL" }
    }
  ]]
}
```

The Mini App loads `telegram-web-app.js`, calls `WebApp.ready()` / `expand()`, reads `initDataUnsafe.user` and `themeParams`, and applies safe-area CSS variables.

## Screens

1. Home dashboard  
2. Create group  
3. Group detail  
4. Add expense (conversational wizard)  
5. Expense history  
6. Edit / delete expense  
7. Balances  
8. Settlement suggestions  
9. Members  
10. Export summary  
11. Settings (language fa/en)

## Example copy

| Key | فارسی | English |
|-----|--------|---------|
| appName | دانگ‌بات | DongBot |
| addExpense | ثبت هزینه | Add expense |
| settle | تسویه | Settle up |
| equal | مساوی | Equal |
| noGroups | هنوز گروهی نساخته‌اید | No groups yet |

## Future backend notes

- Init-data HMAC lives in `src/lib/auth/telegram.ts` (server only).
- Keep `src/engine/*` as the shared calculation source of truth.
- Resource APIs already cover me / groups / members / expenses / invites.

## Production checklist

Before going live on Vercel:

1. Set env vars: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (+ optional app short name).
2. Deploy over **HTTPS** and point BotFather menu / Web App button at that URL.
3. Confirm `GET /api/health` returns `ok: true` and `botConfigured: true`.
4. Run locally: `yarn ci` (typecheck + lint + test + build).
5. Open the Mini App inside Telegram and verify theme, safe-area, invite share, and expense wizard.

### Production hardening included

- App Router `error` / `global-error` / `not-found` / `loading`
- Security headers + CSP (Telegram script + WebView frame ancestors)
- `robots.txt` + metadata `noindex`
- Persistence sanitization + quota-safe saves
- Balances skip corrupt expenses instead of crashing
- Invite shell currency/id validation; bootstrap only marks handled on success
- Closing confirmation while expense wizard is dirty
- CI workflow (`.github/workflows/ci.yml`)
- Init-data HMAC validation notes for a future server route (`src/lib/telegram/validate-init-data.ts`)

### Still optional / next steps

- Automated migration of old localStorage data into Mongo
- Real-time multi-tab sync
- Stricter production CSP if you drop inline styles

## License

Private / project use.
