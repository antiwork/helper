import { Container } from "@react-email/components";
import { getBaseUrl, HELPER_SUPPORT_EMAIL_FROM } from "@/components/constants";
import { EmailTemplate, ResendEmail } from "@/lib/emails/components/emailTemplate";
import { Button } from "./components/button";
import { Text } from "./components/text";

type Props = {
  mailboxSlug?: string;
};

const AutomatedRepliesLimitExceededEmail: ResendEmail<Props> = ({ mailboxSlug }) => {
  const previewText = "You have reached the limit for automated replies on your free trial";

  return (
    <EmailTemplate previewText={previewText} subject={previewText}>
      <Container>
        <Text>Hello there!</Text>
        <Text>You have reached the limit for automated replies on your free trial in Helper.</Text>
        <Text>Please upgrade your plan to continue sending automated replies:</Text>
        <Button href={mailboxSlug ? `${getBaseUrl()}/mailboxes/${mailboxSlug}/conversations` : getBaseUrl()}>
          Upgrade Now
        </Button>
        <Text>
          If you have any questions or need assistance, please don't hesitate to reach out to our support team at{" "}
          <a href={`mailto:${HELPER_SUPPORT_EMAIL_FROM}`}>{HELPER_SUPPORT_EMAIL_FROM}</a>.
        </Text>
        <Text>Thank you for using our service!</Text>
        <Text>
          Best regards,
          <br />
          The Helper Team
        </Text>
      </Container>
    </EmailTemplate>
  );
};

AutomatedRepliesLimitExceededEmail.PreviewProps = {
  mailboxSlug: "flexile",
};

export default AutomatedRepliesLimitExceededEmail;
