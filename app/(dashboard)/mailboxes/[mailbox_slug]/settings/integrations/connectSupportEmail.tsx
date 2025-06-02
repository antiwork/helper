import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { HELPER_SUPPORT_EMAIL_FROM } from "@/components/constants";
import LoadingSpinner from "@/components/loadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const ConnectSupportEmail = () => {
  const params = useParams();
  const router = useRouter();
  const [error] = useQueryState("error");
  const { mutateAsync: deleteSupportEmailMutation } = api.gmailSupportEmail.delete.useMutation();
  const { data: { supportAccount, enabled } = {}, isLoading } = api.gmailSupportEmail.get.useQuery({
    mailboxSlug: params.mailbox_slug as string,
  });

  const handleConnectOrDisconnect = async () => {
    if (supportAccount) {
      if (
        confirm(
          "Are you sure you want to disconnect Gmail? You will still have access to all of your emails in Helper, but you will not be able to send/receive new emails until you connect a new Gmail account.",
        )
      ) {
        await deleteSupportEmailMutation({ mailboxSlug: params.mailbox_slug as string });
        router.refresh();
      }
    } else {
      location.href = `/api/connect/google?mailbox=${params.mailbox_slug}`;
    }
  };

  return (
    <SectionWrapper
      title="Support Email"
      description="Connect your support email to receive and send emails from your support email address."
    >
      {error && (
        <div className="mb-4 rounded-lg bg-destructive-100 px-4 py-3 text-destructive-900" role="alert">
          <h3>Failed to connect your gmail account, please try again.</h3>
          <p className="mt-1 text-sm">
            If the issue still persists please contact{" "}
            <a className="underline" href={`mailto:${HELPER_SUPPORT_EMAIL_FROM}`}>
              {HELPER_SUPPORT_EMAIL_FROM}
            </a>
          </p>
        </div>
      )}
      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : !enabled ? (
        <Alert className="text-sm">
          Create a Google OAuth app to enable linking your Gmail account.{" "}
          <Link className="underline" href="https://helper.ai/docs/development#optional-integrations" target="_blank">
            Learn how!
          </Link>
        </Alert>
      ) : (
        <Button variant={supportAccount ? "destructive_outlined" : "subtle"} onClick={handleConnectOrDisconnect}>
          {supportAccount ? `Disconnect ${supportAccount.email}` : "Connect your Gmail"}
        </Button>
      )}
    </SectionWrapper>
  );
};

export default ConnectSupportEmail;
