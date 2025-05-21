import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const nextParam = searchParams.get("next");
  const nextUrl = new URL(nextParam ?? "/mailboxes", origin);
  const next = nextUrl.origin === origin ? nextUrl : `${origin}/mailboxes`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/auth-error?error=${encodeURIComponent(error.message)}`);
    return NextResponse.redirect(next);
  }

  return NextResponse.redirect(
    `${origin}/auth-error?error=${encodeURIComponent(searchParams.get("error_description") ?? "")}&error_code=${encodeURIComponent(searchParams.get("error_code") ?? "")}`,
  );
}
