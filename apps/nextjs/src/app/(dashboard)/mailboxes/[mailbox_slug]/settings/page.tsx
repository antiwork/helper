import { revalidatePath } from "next/cache";
import { api } from "@/trpc/server";
import { getSidebarInfo } from "../_components/getSidebarInfo";
import Settings, { type PendingUpdates } from "./_components/settings";

type PageProps = {
  mailbox_slug: string;
};

const Page = async (props: { params: Promise<PageProps> }) => {
  const params = await props.params;
  const mailboxPath = `/mailboxes/${params.mailbox_slug}` as const;
  const settingsPath = `${mailboxPath}/settings` as const;

  const [supportAccount, mailboxData, sidebarInfo] = await Promise.all([
    api.gmailSupportEmail.get({ mailboxSlug: params.mailbox_slug }),
    api.mailbox.get({ mailboxSlug: params.mailbox_slug }),
    getSidebarInfo(params.mailbox_slug),
  ]);

  const handleUpdateSettings = async (pendingUpdates: PendingUpdates) => {
    "use server";

    if (pendingUpdates.slack) {
      try {
        await api.mailbox.update({
          mailboxSlug: params.mailbox_slug,
          slackAlertChannel: pendingUpdates.slack.alertChannel ?? undefined,
        });
      } catch (e) {
        throw new Error("Failed to update Slack settings");
      }
    }

    if (pendingUpdates.github) {
      try {
        await api.mailbox.update({
          mailboxSlug: params.mailbox_slug,
          githubRepoOwner: pendingUpdates.github.repoOwner ?? undefined,
          githubRepoName: pendingUpdates.github.repoName ?? undefined,
        });
      } catch (e) {
        throw new Error("Failed to update GitHub settings");
      }
    }

    if (pendingUpdates.widget) {
      await api.mailbox.update({
        mailboxSlug: params.mailbox_slug,
        widgetDisplayMode: pendingUpdates.widget.displayMode ?? undefined,
        widgetDisplayMinValue: pendingUpdates.widget.displayMinValue ?? undefined,
        autoRespondEmailToChat: pendingUpdates.widget.autoRespondEmailToChat ?? undefined,
        widgetHost: pendingUpdates.widget.widgetHost ?? undefined,
      });
    }

    if (pendingUpdates.customer) {
      try {
        await api.mailbox.update({
          mailboxSlug: params.mailbox_slug,
          vipThreshold: pendingUpdates.customer.vipThreshold ? Number(pendingUpdates.customer.vipThreshold) : undefined,
          vipChannelId: pendingUpdates.customer.vipChannelId ?? undefined,
          vipExpectedResponseHours: pendingUpdates.customer.vipExpectedResponseHours ?? undefined,
          disableAutoResponseForVips: pendingUpdates.customer.disableAutoResponseForVips ?? false,
        });
      } catch (e) {
        throw new Error("Failed to update customer settings");
      }
    }

    if (pendingUpdates.autoClose) {
      try {
        await api.mailbox.update({
          mailboxSlug: params.mailbox_slug,
          autoCloseEnabled: pendingUpdates.autoClose.autoCloseEnabled,
          autoCloseDaysOfInactivity: pendingUpdates.autoClose.autoCloseDaysOfInactivity,
        });
      } catch (e) {
        throw new Error("Failed to update auto-close settings");
      }
    }

    revalidatePath(settingsPath);
  };

  return (
    <>
      <title>Settings</title>
      <Settings
        mailbox={mailboxData}
        onUpdateSettings={handleUpdateSettings}
        supportAccount={supportAccount ?? undefined}
        sidebarInfo={sidebarInfo}
      />
    </>
  );
};

export default Page;
