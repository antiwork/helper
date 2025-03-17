import { auth, currentUser } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { listRepositories } from "@/lib/github/client";
import { getAuthorizedMailbox } from "@/trpc";

export async function GET(request: NextRequest) {
  const installationId = request.nextUrl.searchParams.get("installation_id");

  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${getBaseUrl()}/login`);
  if (typeof user.unsafeMetadata.lastMailboxSlug !== "string")
    return NextResponse.redirect(`${getBaseUrl()}/mailboxes`);

  const session = await auth();
  if (!session.orgId) return NextResponse.redirect(`${getBaseUrl()}/mailboxes`);

  const mailbox = await getAuthorizedMailbox(session.orgId, user.unsafeMetadata.lastMailboxSlug);
  if (!mailbox) return NextResponse.redirect(`${getBaseUrl()}/mailboxes`);

  const redirectUrl = new URL(`${getBaseUrl()}/mailboxes/${mailbox.slug}/settings`);

  if (!installationId) return NextResponse.redirect(`${redirectUrl}?tab=integrations&githubConnectResult=error`);

  try {
    if ((await listRepositories(installationId)).length === 0) {
      return NextResponse.redirect(`${redirectUrl}?tab=integrations&githubConnectResult=error`);
    }

    await db.update(mailboxes).set({ githubInstallationId: installationId }).where(eq(mailboxes.id, mailbox.id));

    return NextResponse.redirect(`${redirectUrl}?tab=integrations&githubConnectResult=success`);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.redirect(`${redirectUrl}?tab=integrations&githubConnectResult=error`);
  }
}
