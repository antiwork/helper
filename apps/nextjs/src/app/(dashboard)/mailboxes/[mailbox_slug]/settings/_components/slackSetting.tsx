import * as Sentry from "@sentry/nextjs";
import { useEffect, useId, useMemo, useState } from "react";
import SlackSvg from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/icons/slack.svg";
import SectionWrapper from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/sectionWrapper";
import { toast } from "@/components/hooks/use-toast";
import TipTapEditor from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunOnce } from "@/components/useRunOnce";
import useShowToastForSlackConnectStatus from "@/components/useShowToastForSlackConnectStatus";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

export type SlackUpdates = {
  escalationChannel?: string | null;
  emailBody?: string | null;
  escalationExpectedResolutionHours?: number | null;
  ticketResponseAlertsEnabled?: boolean;
  ticketResponseAlertsFrequency?: "hourly" | "daily" | "weekly";
  ticketResponseAlertsChannel?: string | null;
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
  const [escalationChannelName, setEscalationChannelName] = useState("");
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
      setEscalationChannelName(`#${channel.name}`);
    }
  }, [channels, selectedChannelId]);

  const setEscalationChannel = (name: string) => {
    setEscalationChannelName(name);

    if (name === "" || name === "#") {
      setIsValid(true);
      onChange({ escalationChannel: null });
      return;
    }

    const channel = channels.find((channel) => channel.name === name.replace("#", ""));

    if (channel?.id) {
      setIsValid(true);
      onChange({ escalationChannel: channel.id });
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
        value={escalationChannelName}
        onChange={(e) => setEscalationChannel(e.target.value)}
        onFocus={() => {
          if (escalationChannelName === "") {
            setEscalationChannelName("#");
          }
        }}
        onBlur={() => {
          if (escalationChannelName === "#") {
            setEscalationChannelName("");
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
  const [resolutionHours, setResolutionHours] = useState(mailbox.escalationExpectedResolutionHours?.toString() ?? "");
  const [ticketAlertsEnabled, setTicketAlertsEnabled] = useState(mailbox.ticketResponseAlertsEnabled ?? false);
  const [ticketAlertsFrequency, setTicketAlertsFrequency] = useState(mailbox.ticketResponseAlertsFrequency ?? "hourly");
  const emailBodyMemoized = useMemo(
    () => ({ content: mailbox.escalationEmailBody ?? "" }),
    [mailbox.escalationEmailBody],
  );
  const channelUID = useId();
  const ticketAlertsChannelUID = useId();

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

  return (
    <SectionWrapper
      title="Slack Integration"
      description="Escalate messages to your team and respond without leaving Slack."
    >
      {isSlackConnected ? (
        <>
          <div className="grid gap-1">
            <Label htmlFor={channelUID}>Escalation channel</Label>
            <SlackChannels
              id={channelUID}
              selectedChannelId={mailbox.slackEscalationChannel ?? undefined}
              mailbox={mailbox}
              onChange={onChange}
            />
          </div>
          <div className="grid gap-1 mt-4">
            <Label htmlFor="expectedResolutionHours">Expected resolution time (hours)</Label>
            <Input
              id="expectedResolutionHours"
              type="number"
              min="0"
              step="0.5"
              value={resolutionHours}
              onChange={(e) => {
                const newValue = e.target.value;
                setResolutionHours(newValue);
                onChange({
                  escalationExpectedResolutionHours: newValue ? parseFloat(newValue) : null,
                });
              }}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              A dashboard alert will be shown when escalations are not resolved within this timeframe
            </p>
          </div>
          <div className="relative grid mt-4">
            <Label>Automatic reply when escalated</Label>
            <div className="min-h-[10rem]">
              <TipTapEditor
                defaultContent={emailBodyMemoized}
                onUpdate={(emailBody, isEmpty) => onChange({ emailBody: isEmpty ? null : emailBody })}
                placeholder={mailbox.escalationEmailBodyPlaceholder}
              />
            </div>
          </div>
          {/* Add new section for ticket response alerts configuration */}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-medium">Ticket response alerts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure alerts for assigned tickets that haven't received a response within 24 hours.
            </p>

            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="ticketAlertsEnabled"
                checked={ticketAlertsEnabled}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setTicketAlertsEnabled(newValue);
                  onChange({
                    ticketResponseAlertsEnabled: newValue,
                  });
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="ticketAlertsEnabled">Enable ticket response alerts</Label>
            </div>

            <div className="grid gap-1 mb-4">
              <Label htmlFor="ticketAlertsFrequency">Alert frequency</Label>
              <select
                id="ticketAlertsFrequency"
                value={ticketAlertsFrequency}
                onChange={(e) => {
                  const newValue = e.target.value as "hourly" | "daily" | "weekly";
                  setTicketAlertsFrequency(newValue);
                  onChange({
                    ticketResponseAlertsFrequency: newValue,
                  });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!ticketAlertsEnabled}
              >
                <option value="hourly">Every hour</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
              </select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor={ticketAlertsChannelUID}>Alert channel</Label>
              <SlackChannels
                id={ticketAlertsChannelUID}
                selectedChannelId={mailbox.ticketResponseAlertsChannel ?? undefined}
                mailbox={mailbox}
                onChange={(changes) => {
                  onChange({
                    ticketResponseAlertsChannel: changes.escalationChannel,
                  });
                }}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                If not specified, alerts will be sent to the escalation channel
              </p>
            </div>
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
        <Button onClick={() => (window.location.href = mailbox.slackConnectUrl)} variant="subtle">
          <SlackSvg className="mr-2 h-4 w-4" />
          Add to Slack
        </Button>
      )}
    </SectionWrapper>
  );
};

export default SlackSetting;
