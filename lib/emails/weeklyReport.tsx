import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  dateRange: string;
  teamMembers: { name: string; count: number }[];
  inactiveMembers: string[];
  totalReplies: number;
  activeUserCount: number;
};

const baseUrl = getBaseUrl();

const WeeklyReportEmail = ({
  mailboxName,
  dateRange,
  teamMembers,
  inactiveMembers,
  totalReplies,
  activeUserCount,
}: Props) => {
  const peopleText = activeUserCount === 1 ? "person" : "people";

  return (
    <Html>
      <Head />
      <Preview>Last week in the {mailboxName} mailbox</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <Text style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Last week in the {mailboxName} mailbox
        </Text>

        <Text style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>{dateRange}</Text>

        {teamMembers.length > 0 && (
          <>
            <Text style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Team members:</Text>
            <div
              style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "6px",
                margin: "16px 0",
                fontSize: "0.875rem",
              }}
            >
              {teamMembers.map((member, index) => (
                <Text key={index} style={{ margin: "4px 0" }}>
                  • {member.name}: {member.count.toLocaleString()}
                </Text>
              ))}
            </div>
          </>
        )}

        {inactiveMembers.length > 0 && (
          <Text style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
            <strong>No tickets answered:</strong> {inactiveMembers.join(", ")}
          </Text>
        )}

        <Hr style={{ margin: "1.5rem 0" }} />

        {totalReplies > 0 && (
          <div
            style={{
              background: "#f8f9fa",
              padding: "16px",
              borderRadius: "6px",
              margin: "16px 0",
              fontSize: "0.875rem",
            }}
          >
            <Text style={{ fontWeight: "600", margin: "4px 0" }}>Total replies:</Text>
            <Text style={{ margin: "4px 0" }}>
              {totalReplies.toLocaleString()} from {activeUserCount} {peopleText}
            </Text>
          </div>
        )}

        <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

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
  mailboxName: "Gumroad",
  dateRange: "Week of 2025-10-27 to 2025-11-02",
  teamMembers: [
    { name: "John Doe", count: 45 },
    { name: "Jane Smith", count: 38 },
    { name: "Bob Johnson", count: 22 },
  ],
  inactiveMembers: ["Alice Williams"],
  totalReplies: 105,
  activeUserCount: 3,
} satisfies Props;

export default WeeklyReportEmail;
