import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  customerName: string;
  customerEmail: string;
  originalMessage: string;
  replyMessage?: string;
  conversationLink: string;
  customerLinks?: { label: string; url: string }[];
  closed?: boolean;
  closedBy?: string;
};

const baseUrl = getBaseUrl();

const VipNotificationEmail = ({
  customerName,
  customerEmail,
  originalMessage,
  replyMessage,
  conversationLink,
  customerLinks,
  closed,
  closedBy,
}: Props) => (
  <Html>
    <Head />
    <Preview>VIP Customer: {customerName}</Preview>
    <Body
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <Text style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>⭐ VIP Customer</Text>

      <Text style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
        New message from VIP customer <strong>{customerName}</strong> ({customerEmail})
      </Text>

      <div
        style={{
          background: "#f8f9fa",
          padding: "16px",
          borderRadius: "6px",
          margin: "16px 0",
          fontSize: "0.875rem",
          borderLeft: closed ? "4px solid #22C55E" : "4px solid #EF4444",
        }}
      >
        <Text style={{ fontWeight: "600", margin: "4px 0" }}>Original message:</Text>
        <Text style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>{originalMessage}</Text>

        {replyMessage && (
          <>
            <Hr style={{ margin: "12px 0" }} />
            <Text style={{ fontWeight: "600", margin: "4px 0" }}>Reply:</Text>
            <Text style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>{replyMessage}</Text>
          </>
        )}
      </div>

      {customerLinks && customerLinks.length > 0 && (
        <Text style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
          {customerLinks.map((link, index) => (
            <span key={index}>
              <Link href={link.url} style={{ color: "#007bff", textDecoration: "none", marginRight: "12px" }}>
                {link.label}
              </Link>
            </span>
          ))}
        </Text>
      )}

      <Text>
        <Link href={conversationLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
          View in Helper →
        </Link>
      </Text>

      {closed && closedBy && (
        <Text style={{ fontSize: "0.875rem", color: "#22C55E", marginTop: "1rem" }}>✓ Closed by {closedBy}</Text>
      )}

      <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

      <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
        <span style={{ opacity: 0.6 }}>Powered by</span>
        <Link
          href={`${baseUrl}?utm_source=vip-notification&utm_medium=email`}
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

VipNotificationEmail.PreviewProps = {
  customerName: "John Smith",
  customerEmail: "john@example.com",
  originalMessage: "I'm having trouble accessing my account. Can you help me reset my password?",
  replyMessage:
    "I've sent you a password reset link to your email. Please check your inbox and follow the instructions.",
  conversationLink: "https://helperai.dev/conversations/abc123",
  customerLinks: [
    { label: "Customer Profile", url: "https://example.com/customers/123" },
    { label: "Order History", url: "https://example.com/orders/123" },
  ],
  closed: false,
} satisfies Props;

export default VipNotificationEmail;
