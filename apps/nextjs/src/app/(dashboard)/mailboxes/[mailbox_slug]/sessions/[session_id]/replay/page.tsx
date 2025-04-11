import { redirect } from "next/navigation";
import { getGuideSessionReplays } from "@/lib/data/guide";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { api } from "@/trpc/server";
import SessionReplay from "./_components/session-replay";

type PageProps = {
  mailbox_slug: string;
  session_id: string;
};

export default async function ReplayPage(props: { params: PageProps }) {
  const { mailbox_slug, session_id } = props.params;

  try {
    const mailboxData = await api.mailbox.get({ mailboxSlug: mailbox_slug });
    const sessionId = parseInt(session_id, 10);

    if (isNaN(sessionId)) {
      return redirect(`/mailboxes/${mailbox_slug}/sessions`);
    }

    const replayEvents = await getGuideSessionReplays(sessionId);

    return (
      <>
        <title>Session Replay</title>
        <SessionReplay mailbox={mailboxData} sessionId={sessionId} replayEvents={replayEvents} />
      </>
    );
  } catch (error) {
    captureExceptionAndLog(error);
    return redirect(`/mailboxes/${mailbox_slug}/sessions`);
  }
}
