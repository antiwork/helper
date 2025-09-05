import { useSession } from "@/components/useSession";
import AutoAssignSetting from "./autoAssignSetting";
import ConfettiSetting from "./confettiSetting";
import NextTicketPreviewSetting from "./nextTicketPreviewSetting";

const PreferencesSetting = () => {
  const { user } = useSession() ?? {};

  if (!user) return null;

  return (
    <div className="space-y-6">
      <AutoAssignSetting />
      <ConfettiSetting />
      <NextTicketPreviewSetting />
    </div>
  );
};

export default PreferencesSetting;
