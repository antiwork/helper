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

## Quick Start

1. Add your Helper credentials to `.env.local`:

```bash
HELPER_HMAC_SECRET=your_secret_from_helper_dashboard
HELPER_MAILBOX_SLUG=your_mailbox_slug
```

2. Use in your application (Next.js example):

```tsx
// app/layout.tsx
import { generateHelperAuth, HelperProvider } from "@helperai/react";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); // Your auth solution
  if (!session?.user?.email) return children;

  const helperAuth = await generateHelperAuth({
    email: session.user.email,
  });

  const config = {
    ...helperAuth,
    title: "Support",
  };

  return (
    <html>
      <body>
        <HelperProvider {...config}>{children}</HelperProvider>
      </body>
    </html>
  );
}
```

For other frameworks, ensure authentication is always generated server-side:

```tsx
// pages/api/helper-auth.ts
import { generateHelperAuth } from "@helperai/react/server";

export default async function handler(req, res) {
  const session = await getSession(req); // Your auth solution
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const helperAuth = await generateHelperAuth({
    email: session.user.email,
  });

  res.json(helperAuth);
}
```

### Anonymous Sessions

Helper also supports anonymous sessions that don't require user authentication. Here's how to implement them:

```tsx
// app/public-chat.tsx
import { HelperProvider } from "@helperai/react";

export default async function PublicChat() {
  const config = {
    mailbox_slug: process.env.HELPER_MAILBOX_SLUG,
    title: "Public Support Chat",
  };

  return (
    <div>
      <h1>Public Support Chat</h1>
      <HelperProvider {...config}>
        <ChatContent />
      </HelperProvider>
    </div>
  );
}
```

For API routes:

```tsx
// pages/api/public-helper-auth.ts
export default async function handler(req, res) {
  res.json({
    mailbox_slug: process.env.HELPER_MAILBOX_SLUG,
  });
}
```

## Configuration

### Session Types

Helper supports two types of sessions:

#### Authenticated Sessions

Require user email and generate secure HMAC authentication:

```typescript
const config = await generateHelperAuth({
  email: user.email,
  // Optional: provide HMAC secret directly instead of using env var
  hmacSecret: "your_secret",
  // Optional: provide mailbox slug directly instead of using env var
  mailboxSlug: "your_mailbox",
});
```

#### Anonymous Sessions

Only require a mailbox slug, no authentication needed:

```typescript
const config = {
  mailbox_slug: "your_mailbox",
  title: "Support Chat", // optional
};
```

Note: Anonymous sessions have limited functionality:

- No conversation history
- No user-specific features
- Messages are not associated with an email address

### Customer Metadata Examples

Below are common patterns for different use cases:

```typescript
// SaaS Application
const metadata = {
  name: user.displayName,
  value: user.lifetimeValue, // Total value from all subscriptions
  links: {
    "User Profile": `/users/${user.id}`,
    "Billing History": `/users/${user.id}/billing`,
    "Support Tickets": `/users/${user.id}/tickets`,
  },
};

// E-commerce Platform
const metadata = {
  name: customer.name,
  value: customer.totalSpent, // Total spent across all orders
  links: {
    "Customer Profile": `/customers/${customer.id}`,
    "Order History": `/customers/${customer.id}/orders`,
    "Return Requests": `/customers/${customer.id}/returns`,
  },
};
```

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
  {...authConfig}
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
