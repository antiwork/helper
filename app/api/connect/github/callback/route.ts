import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { getMailbox } from "@/lib/data/mailbox";
import { listRepositories } from "@/lib/github/client";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const installationId = request.nextUrl.searchParams.get("installation_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${getBaseUrl()}/login`);

  const mailbox = await getMailbox();
  if (!mailbox) return NextResponse.redirect(`${getBaseUrl()}/mine`);

  const redirectUrl = new URL(`${getBaseUrl()}/settings`);

  if (!installationId) return NextResponse.redirect(`${redirectUrl}/integrations?githubConnectResult=error`);

  try {
    if ((await listRepositories(installationId)).length === 0) {
      return NextResponse.redirect(`${redirectUrl}/integrations?githubConnectResult=error`);
    }

    await db.update(mailboxes).set({ githubInstallationId: installationId }).where(eq(mailboxes.id, mailbox.id));

    return NextResponse.redirect(`${redirectUrl}/integrations?githubConnectResult=success`);
  } catch (error) {
    captureExceptionAndThrowIfDevelopment(error);
    return NextResponse.redirect(`${redirectUrl}/integrations?githubConnectResult=error`);
  }
}
