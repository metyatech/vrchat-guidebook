# Contributing to vrchat-guidebook

Thank you for your interest in contributing! This project aims to provide high-quality, accessible information for the VRChat community.

## Guidelines

- Follow the [AGENTS.md](AGENTS.md) rules and project standards.
- Keep the tone helpful, professional, and accessible.
- Use clear and concise Japanese for guide content.
- Ensure all technical steps are accurate and up-to-date.
- For new features or significant changes, please open an issue first to discuss.

## How to Contribute

1. Fork the repository.
2. Create a new branch for your changes.
3. Make your changes and ensure they adhere to the project's coding standards.
4. Run the full verification suite: `npm run verify`.
5. Submit a pull request with a clear description of your changes.

## Verification Suite

Before submitting a pull request, ensure all checks pass:

```bash
npm run verify
```

This script runs linting, formatting, automation tests, document builds, and accessibility checks.

## Development Setup

```bash
npm install
npm run docs:dev
```

See [README.md](README.md) for more details.
