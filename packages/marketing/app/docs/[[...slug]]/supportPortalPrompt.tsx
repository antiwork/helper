"use client";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { useState } from "react";

const prompt = (host: string) => {
  const actualHost = host.includes("//") ? host : `https://${host || "your-helper-instance.com"}`;
  return `
Add a comprehensive customer support portal to this app using the \`@helperai/client\` SDK. The portal should allow customers to view their support tickets, create new ones, and engage in real-time conversations with AI agents.

IMPORTANT:
- These instructions are for React and Next.js, so adapt them as required for the current framework.
- If you run into an instruction you cannot follow in this app, ask for clarification.
- Reuse existing UI components from this app as much as possible, falling back to simple HTML if necessary.
- Refer to the following API documentation for Helper client API usage: https://helper.ai/docs/api/05-client-sdk
- Refer to the following API documentation for Vercel AI SDK chatbot usage: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot

## 1. Installation

Install the following with npm/pnpm/yarn/etc: \`@helperai/client @helperai/react @ai-sdk/react\`

## 2. Helper provider

Create a global state provider (e.g. React context) that:
- Imports \`HelperClient\` and \`SessionParams\` from \`@helperai/client\`
- Takes \`session: SessionParams\` as a prop
- Creates a memoized HelperClient instance with arguments: \`{ host: "${actualHost}", ...session }\`
- Exports a custom hook \`useHelperClient()\` for accessing the client

## 3. Session management

Separately, create a *server-side* \`createHelperSession\` helper function that calls \`generateHelperAuth\` from \`@helperai/react\` like this:

\`\`\`tsx
return await generateHelperAuth({
  email: "CURRENT_CUSTOMER_EMAIL",
  hmacSecret: "YOUR_HMAC_SECRET", // Store this separately, for example in an environment variable or secret. It MUST NOT be exposed to the client side or committed to version control.
})
\`\`\`

## 4. Conversation list page

Create a page that:
- Calls the \`createHelperSession\` helper function on the server side
- Passes the result to the HelperProvider as the \`session\` prop
- Renders a conversation list component which:
  - Uses the \`useHelperClient()\` hook to access the client and the \`client.conversations.list()\` method to fetch conversations
  - Displays the conversations in a table/grid format with columns: Subject, Message count, Last updated
  - Redirects to the conversation detail page when clicked
- Renders a new ticket button which:
  - Opens a modal with a form to create a new ticket (fields: Subject, Message)
  - Uses the \`useHelperClient()\` hook to access the client and the \`client.conversations.create()\` method to create a new conversation
  - Redirects to the conversation detail page when created

## 5. Conversation detail page

Create a page which takes the conversation \`slug\` as a URL parameter and:
- Calls the \`createHelperSession\` helper function on the server side
- Passes the result to the HelperProvider as the \`session\` prop
- Renders a conversation detail component which:
  - Uses the \`useHelperClient()\` hook to access the client and the \`client.conversations.get()\` method to fetch the conversation
  - Displays the conversation subject as the page heading
- Renders a child component within the conversation details which:
  - Takes the loaded conversation as a prop
  - Calls the \`useChat\` hook from the Vercel AI SDK, passing in the result of \`client.chat.handler({ conversation })\`
  - Displays the chat messages in a readable format as well as a form to add a new message to the conversation, as described in the Vercel AI SDK docs

## 6. Final steps

- Tell me the route of the conversation list page you created
- Tell me how to add the Helper HMAC secret configuration (note: the secret itself is available at ${actualHost}/settings/in-app-chat under "Authenticate your users")
`.trimStart();
};

export const SupportPortalPrompt = () => {
  const [host, setHost] = useState("");

  return (
    <>
      <div className="flex items-center border rounded-md bg-muted overflow-hidden">
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

      <CodeBlock>
        <Pre className="whitespace-pre-wrap">{prompt(host)}</Pre>
      </CodeBlock>
    </>
  );
};
