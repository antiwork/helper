import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { guideSessions } from "@/db/schema";
import { api } from "@/trpc/server";
import SessionDetails from "./_components/sessionDetails";

type PageProps = {
  mailbox_slug: string;
  session_id: string;
};

export default async function SessionPage(props: { params: Promise<PageProps> }) {
  const { mailbox_slug, session_id } = await props.params;

  const mailboxData = await api.mailbox.get({ mailboxSlug: mailbox_slug });
  const sessionId = parseInt(session_id, 10);

  if (isNaN(sessionId)) {
    return redirect(`/mailboxes/${mailbox_slug}/sessions`);
  }

  const session = await db.query.guideSessions.findFirst({
    where: eq(guideSessions.id, sessionId),
    with: {
      events: {
        orderBy: (e, { asc }) => [asc(e.timestamp)],
      },
      replays: {
        orderBy: (r, { asc }) => [asc(r.timestamp)],
      },
      conversation: true, // Add this line to include the conversation data
    },
  });

  if (!session) {
    notFound();
  }

  const replayEvents = session.replays ?? [];

  return <SessionDetails mailbox={mailboxData} session={session} replayEvents={replayEvents} />;
}
