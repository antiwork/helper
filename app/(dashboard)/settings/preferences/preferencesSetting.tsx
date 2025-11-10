import { useSession } from "@/components/useSession";
import AutoAssignSetting from "./autoAssignSetting";
import ConfettiSetting from "./confettiSetting";
import DailyEmailSetting from "./dailyEmailSetting";
import NextTicketPreviewSetting from "./nextTicketPreviewSetting";
import VipMessageEmailSetting from "./vipMessageEmailSetting";
import WeeklyEmailSetting from "./weeklyEmailSetting";

const PreferencesSetting = () => {
  const { user } = useSession() ?? {};

  if (!user) return null;

  return (
    <div className="space-y-6">
      <AutoAssignSetting />
      <ConfettiSetting />
      <NextTicketPreviewSetting />
      <DailyEmailSetting />
      <WeeklyEmailSetting />
      <VipMessageEmailSetting />
    </div>
  );
};

export default PreferencesSetting;
