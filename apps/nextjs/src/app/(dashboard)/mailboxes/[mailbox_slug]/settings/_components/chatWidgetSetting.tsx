"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const WIDGET_SAMPLE_CODE = `<script>
  (function(d,t) {
    var g=d.createElement("script");
    g.src="https://helper.ai/widget/sdk.js";
    g.onload=function(){
      window.HelperWidget.init({
        email: "CUSTOMER_EMAIL", // This is the email address of your authenticated customer
        email_hash: "GENERATED_HMAC_FROM_SERVER", // This is the HMAC you generated from the server
        mailbox_slug: "YOUR_MAILBOX_SLUG", // This is your mailbox slug
        timestamp: TIMESTAMP, // Same timestamp as the one used to generate the HMAC in the server
        title: "Support", // You can customize the title of the chat widget (optional)
        metadata: { // Add additional customer information to Helper
          value: "CUSTOMER_VALUE", // Revenue value of the customer (optional)
          name: "CUSTOMER_NAME", // Name of the customer (optional)
          links: {"Impersonate": "https://example.com/impersonate", "Dashboard": "https://example.com/dashboard"}, // Links of the customer (optional)
        },
      })
    }
    d.body.appendChild(g);
  })(document);
</script>`;

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

  const widgetSampleCode = WIDGET_SAMPLE_CODE.replace("YOUR_MAILBOX_SLUG", mailbox.slug || "");

  return (
    <div>
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

      <h2 className="mb-2 mt-4 text-lg font-semibold text-foreground">Setup instructions</h2>
      <p className="text-md mt-2 text-sm text-foreground">
        To install the chat widget, you'll need to set up both backend and frontend components. For complete
        documentation, visit{" "}
        <a
          href="http://docs.helper.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          docs.helper.ai
        </a>
        . Choose your preferred implementation method below.
      </p>

      <div className="mt-8">
        <Tabs defaultValue="react" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="react">React / Next.js</TabsTrigger>
            <TabsTrigger value="javascript">Vanilla JavaScript + Backend</TabsTrigger>
          </TabsList>

          <TabsContent value="react" className="space-y-6">
            <div className="rounded-lg border p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-foreground">React/Next.js Setup</h2>
              <div className="space-y-6">
                <div>
                  <p className="mb-4 text-sm">
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
                  <p className="mb-4 text-sm">
                    First, add your Helper authentication credentials to your environment variables. For local
                    development, add these to your environment file, and for production add them to your deployment
                    environment:
                  </p>
                  <CodeBlock
                    code={`HELPER_HMAC_SECRET=${mailbox.widgetHMACSecret}
HELPER_MAILBOX_SLUG=${mailbox.slug}`}
                    language="bash"
                  />

                  <p className="mb-4 mt-6 text-sm">Install the package:</p>
                  <CodeBlock code="npm install @helperai/react" language="bash" />

                  <p className="mb-4 mt-6 text-sm">Then, set up the provider in your root layout:</p>
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

                  <p className="mb-4 mt-4 text-sm">Use the useHelper hook in your components:</p>
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

                <div className="mt-6">
                  <h3 className="mb-2 text-md font-semibold">Advanced Usage</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="mb-4 text-sm font-semibold">Show or hide the chat widget</p>
                      <CodeBlock
                        code={`import { useHelper } from '@helperai/react';

function ChatControls() {
  const { show, hide, toggle } = useHelper();
  
  return (
    <div>
      <button onClick={show}>Show Chat</button>
      <button onClick={hide}>Hide Chat</button>
      <button onClick={toggle}>Toggle Chat</button>
    </div>
  );
}`}
                        language="typescript"
                      />
                    </div>

                    <div>
                      <p className="mb-4 text-sm font-semibold">Add contextual help buttons</p>
                      <CodeBlock
                        code={`import { useHelper } from '@helperai/react';

function HelpButton({ prompt }: { prompt: string }) {
  const { show, sendPrompt } = useHelper();
  
  return (
    <button onClick={() => {
      sendPrompt(prompt);
    }}>
      Get Help
    </button>
  );
}`}
                        language="typescript"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="javascript" className="space-y-6">
            <div className="rounded-lg border p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Backend Setup</h2>
              <p className="mb-4 text-sm">
                First, you'll need to generate an HMAC hash on your server using the secret below:
              </p>

              <div className="sm:w-full xl:w-1/3">
                <WidgetHMACSecret hmacSecret={mailbox.widgetHMACSecret} />
              </div>

              <p className="mb-2 mt-4 text-sm">Sample code to generate HMAC secret (Node.js)</p>
              <CodeBlock code={NODE_HMAC_SAMPLE_CODE} language="javascript" />
            </div>

            <div className="rounded-lg border p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. Frontend Setup</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-md font-semibold">Basic Implementation</h3>
                  <p className="mb-4 text-sm">Add the following code to your application:</p>
                  <CodeBlock code={widgetSampleCode} language="html" />
                </div>

                <div>
                  <h3 className="mb-2 text-md font-semibold">Advanced Usage</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="mb-4 text-sm font-semibold">Show or hide the chat widget</p>
                      <CodeBlock code="window.HelperWidget.show();" language="javascript" />
                      <CodeBlock code="window.HelperWidget.hide();" language="javascript" />
                      <CodeBlock code="window.HelperWidget.toggle();" language="javascript" />
                    </div>

                    <div>
                      <p className="mb-4 text-sm font-semibold">Add contextual help buttons</p>
                      <p className="mb-4 text-sm">
                        Use the <span className="rounded-md bg-muted p-1 font-mono text-xs">data-helper-prompt</span>{" "}
                        attribute:
                      </p>
                      <CodeBlock
                        code="<button data-helper-prompt='How do I change my plan?'>Get help with plans</button>"
                        language="html"
                      />
                      <p className="mb-4 mt-4 text-sm">
                        Or toggle visibility with the{" "}
                        <span className="rounded-md bg-muted p-1 font-mono text-xs">data-helper-toggle</span> attribute:
                      </p>
                      <CodeBlock code="<button data-helper-toggle>Open chat</button>" language="html" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatWidgetSetting;
