"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HelperWidgetScript } from "@helperai/react";
import { useShowChatWidget } from "@/app/(dashboard)/clientLayout";
import { getBaseUrl, getMarketingSiteUrl } from "@/components/constants";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { mailboxes } from "@/db/schema";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper, { SwitchSectionWrapper } from "../sectionWrapper";
import CodeBlock from "./codeBlock";
import WidgetHMACSecret from "./widgetHMACSecret";

type WidgetMode = (typeof mailboxes.$inferSelect)["widgetDisplayMode"];

const NODE_HMAC_SAMPLE_CODE = `const crypto = require('crypto');

const hmacSecret = 'YOUR_HMAC_SECRET'; // This is the HMAC secret you got from this page
const email = 'customer@example.com'; // This is the email address of your authenticated customer
const timestamp = Date.now(); // This is the current timestamp in milliseconds

const hmac = crypto.createHmac('sha256', hmacSecret)
  .update(\`\${email}:\${timestamp}\`)
  .digest('hex'); // Format of content is "email:timestamp"`;

const WIDGET_SAMPLE_CODE = `<script src="${getBaseUrl()}/widget/sdk.js" async></script>`;

const ChatWidgetSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const [mode, setMode] = useState<WidgetMode>(mailbox.widgetDisplayMode ?? "off");
  const [minValue, setMinValue] = useState(mailbox.widgetDisplayMinValue?.toString() ?? "100");
  const [autoRespond, setAutoRespond] = useState<"off" | "draft" | "reply">(
    mailbox.preferences?.autoRespondEmailToChat ?? "off",
  );
  const [widgetHost, setWidgetHost] = useState(mailbox.widgetHost ?? "");
  const [isCopied, setIsCopied] = useState(false);
  const chatVisibilitySaving = useSavingIndicator();
  const hostUrlSaving = useSavingIndicator();
  const emailResponseSaving = useSavingIndicator();
  const { showChatWidget, setShowChatWidget } = useShowChatWidget();

  useEffect(() => {
    setShowChatWidget(mode !== "off");
    return () => setShowChatWidget(false);
  }, [mode]);

  const utils = api.useUtils();
  const { mutate: updateChatVisibility } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      chatVisibilitySaving.setState("saved");
    },
    onError: (error) => {
      chatVisibilitySaving.setState("error");
      toast.error("Error updating chat visibility settings", {
        description: error.message,
      });
    },
  });

  const { mutate: updateHostUrl } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      hostUrlSaving.setState("saved");
    },
    onError: (error) => {
      hostUrlSaving.setState("error");
      toast.error("Error updating host URL", {
        description: error.message,
      });
    },
  });

  const { mutate: updateEmailResponse } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      emailResponseSaving.setState("saved");
    },
    onError: (error) => {
      emailResponseSaving.setState("error");
      toast.error("Error updating email response settings", {
        description: error.message,
      });
    },
  });

  const saveChatVisibility = useDebouncedCallback(() => {
    chatVisibilitySaving.setState("saving");
    updateChatVisibility({
      widgetDisplayMode: mode,
      widgetDisplayMinValue: mode === "revenue_based" && /^\d+$/.test(minValue) ? Number(minValue) : null,
    });
  }, 500);

  const saveHostUrl = useDebouncedCallback(() => {
    hostUrlSaving.setState("saving");
    updateHostUrl({
      widgetHost: widgetHost || null,
    });
  }, 500);

  const saveEmailResponse = useDebouncedCallback(() => {
    emailResponseSaving.setState("saving");
    updateEmailResponse({
      preferences: {
        autoRespondEmailToChat: autoRespond === "off" ? null : autoRespond,
      },
    });
  }, 500);

  useOnChange(() => {
    saveChatVisibility();
  }, [mode, minValue]);

  useOnChange(() => {
    saveHostUrl();
  }, [widgetHost]);

  useOnChange(() => {
    saveEmailResponse();
  }, [autoRespond]);

  const handleSwitchChange = (checked: boolean) => {
    const newMode = checked ? "always" : "off";
    setMode(newMode);
    setShowChatWidget(newMode !== "off");
  };

  const plainJSPrompt = `
Integrate the helper.ai widget into my app.

First, add the following code snippet in my HTML layout before the closing </body> tag:

\`\`\`
${WIDGET_SAMPLE_CODE}
\`\`\`

Then, ask if I want to do either of the following:

- Customize the widget title or icon color
- Authenticate my users

DO NOT do any of the following until I have confirmed that I want to do them.

If I want to customize the widget, add the following code snippet *immediately above* the widget script tag:

\`\`\`
<script>
  window.helperWidgetConfig = {
    title: "<widget title>",
    iconColor: "<hex color>",
  }
</script>
\`\`\`

Omit the other property if I don't want to customize it.

If I want to authenticate my users, add code to generate an HMAC hash on the server side. Adapt this Node.js code as appropriate for my backend technology:

\`\`\`
${NODE_HMAC_SAMPLE_CODE}
\`\`\`

Store the HMAC secret separately, for example in an environment variable or secret. It MUST NOT be exposed to the client side or committed to version control. The secret to store is: ${mailbox.widgetHMACSecret}

Then, add the generated hash, customer email, and timestamp to the widget config. Add the script tag *immediately above* the widget script tag if it doesn't exist, or reuse the existing script tag if it does.

Make sure to inject the placeholder values based on what was generated on the server side.

\`\`\`
<script>
  window.helperWidgetConfig = {
    email: "<customer email>",
    emailHash: "<generated HMAC hash>",
    timestamp: "<generated timestamp>",
  }
</script>
\`\`\`
  `.trim();

  const reactPrompt = `
Integrate the Helper widget into my React/Next.js app.

First, install the React package (use yarn, pnpm, etc instead if the current project uses it):

\`\`\`
npm install @helperai/react
\`\`\`

Then, add the HelperWidgetScript at the root of my app:

\`\`\`
// app/layout.tsx or similar
import { HelperWidgetScript } from '@helperai/react';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <HelperWidgetScript host="${getBaseUrl()}" />
        {children}
      </body>
    </html>
  );
}
\`\`\`

Then, ask if I want to do either of the following:

- Customize the widget title or icon color
- Authenticate my users

DO NOT do any of the following until I have confirmed that I want to do them.

If I want to customize the widget, add props to the HelperProvider:

\`\`\`
<HelperProvider
  host="${getBaseUrl()}"
  title="<widget title>"
  iconColor="<hex color>"
>
  {children}
</HelperProvider>
\`\`\`

If I want to authenticate my users add a call to generateHelperAuth and pass the result to the HelperProvider. This is a Next.js example using server components. Adapt it as appropriate for my backend technology:

\`\`\`
// app/layout.tsx or similar
import { HelperProvider, generateHelperAuth } from '@helperai/react';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); // Your auth solution

  const helperAuth = session.user.email
    ? await generateHelperAuth({
        email: session.user.email,
        hmacSecret: "YOUR_HMAC_SECRET",
      })
    : {};

  return (
    <html>
      <body>
        <HelperProvider host="${getBaseUrl()}" {...helperAuth}>
          {children}
        </HelperProvider>
      </body>
    </html>
  );
}
\`\`\`

Store the HMAC secret separately, for example in an environment variable or secret. It MUST NOT be exposed to the client side or committed to version control. The secret to store is: ${mailbox.widgetHMACSecret}

If my backend technology is not Node.js, generate the HMAC hash manually by adapting this Node.js example:

\`\`\`
${NODE_HMAC_SAMPLE_CODE}
\`\`\`
  `.trim();

  return (
    <div className="space-y-6">
      <SectionWrapper
        className="max-w-3xl space-y-4"
        title="Widget Installation"
        description={
          <a
            href={`${getMarketingSiteUrl()}/docs/widget/01-overview`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1"
          >
            Documentation
            <ExternalLink className="size-4" />
          </a>
        }
      >
        <Tabs defaultValue="vanilla" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="vanilla">HTML/JavaScript</TabsTrigger>
            <TabsTrigger value="react">React/Next.js</TabsTrigger>
          </TabsList>

          <TabsContent value="vanilla" className="space-y-4">
            <h3 className="flex items-center justify-between text-lg font-semibold">
              Get started
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="subtle"
                      onClick={() => {
                        navigator.clipboard.writeText(plainJSPrompt);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                    >
                      <Sparkles className="size-4 text-bright mr-2" />
                      {isCopied ? "Copied!" : "Copy AI agent prompt"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paste into Cursor, Copilot or other AI coding agents</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            <p className="text-sm">Copy and paste this code into your website:</p>
            <CodeBlock code={WIDGET_SAMPLE_CODE} language="html" />
            <h3 className="mt-8 text-lg font-semibold">Optional: Next steps</h3>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="customize">
                <AccordionTrigger className="[&[data-state=open]]:font-semibold">Customize the widget</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm">
                    Customize the widget by adding a <code>helperWidgetConfig</code> object <strong>above</strong> the
                    widget script tag.
                  </p>
                  <CodeBlock
                    code={`
<script>
  window.helperWidgetConfig = {
    title: "My Helper Widget",
  }
</script>
<!-- The script you added earlier -->
${WIDGET_SAMPLE_CODE}
                    `.trim()}
                    language="html"
                  />
                  <p className="text-sm">Supported options:</p>
                  <ul className="text-sm list-disc pl-5 space-y-2">
                    <li>
                      <code>title</code> - The title of the widget.
                    </li>
                    <li>
                      <code>iconColor</code> - A custom color for the widget icon.
                    </li>
                    <li>
                      <code>showToggleButton</code> - Override the "Chat Icon Visibility" setting. Set to{" "}
                      <code>true</code> to show the button or <code>false</code> to hide the button.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contextual">
                <AccordionTrigger className="[&[data-state=open]]:font-semibold">
                  Add contextual help buttons
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-sm">
                      Use the <span className="rounded-md bg-muted p-1 font-mono text-xs">data-helper-prompt</span>{" "}
                      attribute to open the chat widget with a specific prompt:
                    </p>
                    <CodeBlock
                      code="<button data-helper-prompt='How do I change my plan?'>Get help with plans</button>"
                      language="html"
                    />
                    <p className="text-sm">
                      Or toggle the chat widget with the{" "}
                      <span className="rounded-md bg-muted p-1 font-mono text-xs">data-helper-toggle</span> attribute:
                    </p>
                    <CodeBlock code="<button data-helper-toggle>Open chat</button>" language="html" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="authenticate">
                <AccordionTrigger className="[&[data-state=open]]:font-semibold">
                  Authenticate your users
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-sm">
                      First, you'll need to generate an HMAC hash on your server using the secret below:
                    </p>
                    <WidgetHMACSecret hmacSecret={mailbox.widgetHMACSecret} />
                    <p className="text-sm">Sample code to generate HMAC secret (Node.js)</p>
                    <CodeBlock code={NODE_HMAC_SAMPLE_CODE} language="javascript" />
                    <p className="text-sm">
                      Then add the generated hash, customer email, and timestamp to your widget config:
                    </p>
                    <CodeBlock
                      code={`
<script>
  window.helperWidgetConfig = {
    // ... any existing config ...
    email: 'customer@example.com',
    emailHash: 'GENERATED_HMAC',
    timestamp: GENERATED_TIMESTAMP_IN_MILLISECONDS
  }
</script>
<!-- The script you added earlier -->
${WIDGET_SAMPLE_CODE}
                      `.trim()}
                      language="html"
                    />
                    <p className="text-sm">
                      Optionally, you can add metadata to give Helper more context about the customer:
                    </p>
                    <CodeBlock
                      code={`
<script>
  window.helperWidgetConfig = {
    // ... existing config ...
    metadata: {
      name: 'John Doe', // Optional: Customer name
      value: 1000, // Optional: Value of the customer for sorting tickets and VIP support
      links: {
        'Profile': 'https://example.com/profile' // Optional: Links to show in Helper alongside conversations from this customer
      }
    }
  }
</script>
<!-- The script you added earlier -->
${WIDGET_SAMPLE_CODE}
                      `.trim()}
                      language="html"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="react" className="space-y-4">
            <h3 className="flex items-center justify-between text-lg font-semibold">
              Get started
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="subtle"
                      onClick={() => {
                        navigator.clipboard.writeText(reactPrompt);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                    >
                      <Sparkles className="size-4 text-bright mr-2" />
                      {isCopied ? "Copied!" : "Copy AI agent prompt"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paste into Cursor, Copilot or other AI coding agents</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            <p className="text-sm">Install the React package:</p>
            <CodeBlock code="npm install @helperai/react" language="bash" />

            <p className="text-sm">Then add the provider at the root of your app:</p>
            <CodeBlock
              code={`// app/layout.tsx or similar
import { HelperWidgetScript } from '@helperai/react';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <HelperWidgetScript host="${getBaseUrl()}" />
        {children}
      </body>
    </html>
  );
}`}
              language="typescript"
            />

            <h3 className="mt-8 text-lg font-semibold">Optional: Next steps</h3>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="customize">
                <AccordionTrigger className="[&[data-state=open]]:font-semibold">Customize the widget</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm">
                    Customize the widget by adding props to the <code>HelperProvider</code>.
                  </p>
                  <CodeBlock
                    code={`
<HelperProvider
  host="${getBaseUrl()}"
  title="My Helper Widget"
  iconColor="#ff0000"
>
  {children}
</HelperProvider>
                    `.trim()}
                    language="html"
                  />
                  <p className="text-sm">Supported options:</p>
                  <ul className="text-sm list-disc pl-5 space-y-2">
                    <li>
                      <code>title</code> - The title of the widget.
                    </li>
                    <li>
                      <code>iconColor</code> - A custom color for the widget icon.
                    </li>
                    <li>
                      <code>showToggleButton</code> - Override the "Chat Icon Visibility" setting. Set to{" "}
                      <code>true</code> to show the button or <code>false</code> to hide the button.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contextual">
                <AccordionTrigger className="[&[data-state=open]]:font-semibold">
                  Add contextual help buttons
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-sm">
                      Use the <code>useHelper</code> hook to add contextual help buttons:
                    </p>
                    <CodeBlock
                      code={`import { useHelper } from '@helperai/react';

export function SupportButton() {
  const { show, sendPrompt } = useHelper();
  
  return (
    <div>
      <button onClick={() => {
        sendPrompt('How do I change my plan?');
      }}>
        Get Help
      </button>
      <button onClick={() => {
        show();
      }}>
        Open chat
      </button>
    </div>
  );
}`}
                      language="typescript"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="authenticate">
                <AccordionTrigger className="[&[data-state=open]]:font-semibold">
                  Authenticate your users
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-sm">
                      First, add your Helper authentication credentials to your environment variables. For local
                      development, add these to your environment file, and for production add them to your deployment
                      environment:
                    </p>
                    <CodeBlock code={`HELPER_HMAC_SECRET=${mailbox.widgetHMACSecret}`} language="bash" />
                    <p className="text-sm">
                      Then call <code>generateHelperAuth</code> in your root layout and pass the result to the{" "}
                      <code>HelperProvider</code>. Refer to the HTML/JavaScript guide if your backend is not in Node.js.
                    </p>
                    <CodeBlock
                      code={`// app/layout.tsx or similar
import { HelperProvider, generateHelperAuth } from '@helperai/react';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // Your auth solution

  const helperAuth = session.user.email
    ? await generateHelperAuth({
        email: session.user.email,
        hmacSecret: "YOUR_HMAC_SECRET",
      })
    : {};
  
  return (
    <html>
      <body>
        <HelperProvider host="${getBaseUrl()}" {...helperAuth}>
          {children}
        </HelperProvider>
      </body>
    </html>
  );
}`}
                      language="typescript"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>
      </SectionWrapper>
      <div className="relative">
        <div className="absolute top-2 right-4 z-10">
          <SavingIndicator state={chatVisibilitySaving.state} />
        </div>
        <SwitchSectionWrapper
          title="Chat Icon Visibility"
          description="Choose when your customers can see the chat widget on your website or app"
          initialSwitchChecked={mode !== "off"}
          onSwitchChange={handleSwitchChange}
        >
          {mode !== "off" && (
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Show chat icon for</Label>
                <Select value={mode} onValueChange={(mode) => setMode(mode as WidgetMode)}>
                  <SelectTrigger className="w-[350px]">
                    <SelectValue placeholder="Select when to show chat icon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">All customers</SelectItem>
                    <SelectItem value="revenue_based">Customers with value greater than</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "revenue_based" && (
                <div className="flex items-center space-x-4">
                  <Input
                    id="min-value"
                    type="number"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    className="max-w-[200px]"
                    min="0"
                    step="1"
                  />
                </div>
              )}
            </div>
          )}
        </SwitchSectionWrapper>
      </div>

      <div className="relative">
        <div className="absolute top-2 right-4 z-10">
          <SavingIndicator state={hostUrlSaving.state} />
        </div>
        <SectionWrapper
          title="Chat widget host URL"
          description="The URL where your chat widget is installed. If set, customers will be able to continue email conversations in the chat widget."
        >
          <div className="flex flex-col space-y-2">
            <Label htmlFor="widgetHost">Host URL</Label>
            <Input
              id="widgetHost"
              type="url"
              value={widgetHost}
              onChange={(e) => setWidgetHost(e.target.value)}
              placeholder="https://example.com"
              className="max-w-[350px]"
            />
          </div>
        </SectionWrapper>
      </div>

      <div className="relative">
        <div className="absolute top-2 right-4 z-10">
          <SavingIndicator state={emailResponseSaving.state} />
        </div>
        <SectionWrapper
          title="Respond to email inquiries with chat"
          description="Automatically respond to emails as if the customer was using the chat widget."
        >
          <div className="space-y-4">
            <Tabs value={autoRespond} onValueChange={(value) => setAutoRespond(value as "off" | "draft" | "reply")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="off">Off</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="reply">Reply</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </SectionWrapper>
      </div>

      {showChatWidget && (
        <div className="fixed bottom-8 right-24 bg-primary text-primary-foreground px-3 py-1.5 rounded-md">
          Try it out →
        </div>
      )}

      {showChatWidget && (
        <HelperWidgetScript host={typeof window !== "undefined" ? window.location.origin : ""} showToggleButton />
      )}
    </div>
  );
};

export default ChatWidgetSetting;
