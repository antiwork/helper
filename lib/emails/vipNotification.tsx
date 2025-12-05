import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  customerEmail: string;
  customerValue: string;
  conversationSubject: string;
  messagePreview: string;
  conversationLink: string;
  replyText?: string;
  repliedBy?: string;
  conversationStatus: "open" | "closed";
};

const baseUrl = getBaseUrl();

const VipNotificationEmail = (props: Props) => {
  const {
    customerEmail,
    customerValue,
    conversationSubject,
    messagePreview,
    conversationLink,
    replyText,
    repliedBy,
    conversationStatus,
  } = props;

  const isUpdate = !!replyText;
  const title = isUpdate ? "VIP Customer Reply Received" : "VIP Customer Message";

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <div
          style={{
            background: "#fef3c7",
            borderLeft: "4px solid #f59e0b",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          <Text style={{ margin: "0", fontSize: "0.875rem", fontWeight: "600", color: "#92400e" }}>⭐ VIP Customer</Text>
        </div>

        <Text style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>{title}</Text>

        <div
          style={{
            background: "#f8f9fa",
            padding: "16px",
            borderRadius: "6px",
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
            <strong>Customer:</strong> {customerEmail}
          </Text>
          <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
            <strong>Value:</strong> {customerValue}
          </Text>
          <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
            <strong>Subject:</strong> {conversationSubject}
          </Text>
          <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color: conversationStatus === "closed" ? "#16a34a" : "#dc2626",
                fontWeight: "600",
              }}
            >
              {conversationStatus}
            </span>
          </Text>
        </div>

        {!isUpdate && (
          <>
            <Text style={{ fontSize: "1rem", fontWeight: "600", marginTop: "1rem", marginBottom: "0.5rem" }}>
              Message:
            </Text>
            <div
              style={{
                background: "#f5f5f5",
                padding: "12px",
                borderLeft: "3px solid #007bff",
                margin: "12px 0",
                fontSize: "0.875rem",
                borderRadius: "4px",
              }}
            >
              {messagePreview.substring(0, 300)}
              {messagePreview.length > 300 ? "..." : ""}
            </div>
          </>
        )}

        {isUpdate && replyText && (
          <>
            <Text style={{ fontSize: "1rem", fontWeight: "600", marginTop: "1rem", marginBottom: "0.5rem" }}>
              {repliedBy ? `${repliedBy} replied:` : "Reply received:"}
            </Text>
            <div
              style={{
                background: "#f0fdf4",
                padding: "12px",
                borderLeft: "3px solid #22c55e",
                margin: "12px 0",
                fontSize: "0.875rem",
                borderRadius: "4px",
              }}
            >
              {replyText.substring(0, 300)}
              {replyText.length > 300 ? "..." : ""}
            </div>
          </>
        )}

        <Text>
          <Link href={conversationLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
            View conversation →
          </Link>
        </Text>

        <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

        <Text style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          You're receiving this VIP customer alert as a team member.{" "}
          <Link href={`${baseUrl}/settings`} style={{ color: "#6b7280", textDecoration: "underline" }}>
            Manage notifications
          </Link>
        </Text>

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
};

VipNotificationEmail.PreviewProps = {
  customerEmail: "vip@enterprise.com",
  customerValue: "$50,000",
  conversationSubject: "Enterprise plan billing issue",
  messagePreview: "We're experiencing issues with our enterprise plan billing. The charges appear to be duplicated...",
  conversationLink: "https://helperai.dev/conversations?id=abc123",
  conversationStatus: "open",
} satisfies Props;

export default VipNotificationEmail;
