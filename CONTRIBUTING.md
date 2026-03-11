# Contributing to Anvil Protocol

Thanks for your interest in contributing.

## Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Set up the development environment (see README.md)
4. Make your changes
5. Run type checking (`npx tsc --noEmit` in relevant workspace)
6. Commit your changes
7. Push to your fork and open a pull request

## Development Notes

- **Backend is CommonJS TypeScript** — do not use ESM imports for pump-sdk
- **Backend returns serialized instructions**, not transactions — the frontend assembles transactions with a fresh blockhash
- **Cranker owns the Prisma schema** — schema changes go to `cranker/prisma/schema.prisma` first, then copy to `backend/` and `chat/`
- **No test suites currently** — verify changes manually or with type-checking
- Anchor `program.methods` needs `as any` cast to avoid deep type instantiation errors

## Pull Requests

- Keep PRs focused on a single change
- Include a clear description of what and why
- Make sure type checking passes
- Update documentation if your change affects public APIs or architecture

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment details (OS, Node version, etc.)

## Security

If you discover a security vulnerability, please follow the process in [SECURITY.md](SECURITY.md). Do not open a public issue.
