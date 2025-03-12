# Contributing to Helper

Thanks for your interest in contributing! This document will help you get started.

## Quick Start

1. Set up the repository

```bash
git clone https://github.com/antiwork/helper.git
```

2. Set up your development environment

For detailed instructions on setting up your local development environment, please refer to our [Local Development Guide](docs/development.md).

## Development

1. Create your feature branch

```bash
git checkout -b feature/your-feature
```

2. Start the development environment

```bash
bin/dev
```

3. Run the test suite

```bash
npm test
```

## Testing Guidelines

- We use Vitest for our test suite
- Don't mock database queries in tests - use the factory functions in `@tests/support/factories`
- When testing inngest functions, test the exported plain function, not the inngest wrapper

## Pull Request

1. Update documentation if you're changing behavior
2. Add or update tests for your changes
3. Make sure all tests pass
4. Request a review from maintainers
5. After reviews begin, avoid force-pushing to your branch
   - Force-pushing rewrites history and makes review threads hard to follow
   - Don't worry about messy commits - we squash everything when merging to main
6. The PR will be merged once you have the sign-off of at least one other developer

## Style Guide

- Write in TypeScript
- Follow the existing code patterns
- Use clear, descriptive variable names

## Writing Bug Reports

A great bug report includes:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Writing commit messages

We use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

A commit message should be structured as follows:

```bash
type(scope): title

description
```

Where type can be:

- `feat`: new feature or enhancement
- `fix`: bug fixes
- `docs`: documentation-only changes
- `test`: test-only changes
- `refactor`: code improvements without behaviour changes
- `chore`: maintenance/anything else

Example:

```
feat(cli): Add mobile testing support
```

## Help

- Check existing discussions/issues/PRs before creating new ones
- Start a discussion for questions or ideas
- Open an [issue](https://github.com/antiwork/helper/issues) for bugs or problems

## License

By contributing, you agree that your contributions will be licensed under the [Helper Community License](LICENSE.md).
