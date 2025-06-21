import { Body, Head, Hr, Html, Img, Link, Markdown, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  content: string;
  subject?: string;
  isFromAI: boolean;
};

const baseUrl = getBaseUrl();

const ConversationReplyEmail = ({ content, subject, isFromAI }: Props) => (
  <Html>
    <Head />
    <Preview>{content}</Preview>
    <Body
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <div style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        <Markdown>{content}</Markdown>
      </div>

      {isFromAI && (
        <Text style={{ fontSize: "0.875rem", opacity: 0.6 }}>
          This response was created by our AI support agent. Need human support? Let us know in your reply.
        </Text>
      )}

      <Text style={{ fontSize: "0.875rem", opacity: 0.6, marginTop: "1rem" }}>
        Note: Replies to this email are not automatically monitored. For continued support, please visit our support
        portal.
      </Text>

      <Hr style={{ margin: "0 0 1.5rem 0", width: "4rem" }} />
      <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
        <span style={{ opacity: 0.6 }}>Powered by</span>
        <Link
          href={`${baseUrl}?utm_source=conversation-reply-email&utm_medium=email`}
          target="_blank"
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          <Img
            src={`${baseUrl}/logo_mahogany_900_for_email.png`}
            width="64"
            alt="Helper Logo"
            style={{ verticalAlign: "middle", marginLeft: "0.125rem" }}
          />
        </Link>
      </Text>
    </Body>
  </Html>
);

ConversationReplyEmail.PreviewProps = {
  content: "Thank you for contacting us. We've received your message and will get back to you as soon as possible.",
  subject: "Re: Your support request",
  isFromAI: false,
} satisfies Props;

export default ConversationReplyEmail;
