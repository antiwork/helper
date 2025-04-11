import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { guideSessions } from "@/db/schema";
import { api } from "@/trpc/server";
import SessionEvents from "./_components/session-events";

type PageProps = {
  mailbox_slug: string;
  session_id: string;
};

export default async function SessionPage(props: { params: PageProps }) {
  const { mailbox_slug, session_id } = props.params;

  try {
    const mailboxData = await api.mailbox.get({ mailboxSlug: mailbox_slug });
    const sessionId = parseInt(session_id, 10);

    if (isNaN(sessionId)) {
      return redirect(`/mailboxes/${mailbox_slug}/sessions`);
    }

    // Get the session and its events
    const session = await db.query.guideSessions.findFirst({
      where: eq(guideSessions.id, sessionId),
      with: {
        events: {
          orderBy: (e, { asc }) => [asc(e.timestamp)],
        },
      },
    });

    if (!session) {
      return redirect(`/mailboxes/${mailbox_slug}/sessions`);
    }

    return (
      <>
        <title>Session Events</title>
        <SessionEvents mailbox={mailboxData} session={session} />
      </>
    );
  } catch (error) {
    console.error("Error loading session:", error);
    return redirect(`/mailboxes/${mailbox_slug}/sessions`);
  }
}
