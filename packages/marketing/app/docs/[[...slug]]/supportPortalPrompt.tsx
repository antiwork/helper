"use client";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { useState } from "react";

const sdkPrompt = (host: string) => {
  const actualHost = host.includes("//") ? host : `https://${host || "your-helper-instance.com"}`;
  return `
Add a comprehensive customer support portal to this app using the \`@helperai/client\` SDK. The portal should allow customers to view their support tickets, create new ones, and engage in real-time conversations with AI agents.

IMPORTANT:
- These instructions are for React and Next.js, so adapt them as required for the current framework.
- If you run into an instruction you cannot follow in this app, ask for clarification.
- Reuse existing UI components from this app as much as possible, falling back to simple HTML if necessary.
- Before starting work, read the documentation at the following URL to use as a reference: https://helper.ai/docs/api/05-client-sdk

## 1. Installation

Install the following with npm/pnpm/yarn/etc: \`@helperai/client @helperai/react @ai-sdk/react\`

## 2. Session management

Create a *server-side* \`createHelperSession\` helper function that calls \`generateHelperAuth\` from \`@helperai/react\` like this:

\`\`\`tsx
return await generateHelperAuth({
  email: "CURRENT_CUSTOMER_EMAIL",
  hmacSecret: "YOUR_HMAC_SECRET", // Store this separately, for example in an environment variable or secret. It MUST NOT be exposed to the client side or committed to version control.
})
\`\`\`

## 3. Support portal page

Create a page that:
- Calls the \`createHelperSession\` helper function on the server side
- Imports \`HelperClient\` from \`@helperai/client\`
- Renders a *client-side* component that memoizes \`new HelperClient({ host: "${actualHost}", ...session })\`, where \`session\` is the result of the \`createHelperSession\` call

## 4. Conversations component

After creating the HelperClient instance, render a conversations component with a \`selectedConversationSlug\` state variable.
- When the selected slug is null, it should render a list component which:
  - Uses \`client.conversations.list()\` method to fetch conversations
  - Displays the conversations in a table/grid format with columns: Subject, Message count, Last updated
  - Sets the \`selectedConversationSlug\` state variable when a conversation is clicked
- When the selected slug is not null, it should instead render a conversation detail component which:
  - Fetches the conversation details using the \`client.conversations.get()\` method
  - Displays the conversation subject as the page heading
  - Displays the conversation messages using \`conversation.messages.map(({ content, role, staffName, createdAt }) => ...)\`
  - Uses the \`MessageContent\` component to display the \`content\` of each message
  - Displays an input field to add a new message to the conversation using the \`client.messages.create(slug, { content })\` method

## 5. Real-time updates

In the conversation details view, add a \`useEffect\` hook that calls \`client.conversations.listen\` similar to this:

\`\`\`tsx
useEffect(() => {
  const unlisten = client.conversations.listen(conversation.slug, {
    onSubjectChanged: (subject) => {
      setConversation((conversation) => (conversation ? { ...conversation, subject } : null));
    },
    onReply: ({ message }) => {
      setConversation((conversation) => (conversation ? { ...conversation, messages: [...conversation.messages, message] } : null));
    },
  });
  return () => unlisten();
}, [conversation.slug, client]);
\`\`\`

## 6. New ticket button

- Above the conversation list, add a new ticket button which:
  - Opens a modal containing a form with subject and message input fields
  - Uses the \`client.conversations.create({ subject })\` method to create a new conversation, then calls \`client.messages.create(slug, { content })\` to create the first message in the conversation
  - Reloads the conversation list

## 7. Final steps

- Tell me the route of the conversation list page you created
- Tell me how to add the Helper HMAC secret configuration (note: the secret itself is available at ${actualHost}/settings/in-app-chat under "Authenticate your users")
`.trimStart();
};

const reactPrompt = (host: string) => {
  const actualHost = host.includes("//") ? host : `https://${host || "your-helper-instance.com"}`;
  return `
Add a comprehensive customer support portal to this app using the \`@helperai/react\` hooks. The portal should allow customers to view their support tickets, create new ones, and engage in real-time conversations with AI agents.

IMPORTANT:
- These instructions are for React and Next.js, so adapt them as required for the current framework.
- If you run into an instruction you cannot follow in this app, ask for clarification.
- Reuse existing UI components from this app as much as possible, falling back to simple HTML if necessary.
- Before starting work, read the documentation at the following URL to use as a reference: https://helper.ai/docs/api/05-client-sdk

## 1. Installation

Install the following with npm/pnpm/yarn/etc: \`@helperai/client @helperai/react @ai-sdk/react\`

## 2. Session management

Create a *server-side* \`generateSession\` helper function that calls \`generateHelperAuth\` from \`@helperai/react/auth\` like this:

\`\`\`tsx
import { generateHelperAuth } from "@helperai/react/auth";

export const generateSession = ({ email }: { email?: string }) => {
  const helperAuth = generateHelperAuth({ email: email ?? "customer@example.com" });
  return {
    ...helperAuth,
    customerMetadata: {
      name: "Customer Name",
      value: 100,
      links: {
        "Account Portal": "https://example.com/account",
      },
    },
  };
};
\`\`\`

## 3. Support portal layout

Create a root layout page that wraps the entire support portal in \`HelperClientProvider\`:

\`\`\`tsx
import { HelperClientProvider } from "@helperai/react";
import { generateSession } from "./generateSession";

export default async function SupportLayout({ children }: { children: ReactNode }) {
  const session = generateSession({ email: "customer@example.com" }); // Get actual customer email
  
  return (
    <HelperClientProvider host="${actualHost}" session={session}>
      {children}
    </HelperClientProvider>
  );
}
\`\`\`

## 4. Conversations list page

Create a conversations list component using the \`useConversations\` and \`useCreateConversation\` hooks:

\`\`\`tsx
"use client";
import { useConversations, useCreateConversation } from "@helperai/react";

export const ConversationsList = () => {
  const { data: conversationsData, isLoading, error } = useConversations();
  const createConversation = useCreateConversation();
  
  const conversations = conversationsData?.conversations || [];

  const handleCreateTicket = async () => {
    const result = await createConversation.mutateAsync({});
    // Navigate to new conversation: /support/\${result.conversationSlug}
  };

  if (isLoading) return <div>Loading conversations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Support Tickets</h1>
        <button onClick={handleCreateTicket} disabled={createConversation.isPending}>
          {createConversation.isPending ? "Creating..." : "+ New Ticket"}
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 p-4 font-medium">
        <div>Subject</div>
        <div>Messages</div>
        <div>Last Updated</div>
      </div>
      
      {conversations.map((conversation) => (
        <div key={conversation.slug} className="grid grid-cols-3 gap-4 p-4 border-b cursor-pointer hover:bg-gray-50"
             onClick={() => {/* Navigate to /support/\${conversation.slug} */}}>
          <div>{conversation.subject || "No subject"}</div>
          <div>{conversation.messageCount}</div>
          <div>{new Date(conversation.latestMessageAt || conversation.createdAt).toLocaleDateString()}</div>
        </div>
      ))}
    </div>
  );
};
\`\`\`

## 5. Conversation detail page

Create a conversation detail component using the \`useConversation\` hook:

\`\`\`tsx
"use client";
import { useConversation } from "@helperai/react";

export const ConversationDetail = ({ conversationSlug }: { conversationSlug: string }) => {
  const { data: conversation, isLoading, error } = useConversation(conversationSlug);

  if (isLoading) return <div>Loading conversation...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!conversation) return <div>Conversation not found</div>;

  return (
    <div>
      <h1>{conversation.subject || "Chat"}</h1>
      {/* Choose one of the two approaches below */}
      <ThreadView conversation={conversation} />
      {/* OR */}
      <ChatView conversation={conversation} />
    </div>
  );
};
\`\`\`

## 6. Thread-style messaging (Option A)

For a traditional thread-style view, use \`useCreateMessage\` and \`useRealtimeEvents\`:

\`\`\`tsx
import { useCreateMessage, useRealtimeEvents } from "@helperai/react";

const ThreadView = ({ conversation }) => {
  const [input, setInput] = useState("");
  const { mutate: createMessage, isPending } = useCreateMessage({
    onSuccess: () => setInput(""),
  });

  useRealtimeEvents(conversation.slug); // Automatically updates conversation data

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    createMessage({
      conversationSlug: conversation.slug,
      content: input.trim(),
    });
  };

  return (
    <div>
      <div className="messages">
        {conversation.messages?.map((message) => (
          <div key={message.id} className={\`message \${message.role}\`}>
            <div>{message.content}</div>
            <small>{new Date(message.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isPending}
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};
\`\`\`

## 7. Real-time chat (Option B)

For a real-time chat experience, use \`useChat\` from \`@ai-sdk/react\` with \`useHelperClient\`:

\`\`\`tsx
import { useChat } from "@ai-sdk/react";
import { useHelperClient } from "@helperai/react";

const ChatView = ({ conversation }) => {
  const { client } = useHelperClient();
  const [isTyping, setIsTyping] = useState(false);

  const { messages, setMessages, input, handleInputChange, handleSubmit } = useChat({
    ...client.chat.handler({ conversation }),
  });

  useEffect(() => {
    const unlisten = client.conversations.listen(conversation.slug, {
      onReply: ({ aiMessage }) => {
        setMessages((prev) => [...prev, aiMessage]);
      },
      onTyping: (typing) => {
        setIsTyping(typing);
      },
    });
    return () => unlisten();
  }, [conversation.slug, client]);

  return (
    <div>
      <div className="messages">
        {client.chat.messages(messages).map((message) => (
          <div key={message.id} className={\`message \${message.role}\`}>
            {message.content}
          </div>
        ))}
        {isTyping && <div>Agent is typing...</div>}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};
\`\`\`

## 8. File attachments (Optional)

To support file attachments, modify your message creation:

\`\`\`tsx
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

const handleSubmit = (e) => {
  e.preventDefault();
  createMessage({
    conversationSlug: conversation.slug,
    content: input.trim(),
    attachments: selectedFiles, // Add this for thread view
  });
  
  // For chat view, use:
  // handleSubmit(e, { experimental_attachments: filesAsDataTransfer });
};
\`\`\`

## 9. Final steps

- Tell me the routes of the pages you created (e.g., /support for list, /support/[slug] for details)
- Tell me how to add the Helper HMAC secret configuration (note: the secret itself is available at ${actualHost}/settings/in-app-chat under "Authenticate your users")
`.trimStart();
};

export const SupportPortalPrompt = () => {
  const [host, setHost] = useState("");
  const [activeTab, setActiveTab] = useState<"sdk" | "react">("react");

  return (
    <>
      <div className="flex items-center border rounded-md bg-muted overflow-hidden mb-4">
        <label htmlFor="host" className="px-4 cursor-pointer">
          Your Helper instance URL
        </label>
        <input
          id="host"
          className="flex-1 px-4 py-3 border-none bg-background placeholder:text-muted-foreground"
          type="text"
          placeholder="https://your-helper-instance.com"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
      </div>

      <div className="flex border-b border-border mb-4">
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "react"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("react")}
        >
          React Hooks
        </button>
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "sdk"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("sdk")}
        >
          Vanilla JS SDK
        </button>
      </div>

      <CodeBlock>
        <Pre className="whitespace-pre-wrap">{activeTab === "react" ? reactPrompt(host) : sdkPrompt(host)}</Pre>
      </CodeBlock>
    </>
  );
};
