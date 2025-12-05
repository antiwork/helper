import { NextResponse } from "next/server";
import { auth, connectSupportEmailUrl } from "@/app/api/connect/google/utils";
import { getBaseUrl } from "@/components/constants";
import { gmailScopesGranted } from "@/lib/auth/authService";
import { env } from "@/lib/env";
import { api } from "@/trpc/server";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(`${getBaseUrl()}/settings/integrations?error=missing_oauth_code`);

  try {
    const { tokens } = await auth.getToken(code);
    if (!tokens.id_token || !tokens.access_token || !tokens.refresh_token || !tokens.scope) {
      return NextResponse.redirect(`${getBaseUrl()}/settings/integrations?error=invalid_code`);
    }

    const idToken = await auth.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const details = idToken.getPayload();
    if (!details?.email) {
      return NextResponse.redirect(`${getBaseUrl()}/settings/integrations?error=invalid_email`);
    }
    if (!gmailScopesGranted(tokens.scope.split(" "))) return NextResponse.redirect(connectSupportEmailUrl());

    await api.gmailSupportEmail.create({
      email: details.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date!),
    });
    return NextResponse.redirect(`${getBaseUrl()}/settings/integrations`);
  } catch (error) {
    return NextResponse.redirect(`${getBaseUrl()}/settings/integrations?error=${error}`);
  }
}
