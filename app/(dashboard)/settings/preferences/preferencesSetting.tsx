import AutoAssignSetting from "./autoAssignSetting";
import ConfettiSetting from "./confettiSetting";
import NextTicketPreviewSetting from "./nextTicketPreviewSetting";

const PreferencesSetting = () => {
  return (
    <div className="space-y-6">
      <AutoAssignSetting />
      <ConfettiSetting />
      <NextTicketPreviewSetting />
    </div>
  );
};

export default PreferencesSetting;
