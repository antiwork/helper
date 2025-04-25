import { NextResponse } from "next/server";

export const GET = () => {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Widget Test</title>
    <script src="https://helperai.dev/widget/sdk.js" data-mailbox="gumroad" async></script>
  </head>
  <body style="display: flex; justify-content: center; align-items: center; height: 100vh">
    <div style="display: flex; flex-direction: column; gap: 10px; align-items: center">
      <h1>Widget Test</h1>
      <button data-helper-toggle>Open Widget</button>
      <button data-helper-prompt="How do I change my plan?">Get Help</button>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
};
