# DongBot — Telegram Mini App

Persian-first Telegram Web App for group expense splitting (دانگه / dong). Built with **Next.js App Router + TypeScript**, deployable to **Vercel**.

This repository is the **frontend Mini App**, not a bot webhook server. The bot only needs a menu button / inline button pointing at the deployed URL.

## Architecture

```
src/
  app/                 # Screens (App Router)
  components/          # UI primitives + shell
  features/            # Multi-step flows (expense wizard)
  domain/              # Types + pure helpers (User, Group, Member, Expense…)
  engine/              # Calculation: money, splits, balances, settlement
  lib/telegram/        # WebApp SDK helpers + local-dev fallback
  lib/i18n/            # fa / en copy
  lib/persistence/     # localStorage now, ApiRepository later
  store/               # React context app state
```

**Domain / UI separation:** screens and components never compute balances themselves beyond calling pure engine functions. Persistence is behind a repository interface so you can swap `localStorage` for an API without rewriting UX.

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
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Telegram, the app runs in **local development mode** with a demo user and sample group (“سفر شمال”). Theme falls back to CSS defaults.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public HTTPS URL of the Mini App (used when configuring the bot) |
| `NEXT_PUBLIC_APP_ENV` | `development` / `production` |
| `NEXT_PUBLIC_API_BASE_URL` | Optional future backend base URL |

## Scripts

```bash
npm run dev      # local Next.js
npm run build    # production build
npm run start    # serve build
npm test         # vitest — engine / settlement
npm run lint
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://dongbot.vercel.app`).
4. Deploy. Framework preset: **Next.js**.

Health check: `GET /api/health`.

Telegram requires **HTTPS**. Use the Vercel URL (or a custom domain).

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

## Future backend

1. Implement `ApiRepository` (`src/lib/persistence/api-repository.ts`).
2. Validate Telegram `initData` on the server (HMAC) before mutating data.
3. Keep `src/engine/*` as the shared calculation source of truth.

## Notes / edge cases covered

- Integer money + remainder distribution (no floating drift)
- Invalid % / exact sums rejected before save
- Payer included or excluded via participant list
- Transfers / refunds / adjustments
- Duplicate submit blocked via `clientRequestId`
- Empty groups and missing Telegram init data in local dev
- Destructive actions use Telegram `showConfirm` when available

## License

Private / project use.
