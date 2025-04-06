import * as Sentry from "@sentry/nextjs";
import { useEffect, useId, useState } from "react";
import SlackSvg from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/icons/slack.svg";
import SectionWrapper from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/sectionWrapper";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunOnce } from "@/components/useRunOnce";
import useShowToastForSlackConnectStatus from "@/components/useShowToastForSlackConnectStatus";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

export type SlackUpdates = {
  alertChannel?: string | null;
};

export const SlackChannels = ({
  id,
  selectedChannelId,
  mailbox,
  onChange,
}: {
  id: string;
  selectedChannelId?: string;
  mailbox: RouterOutputs["mailbox"]["get"];
  onChange: (changes: SlackUpdates) => void;
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
      } catch (e) {
        Sentry.captureException(e);
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
      onChange({ alertChannel: null });
      return;
    }

    const channel = channels.find((channel) => channel.name === name.replace("#", ""));

    if (channel?.id) {
      setIsValid(true);
      onChange({ alertChannel: channel.id });
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
            toast({
              title: "Channel not found",
              variant: "destructive",
            });
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

const SlackSetting = ({
  mailbox,
  onChange,
}: {
  mailbox: RouterOutputs["mailbox"]["get"];
  onChange: (changes?: SlackUpdates) => void;
}) => {
  const { mutateAsync: disconnectSlack } = api.mailbox.slack.disconnect.useMutation();
  const [isSlackConnected, setSlackConnected] = useState(mailbox.slackConnected);
  const channelUID = useId();

  useShowToastForSlackConnectStatus();

  const onDisconnectSlack = async () => {
    try {
      const response = await disconnectSlack({ mailboxSlug: mailbox.slug });
      setSlackConnected(false);
      toast({
        title: "Slack app uninstalled from your workspace",
        variant: "success",
      });
    } catch (e) {
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
              onChange={onChange}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Daily reports and notifications will be sent to this channel.
            </p>
          </div>
          <div className="mt-4">
            <Button
              variant="destructive_outlined"
              onClick={() => {
                if (confirm("Are you sure you want to disconnect Slack?")) {
                  onDisconnectSlack();
                }
              }}
            >
              Disconnect from Slack
            </Button>
          </div>
        </>
      ) : (
        <Button onClick={() => (window.location.href = connectUrl)} variant="subtle">
          <SlackSvg className="mr-2 h-4 w-4" />
          Add to Slack
        </Button>
      )}
    </SectionWrapper>
  );
};

export default SlackSetting;
