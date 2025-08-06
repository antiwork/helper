"use client";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { useState } from "react";

const sdkPrompt = (host: string) => {
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
return generateHelperAuth({
  email: "CURRENT_CUSTOMER_EMAIL",
  hmacSecret: "YOUR_HMAC_SECRET", // Store this separately, for example in an environment variable or secret. It MUST NOT be exposed to the client side or committed to version control.
})
\`\`\`

## 3. Support portal page

Create a page that:
- Calls the \`createHelperSession\` helper function on the server side
- Imports \`HelperClient\` from \`@helperai/client\`
- Renders a *client-side* component that memoizes \`new HelperClient({ host: "${host}", ...session })\`, where \`session\` is the result of the \`createHelperSession\` call

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
- Tell me how to add the Helper HMAC secret configuration (note: the secret itself is available at ${host}/settings/in-app-chat under "Authenticate your users")
`.trimStart();
};

const reactPrompt = (host: string) => {
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

Create a *server-side* \`createHelperSession\` helper function that calls \`generateHelperAuth\` from \`@helperai/react\` like this:

\`\`\`tsx
return generateHelperAuth({
  email: "CURRENT_CUSTOMER_EMAIL",
  hmacSecret: "YOUR_HMAC_SECRET", // Store this separately, for example in an environment variable or secret. It MUST NOT be exposed to the client side or committed to version control.
})
\`\`\`

## 3. Support portal layout

Create a page that wraps the entire support portal in \`HelperClientProvider\`:

\`\`\`tsx
"use server";
import { HelperClientProvider } from "@helperai/react";
import { generateSession } from "./generateSession";

export default async function SupportPage() {
  const session = generateSession(); // Create an API endpoint if not using server components
  
  return (
    <HelperClientProvider host="${host}" session={session}>
      <SupportPortal />
    </HelperClientProvider>
  );
}
\`\`\`

## 4. Support portal component

Create the \`SupportPortal\` component. It should include state management for \`selectedConversationSlug\`, and do the following:
- When the selected slug is null, it should render a list component which:
  - Uses the \`const { data: conversationsData, isLoading, error } = useConversations()\` hook to fetch conversations
  - Displays the conversations in a table/grid format with columns: Subject, Message count, Last updated
  - Sets the \`selectedConversationSlug\` state variable when a conversation is clicked
- When the selected slug is not null, it should instead render a conversation detail component which:
  - Fetches the conversation details using the \`const { data: conversation, isLoading, error } = useConversation(conversationSlug)\` hook
  - Calls the \`useRealtimeEvents(conversation.slug)\` hook to automatically update the conversation data
  - Displays the conversation subject as the page heading
  - Displays the conversation messages using \`conversation.messages.map(({ content, role, staffName, createdAt }) => ...)\`
  - Uses the \`MessageContent\` component to display the \`content\` of each message
  - Displays an input field and submit button which adds a new message to the conversation using the \`useCreateMessage()\` hook, called like: \`createMessage({ conversationSlug: conversation.slug, content: input.trim() })\`

## 5. New ticket button

- Above the conversation list, add a new ticket button which:
  - Opens a modal containing a form with subject and message input fields
  - Uses the \`useCreateConversation()\` hook to create a new conversation with the \`subject\` input value, then calls \`useCreateMessage()\` to create the first message in the conversation
  - Reloads the conversation list

## 6. Final steps

- Tell me the route of the page you created (e.g., /support)
- Tell me how to add the Helper HMAC secret configuration (note: the secret itself is available at ${host}/settings/in-app-chat under "Authenticate your users")
`.trimStart();
};

export const SupportPortalPrompt = () => {
  const [host, setHost] = useState("");
  const [activeTab, setActiveTab] = useState<"sdk" | "react">("react");

  const actualHost = host.includes("//") ? host : `https://${host || "your-helper-instance.com"}`;

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
        <Pre className="whitespace-pre-wrap">
          {activeTab === "react" ? reactPrompt(actualHost) : sdkPrompt(actualHost)}
        </Pre>
      </CodeBlock>
    </>
  );
};
