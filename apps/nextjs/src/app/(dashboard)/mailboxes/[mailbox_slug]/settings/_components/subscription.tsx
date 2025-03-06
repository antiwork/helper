import { useParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import SectionWrapper from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/sectionWrapper";
import { toast } from "@/components/hooks/use-toast";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { useRunOnce } from "@/components/useRunOnce";
import { api } from "@/trpc/react";

const Subscription = () => {
  const { mailbox_slug: mailboxSlug } = useParams<{ mailbox_slug: string }>();
  const [searchParams, setSearchParams] = useQueryStates({
    stripeStatus: parseAsString,
    stripeSessionId: parseAsString,
  });

  const { data: subscription, isLoading, refetch } = api.subscription.get.useQuery({ mailboxSlug });
  const { mutate: handleSuccessfulSubscription } = api.subscription.subscribe.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        setSearchParams({ stripeStatus: null, stripeSessionId: null });
        refetch();
        toast({
          title: res.message,
          variant: "success",
        });
      } else {
        toast({
          title: res.message,
          variant: "destructive",
        });
      }
    },
  });

  const { mutate: subscribe } = api.subscription.startCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const { mutate: unsubscribe } = api.subscription.unsubscribe.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        refetch();
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
    },
  });

  const { mutate: manageSubscription } = api.subscription.manage.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  useRunOnce(() => {
    if (searchParams.stripeStatus === "success" && searchParams.stripeSessionId) {
      handleSuccessfulSubscription({ mailboxSlug, sessionId: searchParams.stripeSessionId });
    }
  });

  return (
    <SectionWrapper title="Subscription" description="Manage your Helper subscription">
      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : subscription ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Plan:</span>
              <span>{subscription.planName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">AI Resolutions:</span>
              <span>{subscription.aiResolutions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Next billing date:</span>
              <span>{subscription.nextBillingDate.toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {subscription && (
              <Button variant="outlined" onClick={() => manageSubscription({ mailboxSlug })}>
                Manage subscription
              </Button>
            )}
            <Button
              variant="destructive_outlined"
              onClick={() => {
                if (confirm("Are you sure you want to cancel your subscription?")) {
                  unsubscribe({ mailboxSlug });
                }
              }}
            >
              Cancel subscription
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="subtle" onClick={() => subscribe({ mailboxSlug })}>
          Subscribe
        </Button>
      )}
    </SectionWrapper>
  );
};

export default Subscription;
