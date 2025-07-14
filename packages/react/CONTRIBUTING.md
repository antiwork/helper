# Contributing to @helperai/react

Thank you for your interest in contributing to the Helper React package! This document outlines the process for contributing and releasing new versions.

## Development

1. Fork the repository and clone it locally
2. Install dependencies:

```bash
npm install
```

3. Start the development environment:

```bash
npm run dev
```

## Testing

We use Vitest for testing. Some key guidelines:

- Write tests in TypeScript
- Run tests:
  ```bash
  npm run test        # Run tests once
  npm run test:watch  # Run tests in watch mode
  ```

## Pull Requests

1. Create a new branch for your feature/fix
2. Write tests for new functionality
3. Ensure all tests pass
4. Include screenshots of your test suite passing locally
5. Use professional English in all communication with no excessive capitalization, question marks, or informal language - we have a zero tolerance policy as it makes async communication difficult
   - ❌ Before: "is this still open ?? I am happy to work on it ??"
   - ✅ After: "Is this actively being worked on? I've started work on it here…"
6. Create a changeset for your changes (see below)
7. Submit a pull request with a clear description of changes

## Code Style

- Use functional React components
- Write TypeScript
- Follow existing code patterns
- Refer to the app as "Helper" (not "Helper AI")

## Managing Changes with Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

### Adding a Changeset

When making changes, you need to include a changeset file describing your changes:

1. Run the following command:

   ```bash
   npx changeset
   ```

2. Select the type of change:

   - `major`: Breaking changes
   - `minor`: New features
   - `patch`: Bug fixes

3. Write a summary of your changes when prompted

4. Commit the generated changeset file with your changes

### Releasing a New Version

1. Build the package:

   ```bash
   npm run build
   ```

2. Run tests:

   ```bash
   npm run test
   ```

3. Create a version PR:

   ```bash
   npx changeset version
   ```

   This will:

   - Update package versions based on changesets
   - Generate/update changelog
   - Remove changeset files

4. Review and merge the version PR

5. Create a release:

   ```bash
   npx changeset publish
   ```

   This will:

   - Publish packages to npm
   - Create git tags
   - Push changes

6. Push tags:
   ```bash
   git push --follow-tags
   ```

## Questions?

If you have any questions, please open an issue in the repository.
