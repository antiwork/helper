import * as Ably from "ably";

// We only want one Ably client to exist at a time, and we need to recreate it when changing mailboxes.
// React 18's double rendering makes it extremely awkward to do this reliably within a component.
let ablyClient: { client: Ably.Realtime; mailboxSlug: string } | null = null;
export const getGlobalAblyClient = (mailboxSlug: string) => {
  if (ablyClient?.mailboxSlug !== mailboxSlug) {
    const oldClient = ablyClient?.client;
    ablyClient = {
      client: new Ably.Realtime({
        authUrl: `/api/ably?mailboxSlug=${encodeURIComponent(mailboxSlug)}`,
      }),
      mailboxSlug,
    };
    setTimeout(() => oldClient?.close(), 1000);
  }
  return ablyClient.client;
};
