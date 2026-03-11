# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Anvil Protocol, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email security concerns to the maintainers or open a private security advisory on GitHub.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- Acknowledgment within 48 hours
- Initial assessment within 1 week
- Fix timeline communicated after assessment

## Scope

This policy covers:
- The Anvil Protocol Solana program
- Backend API and cranker services
- Frontend application
- Smart contract interactions

## Best Practices for Contributors

- Never commit secrets, private keys, or API keys
- Use environment variables for all sensitive configuration
- Validate all user input at system boundaries
- Follow the principle of least privilege for on-chain instructions
