# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.** Instead, email the maintainer directly or use [GitHub's private vulnerability reporting](https://github.com/luisbarcia/kanban-handler/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before public disclosure.

## Security Measures

This project implements:

- **Secret scanning** in CI (TruffleHog + Gitleaks)
- **SAST** via CodeQL (security-and-quality queries)
- **Dependency auditing** via `npm audit` and Dependabot
- **HTTPS enforcement** warnings when configuring non-HTTPS URLs
- **No eval or dynamic code execution**
- **Input validation** on all user-provided values
