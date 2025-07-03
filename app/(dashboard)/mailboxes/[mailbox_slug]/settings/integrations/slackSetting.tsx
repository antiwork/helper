import Link from "next/link";
import { useEffect, useId, useState } from "react";
import SlackSvg from "@/app/(dashboard)/mailboxes/[mailbox_slug]/icons/slack.svg";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRunOnce } from "@/components/useRunOnce";
import useShowToastForSlackConnectStatus from "@/components/useShowToastForSlackConnectStatus";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

export const SlackChannels = ({
  id,
  selectedChannelId,
  mailbox,
  onChange,
}: {
  id: string;
  selectedChannelId?: string;
  mailbox: RouterOutputs["mailbox"]["get"];
  onChange: (channelId: string | null) => void;
}) => {
  const utils = api.useUtils();
  const [alertChannelName, setAlertChannelName] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  useRunOnce(() => {
    const fetchChannels = async () => {
      try {
        setChannels(
          await utils.client.mailbox.slack.channels.query({
            mailboxSlug: mailbox.slug,
          }),
        );
      } catch (error) {
        captureExceptionAndLog(error);
        toast({
          title: "Error fetching available channels",
          variant: "destructive",
        });
      }
    };

    fetchChannels();
  });

  useEffect(() => {
    const channel = channels.find(({ id }) => id === selectedChannelId);
    if (channel) {
      setAlertChannelName(`#${channel.name}`);
    }
  }, [channels, selectedChannelId]);

  const setAlertChannel = (name: string) => {
    setAlertChannelName(name);

    if (name === "" || name === "#") {
      setIsValid(true);
      onChange(null);
      return;
    }

    const channel = channels.find((channel) => channel.name === name.replace("#", ""));

    if (channel?.id) {
      setIsValid(true);
      onChange(channel.id);
    } else {
      setIsValid(false);
    }
  };

  const datalistId = `slackChannels-${id}`;

  return (
    <>
      <Input
        id={id}
        name="channel"
        list={datalistId}
        disabled={!channels.length}
        placeholder={channels.length ? "" : "Loading channels..."}
        value={alertChannelName}
        onChange={(e) => setAlertChannel(e.target.value)}
        onFocus={() => {
          if (alertChannelName === "") {
            setAlertChannelName("#");
          }
        }}
        onBlur={() => {
          if (alertChannelName === "#") {
            setAlertChannelName("");
          }
          if (!isValid) {
            showErrorToast("Channel not found");
          }
        }}
      />
      <datalist id={datalistId}>
        {channels.map((channel) => (
          <option key={channel.id} value={`#${channel.name}`} />
        ))}
      </datalist>
    </>
  );
};

const SlackSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const { mutateAsync: disconnectSlack } = api.mailbox.slack.disconnect.useMutation();
  const [isSlackConnected, setSlackConnected] = useState(mailbox.slackConnected);
  const channelUID = useId();
  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
    },
    onError: (error) => {
      showErrorToast("Failed to update Slack settings", error);
    },
  });
  useShowToastForSlackConnectStatus();

  const onDisconnectSlack = async () => {
    try {
      await disconnectSlack({ mailboxSlug: mailbox.slug });
      setSlackConnected(false);
      toast({
        title: "Slack app uninstalled from your workspace",
        variant: "success",
      });
    } catch (error) {
      captureExceptionAndLog(error);
      toast({
        title: "Error disconnecting Slack",
        variant: "destructive",
      });
    }
  };

  const connectUrl = mailbox.slackConnectUrl;
  if (!connectUrl) return null;

  return (
    <SectionWrapper title="Slack Integration" description="Notify your team and respond without leaving Slack.">
      {isSlackConnected ? (
        <>
          <div className="grid gap-1">
            <Label htmlFor={channelUID}>Alert channel</Label>
            <SlackChannels
              id={channelUID}
              selectedChannelId={mailbox.slackAlertChannel ?? undefined}
              mailbox={mailbox}
              onChange={(slackAlertChannel) => update({ mailboxSlug: mailbox.slug, slackAlertChannel })}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Daily reports and notifications will be sent to this channel.
            </p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <Label htmlFor="ticket-response-alerts-toggle">Ticket response time alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notifications about tickets waiting over 24 hours without a response.
              </p>
            </div>
            <Switch
              id="ticket-response-alerts-toggle"
              checked={!mailbox.preferences?.disableTicketResponseTimeAlerts}
              onCheckedChange={(checked) =>
                update({
                  mailboxSlug: mailbox.slug,
                  preferences: { disableTicketResponseTimeAlerts: !checked },
                })
              }
            />
          </div>

          <div className="mt-4">
            <ConfirmationDialog
              message="Are you sure you want to disconnect Slack?"
              onConfirm={() => {
                onDisconnectSlack();
              }}
              confirmLabel="Yes, disconnect"
            >
              <Button variant="destructive_outlined">Disconnect from Slack</Button>
            </ConfirmationDialog>
          </div>
        </>
      ) : (
        <Button asChild variant="subtle">
          <Link href={connectUrl}>
            <SlackSvg className="mr-2 h-4 w-4" />
            Add to Slack
          </Link>
        </Button>
      )}
    </SectionWrapper>
  );
};

export default SlackSetting;
