import { NextResponse } from "next/server";
import { getBaseUrl } from "@/components/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/mailboxes";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${getBaseUrl()}/auth-error?error=${error.message}`);
    return NextResponse.redirect(`${getBaseUrl()}${next}`);
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${getBaseUrl()}/auth-error`);
}
