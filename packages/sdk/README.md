# Helper API Client

A TypeScript/JavaScript SDK for interacting with the Helper API to create customer support widgets and manage conversations.

## Installation

```bash
npm install @helperai/sdk
```

## Quick Start

```typescript
import { createHelperClient } from "@helperai/sdk";

const client = createHelperClient({
  host: "https://your-helper-instance.com",
  token: "your-api-token",
});

// Create a new conversation
const { conversationSlug } = await client.conversations.create();

// Send a message
await client.messages.create(conversationSlug, {
  message: "Hello, I need help with my account",
});
```

## API Reference

### Creating a Client

```typescript
const client = createHelperClient({
  host: string,     // Your Helper instance URL
  token?: string    // Optional API token for authentication
});
```

### Conversations

#### `conversations.create(params?)`

Creates a new conversation.

```typescript
const response = await client.conversations.create({
  isPrompt: true, // Optional: whether this is a prompt conversation
});
// Returns: { conversationSlug: string }
```

#### `conversations.list()`

Lists all conversations.

```typescript
const response = await client.conversations.list();
// Returns: {
//   conversations: Array<{
//     slug: string;
//     subject: string;
//     createdAt: string;
//   }>
// }
```

#### `conversations.get(conversationSlug)`

Gets a specific conversation with its messages.

```typescript
const response = await client.conversations.get("conversation-slug");
// Returns: {
//   messages: Array<{
//     id: string;
//     content: string;
//     role: string;
//   }>
// }
```

### Messages

#### `messages.create(conversationSlug, params)`

Creates a new message in a conversation.

```typescript
const response = await client.messages.create("conversation-slug", {
  message: "Your message content",
});
// Returns: { success: boolean }
```

## Examples

### Basic Conversation Flow

```typescript
import { createHelperClient } from "@helperai/sdk";

const client = createHelperClient({
  host: "https://your-helper-instance.com",
  token: "your-api-token",
});

async function startConversation() {
  try {
    // Create a new conversation
    const { conversationSlug } = await client.conversations.create();

    // Send initial message
    await client.messages.create(conversationSlug, {
      message: "I need help with billing",
    });

    // Get conversation details
    const conversation = await client.conversations.get(conversationSlug);
    console.log("Messages:", conversation.messages);
  } catch (error) {
    console.error("Error:", error);
  }
}
```

### Listing All Conversations

```typescript
async function listAllConversations() {
  try {
    const { conversations } = await client.conversations.list();

    conversations.forEach((conv) => {
      console.log(`${conv.subject} (${conv.slug}) - ${conv.createdAt}`);
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
  }
}
```

### Working Without Authentication

```typescript
const client = createHelperClient({
  host: "https://your-helper-instance.com",
  // Anonymous session
});
```

## Error Handling

The client throws errors for failed requests. Always wrap API calls in try-catch blocks:

```typescript
try {
  const response = await client.conversations.create();
} catch (error) {
  console.error("API request failed:", error.message);
  // Handle error appropriately
}
```

## TypeScript Support

The SDK includes full TypeScript support with all types exported:

```typescript
import {
  CreateConversationParams,
  CreateConversationResponse,
  CreateMessageParams,
  CreateMessageResponse,
  GetConversationResponse,
  ListConversationsResponse,
} from "@helperai/sdk";
```

## Contributing

This SDK is part of the Helper project. Please refer to the main repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.
