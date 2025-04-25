"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mailboxes } from "@/db/schema";
import { RouterOutputs } from "@/trpc";
import CodeBlock from "./codeBlock";
import SectionWrapper from "./sectionWrapper";
import WidgetHMACSecret from "./widgetHMACSecret";

type WidgetMode = (typeof mailboxes.$inferSelect)["widgetDisplayMode"];

const NODE_HMAC_SAMPLE_CODE = `const crypto = require('crypto');

const hmacSecret = 'YOUR_HMAC_SECRET'; // This is the HMAC secret you got from this page
const email = 'customer@example.com'; // This is the email address of your authenticated customer
const timestamp = Date.now(); // This is the current timestamp in milliseconds

const hmac = crypto.createHmac('sha256', hmacSecret)
  .update(\`\${email}:\${timestamp}\`)
  .digest('hex'); // Format of content is "email:timestamp"`;

const WIDGET_SAMPLE_CODE = `<script src="https://helper.ai/widget/sdk.js{{QUERY_STRING}}"></script>`;

const ChatWidgetSetting = ({
  mailbox,
  onChange,
}: {
  mailbox: RouterOutputs["mailbox"]["get"];
  onChange?: (changes: {
    displayMode: WidgetMode;
    displayMinValue?: number;
    autoRespondEmailToChat?: boolean;
    widgetHost?: string;
  }) => void;
}) => {
  const [mode, setMode] = useState<WidgetMode>(mailbox.widgetDisplayMode ?? "off");
  const [minValue, setMinValue] = useState(mailbox.widgetDisplayMinValue?.toString() ?? "100");
  const [autoRespond, setAutoRespond] = useState(mailbox.autoRespondEmailToChat ?? false);
  const [widgetHost, setWidgetHost] = useState(mailbox.widgetHost ?? "");

  const handleSwitchChange = (checked: boolean) => {
    const newMode = checked ? "always" : "off";
    setMode(newMode);
    onChange?.({
      displayMode: newMode,
      displayMinValue: undefined,
    });
  };

  const handleModeChange = (value: "always" | "revenue_based") => {
    setMode(value);
    onChange?.({
      displayMode: value,
      displayMinValue: value === "revenue_based" ? parseInt(minValue) : undefined,
    });
  };

  const handleMinValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMinValue(newValue);
    if (mode === "revenue_based") {
      onChange?.({
        displayMode: "revenue_based",
        displayMinValue: parseInt(newValue),
      });
    }
  };

  const widgetSampleCode = WIDGET_SAMPLE_CODE.replace("{{QUERY_STRING}}", `?init&mailbox=${mailbox.slug}`);

  return (
    <div>
      <SectionWrapper
        className="max-w-3xl space-y-4"
        title="Widget Installation"
        description={
          <a
            href="https://docs.helper.ai/widget/01-overview"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1"
          >
            Documentation
            <ArrowTopRightOnSquareIcon className="size-4" />
          </a>
        }
      >
        <h3 className="text-lg font-semibold">Get started</h3>
        <p className="text-sm">Copy and paste this code into your website</p>
        <CodeBlock code={widgetSampleCode} language="html" />
        <h3 className="mt-8 text-lg font-semibold">Next steps</h3>
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
${widgetSampleCode}
                `.trim()}
                language="html"
              />
              <p className="text-sm">Supported options:</p>
              <ul className="text-sm list-disc pl-5 space-y-2">
                <li>
                  <code>title</code> - The title of the widget.
                </li>
                <li>
                  <code>icon_color</code> - A custom color for the widget icon.
                </li>
                <li>
                  <code>show_toggle_button</code> - Override the "Chat Icon Visibility" setting. Set to{" "}
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
            <AccordionTrigger className="[&[data-state=open]]:font-semibold">Authenticate your users</AccordionTrigger>
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
    email_hash: 'GENERATED_HMAC',
    timestamp: GENERATED_TIMESTAMP_IN_MILLISECONDS
  }
</script>
<!-- The script you added earlier -->
${widgetSampleCode}
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
${widgetSampleCode}
                  `.trim()}
                  language="html"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="react">
            <AccordionTrigger className="[&[data-state=open]]:font-semibold">Use with React/Next.js</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <p className="text-sm">
                  The{" "}
                  <a
                    href="https://www.npmjs.com/package/@helperai/react"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @helperai/react
                  </a>{" "}
                  package provides first-class support for Next.js and React applications.
                </p>
                <p className="text-sm">
                  First, add your Helper authentication credentials to your environment variables. For local
                  development, add these to your environment file, and for production add them to your deployment
                  environment:
                </p>
                <CodeBlock
                  code={`HELPER_HMAC_SECRET=${mailbox.widgetHMACSecret}
HELPER_MAILBOX_SLUG=${mailbox.slug}`}
                  language="bash"
                />

                <p className="text-sm">Install the package:</p>
                <CodeBlock code="npm install @helperai/react" language="bash" />

                <p className="text-sm">Then, set up the provider in your root layout:</p>
                <CodeBlock
                  code={`// app/layout.tsx or similar
import { HelperProvider, generateHelperAuth } from '@helperai/react';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // Your auth solution
  if (!session?.user?.email) return children;

  const helperAuth = await generateHelperAuth({
    email: session.user.email,
    metadata: {
      value: "CUSTOMER_VALUE", // Optional: Revenue value
      name: "CUSTOMER_NAME",   // Optional: Customer name
      links: {
        "Profile": "https://example.com/profile"
      }
    }
  });
  
  return (
    <html>
      <body>
        <HelperProvider {...helperAuth}>
          {children}
        </HelperProvider>
      </body>
    </html>
  );
}`}
                  language="typescript"
                />

                <p className="text-sm">Use the useHelper hook in your components:</p>
                <CodeBlock
                  code={`import { useHelper } from '@helperai/react';

export function SupportButton() {
  const { show, sendPrompt } = useHelper();
  
  return (
    <button onClick={() => {
      sendPrompt('How do I change my plan?');
    }}>
      Get Help
    </button>
  );
}`}
                  language="typescript"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SectionWrapper>
      <SectionWrapper
        title="Chat Icon Visibility"
        description="Choose when your customers can see the chat widget on your website or app"
        initialSwitchChecked={mode !== "off"}
        onSwitchChange={handleSwitchChange}
      >
        {mode !== "off" && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Show chat icon for</Label>
              <Select value={mode} onValueChange={handleModeChange}>
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
                  onChange={handleMinValueChange}
                  className="max-w-[200px]"
                  min="0"
                  step="1"
                />
              </div>
            )}
          </div>
        )}
      </SectionWrapper>

      <SectionWrapper
        title="Email to Chat Auto-Response"
        description="Configure automatic email responses to redirect users to the chat widget"
        initialSwitchChecked={autoRespond}
        onSwitchChange={(checked) => {
          setAutoRespond(checked);
          onChange?.({
            displayMode: mode,
            displayMinValue: mode === "revenue_based" ? parseInt(minValue) : undefined,
            autoRespondEmailToChat: checked,
            widgetHost: checked ? widgetHost : undefined,
          });
        }}
      >
        {autoRespond && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="widgetHost">Chat widget host URL</Label>
              <Input
                id="widgetHost"
                type="url"
                value={widgetHost}
                onChange={(e) => {
                  setWidgetHost(e.target.value);
                  onChange?.({
                    displayMode: mode,
                    displayMinValue: mode === "revenue_based" ? parseInt(minValue) : undefined,
                    autoRespondEmailToChat: autoRespond,
                    widgetHost: e.target.value,
                  });
                }}
                placeholder="https://example.com"
                className="max-w-[350px]"
              />
              <p className="text-sm text-muted-foreground">
                The URL where your chat widget is installed. Users will be redirected here to continue the conversation.
              </p>
            </div>
          </div>
        )}
      </SectionWrapper>
    </div>
  );
};

export default ChatWidgetSetting;
