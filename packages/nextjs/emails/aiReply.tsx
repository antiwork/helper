import { Body, Head, Hr, Html, Img, Link, Markdown, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  content: string;
};

const baseUrl = getBaseUrl();

const AIReplyEmail = ({ content }: Props) => (
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
      <Text style={{ fontSize: "0.875rem", opacity: 0.6 }}>
        This response was created by our AI support agent. Need human support? Let us know in your reply.
      </Text>
      <Hr style={{ margin: "0 0 1.5rem 0", width: "4rem" }} />
      <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
        <span style={{ opacity: 0.6 }}>Powered by</span>
        <Link
          href={`${baseUrl}?utm_source=auto-reply-email&utm_medium=email`}
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

AIReplyEmail.PreviewProps = {
  content:
    "Reasons you might want to use Gumroad are:\n\n- Gumroad makes it easy to sell digital products.\n- Gumroad makes it easy to sell physical products.\n- Gumroad makes it easy to sell services.",
} satisfies Props;

export default AIReplyEmail;
