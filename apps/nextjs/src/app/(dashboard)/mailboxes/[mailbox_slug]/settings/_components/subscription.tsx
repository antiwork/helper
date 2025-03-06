import { useSearchParams } from "next/navigation";
import { useState } from "react";
import SectionWrapper from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/sectionWrapper";
import type { Subscription as SubscriptionType } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useRunOnce } from "@/components/useRunOnce";
import {
  getSubscriptionDetails,
  handleSuccessfulSubscription,
  manageSubscriptionInStripe,
  subscribeToHelper,
  unsubscribeFromHelper,
} from "@/serverActions/subscription";

const Subscription = ({
  subscription,
  mailboxSlug,
}: {
  subscription: SubscriptionType | null;
  mailboxSlug: string;
}) => {
  const searchParams = useSearchParams();
  const [isSubscribed, setIsSubscribed] = useState(subscription?.canceledAt === null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    planName: string;
    aiResolutions: number;
    nextBillingDate: string;
  } | null>(null);

  useRunOnce(() => {
    const status = searchParams.get("stripeStatus");
    const stripeSessionId = searchParams.get("stripeSessionId");
    if (status === "success" && stripeSessionId) {
      handleSuccessfulSubscription(stripeSessionId).then((res) => {
        setIsSubscribed(res.success);
        if (res.success) {
          toast({
            title: res.message,
            variant: "success",
          });
          // Fetch subscription details after successful subscription
          fetchSubscriptionDetails();
        } else {
          toast({
            title: res.message,
            variant: "destructive",
          });
        }
      });
    } else if (isSubscribed && subscription?.stripeSubscriptionId) {
      fetchSubscriptionDetails();
    }
  });

  const fetchSubscriptionDetails = async () => {
    try {
      const details = await getSubscriptionDetails({ mailboxSlug });
      setSubscriptionDetails(details);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
    }
  };

  const handleSubscriptionAction = async () => {
    if (isSubscribed && subscription?.stripeSubscriptionId) {
      if (!confirm("Are you sure you want to unsubscribe?")) return;
      const result = await unsubscribeFromHelper({ mailboxSlug });
      if (result.success) {
        setIsSubscribed(false);
        setSubscriptionDetails(null);
        toast({
          title: result.message,
          variant: "success",
        });
      } else {
        toast({
          title: result.message,
          variant: "destructive",
        });
      }
    } else {
      await subscribeToHelper({ mailboxSlug });
    }
  };

  return (
    <SectionWrapper title="Subscription" description="Manage your Helper subscription">
      <div className="flex flex-col gap-4">
        {isSubscribed && subscription?.stripeSubscriptionId && subscriptionDetails && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Plan:</span>
              <span>{subscriptionDetails.planName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">AI Resolutions:</span>
              <span>{subscriptionDetails.aiResolutions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Next billing date:</span>
              <span>{subscriptionDetails.nextBillingDate}</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {isSubscribed && subscription?.stripeSubscriptionId && (
            <Button variant="outlined" onClick={() => manageSubscriptionInStripe({ mailboxSlug })}>
              Manage subscription
            </Button>
          )}
          <Button variant={isSubscribed ? "destructive_outlined" : "subtle"} onClick={handleSubscriptionAction}>
            {isSubscribed ? "Cancel subscription" : "Subscribe"}
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default Subscription;
