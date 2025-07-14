# Contributing to Helper

Thanks for your interest in contributing! This document will help you get started.

## Quick Start

1. Set up the repository

```bash
git clone https://github.com/antiwork/helper.git
```

2. Set up your development environment

For detailed instructions on setting up your local development environment, please refer to our [README](README.md).

## Development

1. Create your feature branch

```bash
git checkout -b feature/your-feature
```

2. Install dependencies

```bash
pnpm install
```

3. Set up the database

```bash
pnpm db:reset
```

4. Start the development environment

```bash
pnpm dev
```

5. Run the test suite

```bash
# Run all tests
pnpm test

# Run unit tests
pnpm test:unit

# Run end-to-end tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch
```

## Testing Guidelines

- Write descriptive test names that explain the behavior being tested
- Keep tests independent and isolated
- For API endpoints, test response status, format, and content
- Use factories for test data instead of creating objects directly
- Test both happy path and edge cases
- We use Vitest for unit tests and Playwright for end-to-end tests

## Pull Request

1. Update documentation if you're changing behavior
2. Add or update tests for your changes
3. Include screenshots of your test suite passing locally
4. Use professional English in all communication with no excessive capitalization, question marks, or informal language - we have a zero tolerance policy as it makes async communication difficult
   - ❌ Before: "is this still open ?? I am happy to work on it ??"
   - ✅ After: "Is this actively being worked on? I've started work on it here…"
5. Make sure all tests pass
6. Run linting and formatting checks:
   ```bash
   pnpm lint
   pnpm format
   ```
7. Request a review from maintainers
8. After reviews begin, avoid force-pushing to your branch
   - Force-pushing rewrites history and makes review threads hard to follow
   - Don't worry about messy commits - we squash everything when merging to main
9. The PR will be merged once you have the sign-off of at least one other developer

## Monorepo Structure

Helper is organized as a monorepo with pnpm workspaces. Key packages include:

- **Main Application** (`/`): The core Helper Next.js application
- **React SDK** (`packages/react/`): Reusable React components and SDK
- **Marketing Site** (`packages/marketing/`): Documentation and marketing content

When contributing to specific packages, also refer to their individual CONTRIBUTING.md files (e.g., `packages/react/CONTRIBUTING.md`).

## Style Guide

- Follow the existing code patterns
- Use clear, descriptive variable names
- Write TypeScript for all code
- Follow React best practices and use functional components
- Refer to the app as "Helper" (not "Helper AI")
- Use lowerCamelCase for component file names (e.g., `conversationList.tsx`)
- Design for both light and dark mode
- Consider mobile and desktop devices (medium, large, and extra large breakpoints)

## Writing Bug Reports

A great bug report includes:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Help

- Check existing discussions/issues/PRs before creating new ones
- Start a discussion for questions or ideas
- Open an [issue](https://github.com/antiwork/helper/issues) for bugs or problems

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
