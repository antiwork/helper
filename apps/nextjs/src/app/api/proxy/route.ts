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
    // Validate URL
    const targetUrl = new URL(url);

    // Fetch the target website
    const response = await fetch(targetUrl.toString(), {
      headers: {
        // Pretend to be a regular browser
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

    // Get the HTML content
    const html = await response.text();

    // Parse the HTML using Cheerio
    const $ = cheerio.load(html);

    // Modify base/href tags to handle relative URLs
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

    // Get the modified HTML
    const modifiedHtml = $.html();

    // Return the modified HTML content with the appropriate Content-Type
    return new NextResponse(modifiedHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Disable caching to ensure fresh content
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
