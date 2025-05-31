# Helper React

[![npm version](https://badge.fury.io/js/helper-react.svg)](https://badge.fury.io/js/@helperai/react)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful React integration for the Helper chat widget, featuring first-class support for Next.js and modern React applications.

## Features

- 🚀 First-class Next.js App Router support
- 💪 Full TypeScript support
- 🔒 Secure authentication handling
- 🎨 Customizable UI and theming
- 🔌 Framework-agnostic core
- 📱 Responsive design

## Installation

```bash
npm install @helperai/react
# or
yarn add @helperai/react
# or
pnpm add @helperai/react
```

## Docs

[Getting Started](https://helper.ai/docs/widget/03-react-integration)

## Best Practices

### Security

- Keep `HELPER_HMAC_SECRET` secure and never expose it client-side
- Generate authentication tokens server-side
- Validate user sessions before initializing Helper
- Use environment variables for sensitive configuration

### Performance

- Initialize Helper only after user authentication
- Implement proper cache invalidation strategies
- Use framework-specific optimizations when available

## API Reference

### Hooks

#### `useHelper()`

```typescript
const {
  show, // () => void
  hide, // () => void
  toggle, // () => void
  sendPrompt, // (prompt: string) => void
  isVisible, // boolean
} = useHelper();
```

### Components

#### `HelperProvider`

```typescript
<HelperProvider
  {...config}
>
  {children}
</HelperProvider>
```

## Troubleshooting

### Common Issues

#### Widget Not Loading

- Verify environment variables are correctly set
- Ensure HMAC generation is working
- Check network requests for authentication errors

#### Authentication Failures

- Confirm HMAC secret matches dashboard
- Verify timestamp is current
- Validate email format and consistency

## License

MIT © [Helper](https://helper.ai)
