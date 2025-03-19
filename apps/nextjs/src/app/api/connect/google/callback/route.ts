import { NextResponse } from "next/server";
import { auth, connectSupportEmailUrl } from "@/app/api/connect/google/utils";
import { gmailScopesGranted } from "@/auth/lib/authService";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { env } from "@/env";
import { connectSupportEmail } from "@/lib/authService";
import { getMailboxBySlug } from "@/lib/data/mailbox";
import { completeOnboardingStep } from "@/lib/data/onboarding";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const mailbox = assertDefined(await getMailboxBySlug(assertDefined(state)));
  const isOnboarding = !mailbox.onboardingMetadata?.emailConnectedAt;

  if (!code || !state) return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/settings?error=invalid_code`);

  try {
    const { tokens } = await auth.getToken(code);
    if (!tokens.id_token || !tokens.access_token || !tokens.refresh_token || !tokens.scope) {
      return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/settings?error=invalid_token`);
    }

    const idToken = await auth.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const details = idToken.getPayload();
    if (!details?.email) {
      return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/settings?error=invalid_email`);
    }
    if (!gmailScopesGranted(tokens.scope.split(" "))) return NextResponse.redirect(connectSupportEmailUrl(state));

    await connectSupportEmail(state, {
      email: details.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expiry_date!),
    });
    if (isOnboarding) {
      await completeOnboardingStep(mailbox.id, "email");
      return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/onboarding`);
    }
    return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/settings?tab=integrations`);
  } catch (error) {
    if (isOnboarding) {
      return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/onboarding?error=${error}`);
    }
    return NextResponse.redirect(`${getBaseUrl()}/mailboxes/${state}/settings?error=${error}`);
  }
}
