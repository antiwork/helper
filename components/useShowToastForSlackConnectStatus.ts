import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const useShowToastForSlackConnectStatus = () => {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(location.href);
    const slackConnectResult = url.searchParams.get("slackConnectResult");

    if (!slackConnectResult) return;

    if (slackConnectResult === "success") {
      toast.success("Slack successfully connected. Your teammates can now sign in.");
    } else if (slackConnectResult === "error") {
      toast.error("Failed to connect Slack, please try again");
    }

    url.searchParams.delete("slackConnectResult");
    router.replace(url.toString());
  }, [router]);
};

export default useShowToastForSlackConnectStatus;
