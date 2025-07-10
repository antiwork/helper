import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { ConfirmationDialog } from "@/components/confirmationDialog";
import LoadingSpinner from "@/components/loadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const ConnectSupportEmail = () => {
  const router = useRouter();
  const [error] = useQueryState("error");
  const { mutateAsync: deleteSupportEmailMutation } = api.gmailSupportEmail.delete.useMutation();
  const { data: { supportAccount, enabled } = {}, isLoading } = api.gmailSupportEmail.get.useQuery();

  return (
    <SectionWrapper
      title="Support Email"
      description="Connect your support email to receive and send emails from your support email address."
    >
      {error && <Alert variant="destructive">Failed to connect your gmail account, please try again.</Alert>}
      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : !enabled ? (
        <Alert className="text-sm">
          Create a Google OAuth app to enable linking your Gmail account.{" "}
          <Link className="underline" href="https://helper.ai/docs/development#optional-integrations" target="_blank">
            Learn how!
          </Link>
        </Alert>
      ) : supportAccount ? (
        <ConfirmationDialog
          message="Are you sure you want to disconnect Gmail? You will still have access to all of your emails in Helper, but you will not be able to send/receive new emails until you connect a new Gmail account."
          onConfirm={async () => {
            await deleteSupportEmailMutation();
            router.refresh();
          }}
          confirmLabel="Yes, disconnect"
        >
          <Button variant="destructive_outlined">{`Disconnect ${supportAccount.email}`}</Button>
        </ConfirmationDialog>
      ) : (
        <Button variant="subtle" onClick={() => (location.href = `/api/connect/google`)}>
          Connect your Gmail
        </Button>
      )}
    </SectionWrapper>
  );
};

export default ConnectSupportEmail;
