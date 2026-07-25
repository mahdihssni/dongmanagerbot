# AGENTS.md

Orientation for AI coding assistants working on **DongBot** (Telegram Mini App / Web App for expense splitting).

## What this project is

A **Telegram Web App** (frontend) opened from a bot menu button, deployed on Vercel. Not a bot webhook backend.

Stack: Next.js App Router, TypeScript, Tailwind, localStorage persistence, pure calculation engine.

## Layout

| Path | Role |
|------|------|
| `src/app/` | Screens + thin `api/health` |
| `src/components/` | UI + shell |
| `src/features/` | Multi-step UX (expense wizard) |
| `src/domain/` | Types and pure domain helpers |
| `src/engine/` | Splits, balances, settlement (pure + tested) |
| `src/lib/telegram/` | WebApp SDK helpers |
| `src/lib/i18n/` | fa / en |
| `src/lib/persistence/` | Repository (local now, API later) |
| `src/store/` | App state |

## Rules

- Keep calculation logic in `src/engine` as pure functions
- Do not put business math inside React components
- Persian RTL is default; keep keys in `lib/i18n/messages.ts`
- Prefer localStorage / repository interface over premature backend
- No npm packages required beyond Next/React for runtime features already implemented

## Commands

```bash
yarn dev
yarn test
yarn typecheck
yarn lint
yarn build
yarn ci
```

## Production notes

- Prefer `yarn ci` before deploy
- Never put the bot token in `NEXT_PUBLIC_*` — validate `initData` only on a server
- Keep calculation logic in `src/engine` as pure functions
