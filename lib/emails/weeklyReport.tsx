import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type MemberData = {
  name: string;
  count: number;
  email?: string;
};

type Props = {
  mailboxName: string;
  dateRange: string;
  activeMembers: MemberData[];
  inactiveMembers: MemberData[];
  totalReplies: number;
  dashboardLink: string;
};

const baseUrl = getBaseUrl();

const WeeklyReportEmail = (props: Props) => {
  const { mailboxName, dateRange, activeMembers, inactiveMembers, totalReplies, dashboardLink } = props;

  const activeUserCount = activeMembers.length;
  const peopleText = activeUserCount === 1 ? "person" : "people";

  return (
    <Html>
      <Head />
      <Preview>Weekly report for {mailboxName}</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <Text style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Last week in the {mailboxName} mailbox
        </Text>

        <Text style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>{dateRange}</Text>

        {activeMembers.length > 0 && (
          <>
            <Text style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem" }}>Team members:</Text>

            <div
              style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "6px",
                margin: "12px 0",
              }}
            >
              {activeMembers.map((member) => (
                <Text key={member.email || member.name} style={{ margin: "6px 0", fontSize: "0.95rem" }}>
                  • {member.name}: <strong>{member.count.toLocaleString()}</strong>
                </Text>
              ))}
            </div>
          </>
        )}

        {inactiveMembers.length > 0 && (
          <>
            <Text style={{ fontSize: "1rem", fontWeight: "600", marginTop: "1rem", marginBottom: "0.5rem" }}>
              No tickets answered:
            </Text>
            <Text style={{ fontSize: "0.95rem", color: "#6b7280" }}>
              {inactiveMembers.map((m) => m.name).join(", ")}
            </Text>
          </>
        )}

        <Hr style={{ margin: "1.5rem 0" }} />

        {totalReplies > 0 && (
          <div
            style={{
              background: "#e3f2fd",
              padding: "16px",
              borderRadius: "6px",
              margin: "16px 0",
            }}
          >
            <Text style={{ fontSize: "1rem", fontWeight: "600", margin: "4px 0" }}>Total replies:</Text>
            <Text style={{ fontSize: "1.125rem", fontWeight: "bold", margin: "4px 0" }}>
              {totalReplies.toLocaleString()} from {activeUserCount} {peopleText}
            </Text>
          </div>
        )}

        <Text>
          <Link href={dashboardLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
            View dashboard →
          </Link>
        </Text>

        <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

        <Text style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          You're receiving this weekly report as a team member.{" "}
          <Link href={`${baseUrl}/settings`} style={{ color: "#6b7280", textDecoration: "underline" }}>
            Manage notifications
          </Link>
        </Text>

        <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
          <span style={{ opacity: 0.6 }}>Powered by</span>
          <Link
            href={`${baseUrl}?utm_source=weekly-report&utm_medium=email`}
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

WeeklyReportEmail.PreviewProps = {
  mailboxName: "Support",
  dateRange: "Week of 2024-01-01 to 2024-01-07",
  activeMembers: [
    { name: "Alice Johnson", count: 45, email: "alice@example.com" },
    { name: "Bob Smith", count: 38, email: "bob@example.com" },
    { name: "Carol Davis", count: 29, email: "carol@example.com" },
  ],
  inactiveMembers: [{ name: "Dave Wilson", count: 0, email: "dave@example.com" }],
  totalReplies: 112,
  dashboardLink: "https://helperai.dev/dashboard",
} satisfies Props;

export default WeeklyReportEmail;
