import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@/components/hooks/use-toast";

const useShowToastForSlackConnectStatus = () => {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(location.href);
    const slackConnectResult = url.searchParams.get("slackConnectResult");

    if (!slackConnectResult) return;

    if (slackConnectResult === "success") {
      toast({
        title: "Slack successfully connected. Your teammates can now sign in.",
        variant: "success",
      });
    } else if (slackConnectResult === "error") {
      toast({
        title: "Failed to connect Slack, please try again",
        variant: "destructive",
      });
    }

    url.searchParams.delete("slackConnectResult");
    router.replace(url.toString());
  }, [router]);
};

export default useShowToastForSlackConnectStatus;
