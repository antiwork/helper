import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type TicketData = {
  subject: string;
  slug: string;
  assignee?: string;
  timeSinceLastReply: string;
  customerName?: string;
  customerValue?: string;
};

type Props = {
  alertType: "vip" | "assigned";
  overdueCount: number;
  expectedHours?: number;
  tickets: TicketData[];
  dashboardLink: string;
};

const baseUrl = getBaseUrl();

const TicketAlertEmail = (props: Props) => {
  const { alertType, overdueCount, expectedHours, tickets, dashboardLink } = props;

  const title =
    alertType === "vip"
      ? `${overdueCount} VIP ${overdueCount === 1 ? "customer" : "customers"} waiting ${expectedHours ? `over ${expectedHours} ${expectedHours === 1 ? "hour" : "hours"}` : ""}`
      : `${overdueCount} assigned ${overdueCount === 1 ? "ticket" : "tickets"} waiting over 24 hours`;

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
            background: alertType === "vip" ? "#fef3c7" : "#fef2f2",
            borderLeft: `4px solid ${alertType === "vip" ? "#f59e0b" : "#ef4444"}`,
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "1.5rem",
          }}
        >
          <Text style={{ margin: "0", fontSize: "1.125rem", fontWeight: "700", color: "#7c2d12" }}>
            🚨 {alertType === "vip" ? "VIP Response Time Alert" : "Ticket Response Time Alert"}
          </Text>
        </div>

        <Text style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>{title}</Text>

        <div
          style={{
            background: "#f8f9fa",
            padding: "16px",
            borderRadius: "6px",
            margin: "16px 0",
          }}
        >
          {tickets.slice(0, 10).map((ticket, index) => (
            <div key={index} style={{ marginBottom: "12px" }}>
              <Link
                href={`${baseUrl}/conversations?id=${ticket.slug}`}
                style={{
                  color: "#007bff",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "0.95rem",
                }}
              >
                • {ticket.subject || "No subject"}
              </Link>
              <Text style={{ margin: "4px 0 0 16px", fontSize: "0.875rem", color: "#6b7280" }}>
                {alertType === "vip" ? (
                  <>
                    {ticket.customerName && `${ticket.customerName} `}
                    {ticket.customerValue && `(${ticket.customerValue}) `}
                    {ticket.timeSinceLastReply} since last reply
                  </>
                ) : (
                  <>
                    Assigned to {ticket.assignee || "Unknown"} • {ticket.timeSinceLastReply} since last reply
                  </>
                )}
              </Text>
            </div>
          ))}

          {tickets.length > 10 && (
            <Text style={{ marginTop: "12px", fontSize: "0.875rem", color: "#6b7280", fontStyle: "italic" }}>
              (and {tickets.length - 10} more)
            </Text>
          )}
        </div>

        <Text>
          <Link href={dashboardLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
            View all tickets →
          </Link>
        </Text>

        <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

        <Text style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          You're receiving this alert as a team member.{" "}
          <Link href={`${baseUrl}/settings`} style={{ color: "#6b7280", textDecoration: "underline" }}>
            Manage notifications
          </Link>
        </Text>

        <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
          <span style={{ opacity: 0.6 }}>Powered by</span>
          <Link
            href={`${baseUrl}?utm_source=ticket-alert&utm_medium=email`}
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

TicketAlertEmail.PreviewProps = {
  alertType: "assigned",
  overdueCount: 5,
  tickets: [
    {
      subject: "Cannot access my account",
      slug: "abc123",
      assignee: "John Doe",
      timeSinceLastReply: "2 days 5 hours",
    },
    {
      subject: "Payment processing error",
      slug: "def456",
      assignee: "Jane Smith",
      timeSinceLastReply: "1 day 12 hours",
    },
  ],
  dashboardLink: "https://helperai.dev/dashboard",
} satisfies Props;

export default TicketAlertEmail;
