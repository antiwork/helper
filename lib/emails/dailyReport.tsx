import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  openTicketCount: number;
  answeredTicketCount: number;
  openTicketsOverZero?: number;
  answeredTicketsOverZero?: number;
  avgReplyTime?: string;
  vipAvgReplyTime?: string;
  avgWaitTime?: string;
  dashboardLink: string;
};

const baseUrl = getBaseUrl();

const DailyReportEmail = (props: Props) => {
  const {
    mailboxName,
    openTicketCount,
    answeredTicketCount,
    openTicketsOverZero,
    answeredTicketsOverZero,
    avgReplyTime,
    vipAvgReplyTime,
    avgWaitTime,
    dashboardLink,
  } = props;

  return (
    <Html>
      <Head />
      <Preview>Daily summary for {mailboxName}</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <Text style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Daily summary for {mailboxName}
        </Text>

        <div
          style={{
            background: "#f8f9fa",
            padding: "16px",
            borderRadius: "6px",
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
            • Open tickets: <strong>{openTicketCount.toLocaleString()}</strong>
          </Text>
          <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
            • Tickets answered: <strong>{answeredTicketCount.toLocaleString()}</strong>
          </Text>
          {openTicketsOverZero !== undefined && (
            <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
              • Open tickets over $0: <strong>{openTicketsOverZero.toLocaleString()}</strong>
            </Text>
          )}
          {answeredTicketsOverZero !== undefined && (
            <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
              • Tickets answered over $0: <strong>{answeredTicketsOverZero.toLocaleString()}</strong>
            </Text>
          )}
          {avgReplyTime && (
            <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
              • Average reply time: <strong>{avgReplyTime}</strong>
            </Text>
          )}
          {vipAvgReplyTime && (
            <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
              • VIP average reply time: <strong>{vipAvgReplyTime}</strong>
            </Text>
          )}
          {avgWaitTime && (
            <Text style={{ margin: "8px 0", fontSize: "0.95rem" }}>
              • Average time existing open tickets have been open: <strong>{avgWaitTime}</strong>
            </Text>
          )}
        </div>

        <Text>
          <Link href={dashboardLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
            View dashboard →
          </Link>
        </Text>

        <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

        <Text style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          You're receiving this daily report as a team member.{" "}
          <Link href={`${baseUrl}/settings`} style={{ color: "#6b7280", textDecoration: "underline" }}>
            Manage notifications
          </Link>
        </Text>

        <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
          <span style={{ opacity: 0.6 }}>Powered by</span>
          <Link
            href={`${baseUrl}?utm_source=daily-report&utm_medium=email`}
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

DailyReportEmail.PreviewProps = {
  mailboxName: "Support",
  openTicketCount: 42,
  answeredTicketCount: 18,
  openTicketsOverZero: 15,
  answeredTicketsOverZero: 12,
  avgReplyTime: "2h 15m",
  vipAvgReplyTime: "45m",
  avgWaitTime: "4h 30m",
  dashboardLink: "https://helperai.dev/dashboard",
} satisfies Props;

export default DailyReportEmail;
