# Anvil Protocol

Anvil is a Solana protocol that collects creator fees from token launchpads (starting with PumpFun) and distributes them to top token holders. It aggregates 100% of creator fees into per-token vaults, then auto-pushes SOL directly to up to 512 holder wallets (per-vault configurable, 100-512) — bypassing PumpFun's 10-shareholder limit. 10% platform fee, 10% drip rate per interval, adaptive thresholds. Tokens launched via Anvil use vanity mint addresses ending in "nv1".

Directory is `C:\Projects\PumpShare` but all branding/code uses "Anvil Protocol". Public-facing copy must use platform-agnostic language ("supported launchpads/DEXs") — PumpFun is the first integration but the architecture targets multi-platform support.

## Project Structure

Monorepo with 6 workspaces:
- `backend/` — Express API + PumpFun SDK integration + Prisma (CommonJS, no `"type": "module"`)
- `app/` — React + Vite + Tailwind frontend
- `cranker/` — Distribution cranker service (Prisma + PostgreSQL, owns the schema)
- `chat/` — AI chat service (Claude API + tool_use, standalone Express, port 3002)
- `bot/` — X/Twitter bot service (polls mentions, Claude AI parsing, delegates to backend, port 3003)
- `video/` — Remotion video content (React-based, 30fps)

## Build & Run

- **Backend**: `cd backend && npx tsx src/index.ts`
- **Frontend**: `cd app && npm run dev`
- **Cranker**: `cd cranker && npx tsx src/index.ts`
- **Cranker type-check**: `cd cranker && npx tsc --noEmit`
- **Chat**: `cd chat && npx tsx src/index.ts`
- **Chat type-check**: `cd chat && npx tsc --noEmit`
- **Bot**: `cd bot && npx tsx src/index.ts`
- **Bot type-check**: `cd bot && npx tsc --noEmit`
- **Video**: `cd video && npm run dev` (Remotion Studio)
- **Video type-check**: `cd video && npx tsc --noEmit`

## Deployment

- **Solana program**: Mainnet (`6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs`)
- **Backend + Cranker + Chat + Bot**: Railway (shared PostgreSQL)
- **Frontend**: Vercel
- **Deploy order**: Cranker first (runs `prisma db push`), then backend, then frontend auto-deploys on push

## Database

- **Cranker owns the Prisma schema** at `cranker/prisma/schema.prisma` — source of truth
- **Backend has a copy** at `backend/prisma/schema.prisma` — MUST stay in sync
- **Chat has a copy** at `chat/prisma/schema.prisma` — MUST stay in sync
- **Bot has a copy** at `bot/prisma/schema.prisma` — MUST stay in sync
- All four share the same PostgreSQL database (same `DATABASE_URL`)
- Schema changes: update cranker's first, copy to backend's, chat's, AND bot's, deploy cranker first
- Railway builds services in isolation — backend can't reference `../cranker/` at build time

## Security & Auth

- **CSRF**: All state-changing requests require `X-Requested-With: AnvilProtocol` header OR a Bearer token in the Authorization header (Bearer tokens are not auto-sent by browsers, so they inherently prevent CSRF)
- **Admin auth**: Ed25519 wallet signature — headers: `x-admin-wallet`, `x-admin-signature`, `x-admin-timestamp` (5-min window)
- **Custodial wallets**: Users login with X (Twitter OAuth via Privy). Backend creates and manages encrypted custodial wallets per X user. All TX signing is server-side — zero wallet popups for regular users. Admin page still uses external wallet for on-chain admin operations.
- **Auth middleware**: `requirePrivyAuth` (verifies Privy JWT), `requireBotAuth` (verifies bot API key), `requireAnyAuth` (tries bot key first, falls back to Privy JWT), `optionalPrivyAuth` (non-blocking Privy check)
- **Custodial signing**: Frontend sends intent → backend builds TX → 4-level security validation (feePayer, program allowlist, signer, instruction) → signs with custodial key → submits to Solana
- **TransactionPreview**: Inline preview component shown before all TXs. States: preview → submitting → confirming → success/error
- **Rate limiting**: Global (100/min), strict (10/min for writes), bot (20/min for bot service), admin (30/min), read (30/min), chat (10/min per IP + 10/day per user)
- **Vanity keypairs**: AES-256-GCM encrypted at rest, `VAULT_MASTER_KEY` env var must never be logged

## Critical Rules

- Backend is CommonJS TypeScript — never use ESM imports for pump-sdk
- Backend builds and signs TXs server-side via custodial wallets — frontend sends intent, backend returns signatures
- Anchor `program.methods` needs `as any` cast to avoid deep type instantiation errors
- Vite dev server proxies `/api` → `http://localhost:3001` (backend). Chat calls go directly to chat service via `VITE_CHAT_API_URL`
- No test suites — verify changes manually or with type-checking

## Reference Docs

Detailed technical docs for specific areas (read these when working on related code):
- `agent_docs/solana-program.md` — Anchor program, instructions, constants, events, deploy workflow
- `agent_docs/sdk-and-launch.md` — PumpFun SDK, fee sharing, launch architecture, API routes
- `agent_docs/cranker-internals.md` — Main cycle, services, LP automation, scoring, config vars
- `agent_docs/key-files.md` — Important file paths across all workspaces
- `agent_docs/remotion-video.md` — Remotion workspace, compositions, scenes, animation patterns
