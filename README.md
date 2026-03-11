# Anvil Protocol

Solana protocol that aggregates 100% of creator fees from token launchpads and distributes them directly to top token holders. Bypasses platform shareholder limits by auto-pushing SOL to up to 512 holder wallets per vault.

- 10% platform fee, 10% drip rate per distribution interval
- Adaptive thresholds with dust-skip carry-forward
- Tokens launched via Anvil use vanity mint addresses ending in "nv1"
- PumpFun is the first supported launchpad, with multi-platform architecture

## Architecture

Monorepo with 6 workspaces:

| Workspace | Description | Port |
|-----------|-------------|------|
| `backend/` | Express API + PumpFun SDK integration + Prisma | 3001 |
| `app/` | React + Vite + Tailwind frontend | 5173 |
| `cranker/` | Distribution cranker service (owns Prisma schema) | 4001 |
| `chat/` | AI chat service (Claude API + tool_use) | 3002 |
| `bot/` | X/Twitter bot service (polls mentions, AI parsing, launches tokens) | 3003 |
| `video/` | Remotion video content | 3100 |

### On-chain Program

Deployed on Solana mainnet: `6MSJLXdbaoNT9S4pmbCPagTdzNCoYKYMrKicLBZNbrzs`

- 10 instructions (includes `push_batch`, `withdraw_for_lp`)
- MAX_HOLDERS: 512, MAX_PUSH_BATCH: 22
- Built with Anchor framework

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Solana CLI (for program interaction)

### Setup

```bash
# Install dependencies
npm install

# Copy environment files
cp backend/.env.example backend/.env
cp cranker/.env.example cranker/.env

# Configure your .env files with:
# - Solana RPC URL (Helius recommended)
# - Database URL
# - Vault master key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - Cranker private key

# Push database schema
cd cranker && npx prisma db push
```

### Running

```bash
# Backend API
cd backend && npx tsx src/index.ts

# Frontend
cd app && npm run dev

# Cranker (distribution service)
cd cranker && npx tsx src/index.ts

# Chat service
cd chat && npx tsx src/index.ts

# Bot service
cd bot && npx tsx src/index.ts

# Video studio
cd video && npm run dev
```

### Type Checking

```bash
cd cranker && npx tsc --noEmit
cd chat && npx tsc --noEmit
cd bot && npx tsc --noEmit
```

## Database

The cranker owns the Prisma schema (`cranker/prisma/schema.prisma`). Backend, chat, and bot have copies that must stay in sync. All four services share the same PostgreSQL database.

Schema changes: update cranker's first, then copy to backend, chat, and bot.

## Deployment

| Service | Platform |
|---------|----------|
| Backend + Cranker + Chat + Bot | Railway (shared PostgreSQL) |
| Frontend | Vercel |

Deploy order: Cranker first (runs `prisma db push`), then backend, then frontend.

## Security

- CSRF protection via `X-Requested-With` header
- Admin auth via Ed25519 wallet signature
- Rate limiting (4 tiers: global, strict, admin, read)
- Vanity keypairs encrypted with AES-256-GCM at rest
- Known program ID allowlist on frontend

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Documentation

Detailed technical docs in `agent_docs/`:

- `solana-program.md` — Anchor program, instructions, constants, events
- `sdk-and-launch.md` — PumpFun SDK, fee sharing, launch architecture
- `cranker-internals.md` — Distribution cycle, services, scoring, config
- `key-files.md` — Important file paths across all workspaces

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
