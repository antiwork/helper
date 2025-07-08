import { Avatar } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { conversationChannelId } from "@/lib/realtime/channels";
import { useRealtimePresence } from "@/lib/realtime/hooks";

type Props = {
  conversationSlug: string;
};

const ViewersTooltipContent = ({ viewers }: { viewers: { id: string; name: string }[] }) => (
  <div className="flex flex-col gap-2 py-2">
    {viewers.map((viewer, index) => (
      <div key={`${viewer.id}-more-${index}`} className="flex items-center gap-2">
        <Avatar size="md" src={undefined} fallback={viewer.name} />
        <p>{viewer.name}</p>
      </div>
    ))}
  </div>
);

const Viewers = ({ conversationSlug }: Props) => {
  const { users: viewers } = useRealtimePresence(conversationChannelId(conversationSlug));

  if (viewers.length === 0) {
    return null;
  }

  if (viewers.length <= 3) {
    return (
      <div className="flex items-center justify-end">
        {viewers.map((viewer) => (
          <TooltipProvider key={viewer.id} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="-mr-2">
                  <Avatar size="sm" src={undefined} fallback={viewer.name} />
                </div>
              </TooltipTrigger>
              <TooltipContent>{viewer.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end">
      {viewers.slice(0, 2).map((viewer) => (
        <TooltipProvider key={viewer.id} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="-mr-2">
                <Avatar size="sm" src={undefined} fallback={viewer.name} />
              </div>
            </TooltipTrigger>
            <TooltipContent>{viewer.name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Avatar size="sm" fallback={`+${viewers.length - 2}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <ViewersTooltipContent viewers={viewers.slice(2)} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default Viewers;
