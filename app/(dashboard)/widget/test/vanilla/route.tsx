import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const GET = () => {
  const helperHost = env.HELPER_HOST;
  if (!helperHost) {
    throw new Error("HELPER_HOST environment variable is required");
  }
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Widget Test</title>
    <script src="${helperHost}/widget/sdk.js" data-mailbox="gumroad" async></script>
  </head>
  <body style="margin: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; height: 100vh">
    <h1 style="margin-top: auto">Widget Test</h1>
    <button data-helper-toggle>Open Widget</button>
    <button data-helper-prompt="How do I change my plan?">Get Help</button>
    <a href="/widget/test" style="margin-top: auto; margin-bottom: 12px">Next.js Test Page →</a>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
};
