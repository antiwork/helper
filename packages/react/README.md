# Helper React

[![npm version](https://badge.fury.io/js/@helperai/react.svg)](https://badge.fury.io/js/@helperai/react)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful React integration for the Helper chat widget, featuring first-class support for Next.js and modern React applications.

## Features

- 🚀 First-class Next.js App Router support
- 💪 Full TypeScript support
- 🔒 Secure authentication handling
- 🎨 Customizable UI and theming
- 🔌 Framework-agnostic core
- �� Responsive design
- 🔄 Comprehensive API hooks for direct integration

## Installation

```bash
npm install @helperai/react
# or
yarn add @helperai/react
# or
pnpm add @helperai/react
```

## Quick Start

### Basic Setup

```tsx
import { generateHelperAuth, HelperProvider } from "@helperai/react";

function App() {
  const authData = generateHelperAuth({
    email: "user@example.com",
    hmacSecret: process.env.HELPER_HMAC_SECRET!,
  });

  return (
    <HelperProvider host="https://helper.ai" {...authData}>
      <YourApp />
    </HelperProvider>
  );
}
```

### Using Direct Client Calls

```tsx
import React, { useState, useEffect } from "react";
import { HelperClient } from "@helperai/client";

function ChatComponent() {
  const [conversationSlug, setConversationSlug] = useState<string>("");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Create client instance with session params
  const client = new HelperClient(sessionParams);

  const startChat = async () => {
    const result = await client.conversations.create({ subject: "New chat" });
    setConversationSlug(result.conversationSlug);
  };

  useEffect(() => {
    if (conversationSlug) {
      client.conversations.get(conversationSlug).then(conv => {
        setMessages(conv.messages);
      });
    }
  }, [conversationSlug]);

  return (
    <div>
      <button onClick={startChat}>Start chat</button>
      {conversations.map((conv) => (
        <div key={conv.slug}>{conv.subject}</div>
      ))}
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

## API Reference

### Core Provider

#### `HelperProvider`

Provides global state management for Helper functionality, supporting both widget and API-based integrations.

```tsx
<HelperProvider
  host="https://helper.ai"
  email="user@example.com"
  emailHash="hmac-hash"
  timestamp={Date.now()}
  customerMetadata={{
    name: "John Doe",
    value: 1000,
    links: { Profile: "https://example.com/profile" },
  }}
  tools={{
    searchKnowledge: {
      description: "Search knowledge base",
      parameters: { query: { type: "string", description: "Search query" } },
      execute: async ({ query }) => ({ results: [] }),
    },
  }}
>
  {children}
</HelperProvider>
```

### Hooks

For chat functionality, use the `@helperai/client` package directly:

```tsx
import { HelperClient } from "@helperai/client";

const client = new HelperClient(sessionParams);

// Get conversation
const conversation = await client.conversations.get(conversationSlug);

// List conversations  
const { conversations } = await client.conversations.list();

// Create conversation
const result = await client.conversations.create({ subject: "Help needed" });
```

#### `useHelperContext()`

Accesses the Helper context for advanced integration scenarios.

```tsx
const {
  host, // string - The Helper host URL
  tools, // Record<string, HelperTool> - Available tools
  getToken, // () => Promise<string> - Get authentication token
} = useHelperContext();
```

#### `useHelper()`

Controls the Helper widget visibility and behavior.

```tsx
const {
  show, // () => void
  hide, // () => void
  toggle, // () => void
  sendPrompt, // (prompt: string) => void
} = useHelper();
```

### Authentication

#### `generateHelperAuth()`

Server-side helper for generating HMAC authentication data.

```tsx
import { generateHelperAuth } from "@helperai/react";

const authData = generateHelperAuth({
  email: "user@example.com",
  hmacSecret: process.env.HELPER_HMAC_SECRET!, // Optional: can also use HELPER_HMAC_SECRET env var
});
// Returns: { email, timestamp, emailHash }
```

## Next.js Integration

### App Router

```tsx
// app/layout.tsx
import { HelperProvider } from "@helperai/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HelperProvider host={process.env.NEXT_PUBLIC_HELPER_HOST!}>{children}</HelperProvider>
      </body>
    </html>
  );
}
```

### Server Components

```tsx
// app/dashboard/page.tsx
import { generateHelperAuth } from "@helperai/react";

export default function DashboardPage() {
  const authData = generateHelperAuth({
    email: "user@example.com",
    hmacSecret: process.env.HELPER_HMAC_SECRET!,
  });

  return (
    <HelperProvider
      host="https://helper.ai"
      email={authData.email}
      emailHash={authData.emailHash}
      timestamp={authData.timestamp}
    >
      <ChatInterface />
    </HelperProvider>
  );
}
```

## Best Practices

### Security

- Keep `HELPER_HMAC_SECRET` secure and never expose it client-side
- Generate authentication tokens server-side using `generateHelperAuth()`
- Validate user sessions before initializing Helper
- Use environment variables for sensitive configuration

### Performance

- Initialize Helper only after user authentication
- Implement proper cache invalidation strategies
- Use framework-specific optimizations when available

### Error Handling

```tsx
function ChatComponent() {
  const [conversationSlug, setConversationSlug] = useState<string>("");
  const [conversations, setConversations] = useState([]);
  
  // Use HelperClient directly
  const client = new HelperClient(sessionParams);

  if (!conversationSlug) return <div>Select a conversation</div>;

  return <ConversationsList conversations={conversations} />;
}
```

## Troubleshooting

### Common Issues

#### Widget Not Loading

- Verify environment variables are correctly set
- Ensure HMAC generation is working using `generateHelperAuth()`
- Check network requests for authentication errors

#### Authentication Failures

- Confirm HMAC secret matches dashboard configuration
- Verify timestamp is current (generated server-side)
- Validate email format and consistency

#### API Calls Failing

- Ensure authentication data is properly set in the provider
- Check network connectivity and CORS settings
- Verify API endpoint URLs are correct

## Contributing

This package is part of the Helper project. Please refer to the main repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.
