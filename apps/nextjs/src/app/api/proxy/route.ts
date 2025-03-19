import crypto from "crypto";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const HELPER_SDK_URL = `${env.AUTH_URL}/widget/sdk.js`;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const mailboxSlug = request.nextUrl.searchParams.get("mailboxSlug") || "";

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${response.statusText}` },
        { status: response.status },
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $("head").prepend(`<base href="${targetUrl.origin}${targetUrl.pathname}" />`);

    // Inject the actual Helper widget script before the closing body tag
    $("body").append(`
      <script>
        (function(d,t) {
          var g=d.createElement("script");
          g.src="${HELPER_SDK_URL}";
          g.onload=function(){
            window.HelperWidget.init({
              mailbox_slug: "${mailboxSlug}", 
              title: "Support",
            })
          }
          d.body.appendChild(g);
        })(document);
      </script>
    `);

    // Remove any Content-Security-Policy meta tags that might block our injected script
    $('meta[http-equiv="Content-Security-Policy"]').remove();

    const modifiedHtml = $.html();

    // Return the modified HTML content with the appropriate Content-Type
    return new NextResponse(modifiedHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
