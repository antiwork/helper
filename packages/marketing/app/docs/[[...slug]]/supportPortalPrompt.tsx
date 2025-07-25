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
- Before starting work, read the documentation at the following URLs to use as a reference:
  - Helper client API usage: https://helper.ai/docs/api/05-client-sdk
  - Vercel AI SDK chatbot usage: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot

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
- Renders a *client-side* component that creates a memoized \`HelperClient\` instance with arguments: \`{ host: "${actualHost}", ...session }\`, where \`session\` is the result of the \`createHelperSession\` call

## 4. Conversations component

After creating the HelperClient instance, render a conversations component with a \`selectedConversationSlug\` state variable.
- When the selected slug is null, it should render a list component which:
  - Uses \`client.conversations.list()\` method to fetch conversations
  - Displays the conversations in a table/grid format with columns: Subject, Message count, Last updated
  - Sets the \`selectedConversationSlug\` state variable when a conversation is clicked
- When the selected slug is not null, it should instead render a conversation detail component which:
  - Fetches the conversation details using the \`client.conversations.get()\` method
  - Displays the conversation subject as the page heading
  - Renders a child component when the details have been loaded which:
    - Takes the loaded conversation details as a prop
    - Calls \`const { messages, setMessages, input, handleInputChange, handleSubmit } = useChat(...)\` from the Vercel AI SDK, passing in the result of \`client.chat.handler({ conversation })\`
    - Displays the content of the chat messages using \`messages.map(({ content, role, staffName, createdAt }) => ...)\`
    - Displays an input field to add a new message to the conversation as described in the Vercel AI SDK docs (i.e. controlled using \`input\`, \`handleInputChange\`, and \`handleSubmit\`)

## 5. New ticket button

- Above the conversation list, add a new ticket button which:
  - Uses the \`client.conversations.create()\` method to create a new conversation
  - Sets the \`selectedConversationSlug\` state variable to the new conversation's slug

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
