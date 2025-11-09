import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type OverdueTicket = {
  subject: string;
  slug: string;
  assignee?: string;
  timeSinceLastReply: string;
};

type Props = {
  alertType: "assigned" | "vip";
  mailboxName: string;
  overdueCount: number;
  tickets: OverdueTicket[];
  threshold?: string; // e.g., "24 hours" or "2 hours"
};

// App color scheme (matching globals.css)
const colors = {
  primary: "hsl(0, 67%, 17%)", // Mahogany red
  primaryForeground: "hsl(0, 0%, 100%)",
  foreground: "hsl(0, 58%, 10%)",
  muted: "hsl(210, 20%, 98%)",
  mutedForeground: "hsl(224, 8%, 46%)",
  border: "hsl(218, 10%, 84%)",
  background: "hsl(0, 0%, 100%)",
  card: "hsl(0, 0%, 100%)",
  destructive: "hsl(17, 88%, 40%)",
  success: "hsl(142, 72%, 29%)",
  accent: "hsl(220, 14%, 96%)",
};

const ResponseTimeAlertEmail = (props: Props) => {
  const { alertType, mailboxName, overdueCount, tickets, threshold } = props;

  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const isVip = alertType === "vip";
  const title = isVip
    ? `${overdueCount} ${overdueCount === 1 ? "VIP has" : "VIPs have"} been waiting over ${threshold || "the threshold"}`
    : `${overdueCount} assigned tickets have been waiting over ${threshold || "24 hours"} without a response`;

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      </Head>
      <Preview>{title}</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          backgroundColor: "#f5f5f5",
          margin: 0,
          padding: 0,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: colors.background,
            padding: "0",
          }}
        >
          {/* Header Section */}
          <Section
            style={{
              backgroundColor: colors.destructive,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <Section
              style={{
                display: "inline-block",
                padding: "8px 20px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
                fontWeight: "600",
                color: colors.primaryForeground,
              }}
            >
              🚨 Response Time Alert
            </Section>
            <Heading
              style={{
                fontSize: "28px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: colors.primaryForeground,
                lineHeight: "1.2",
                letterSpacing: "-0.5px",
              }}
            >
              {isVip ? "VIP Alert" : "Overdue Tickets"}
            </Heading>
            <Text
              style={{
                fontSize: "16px",
                color: "rgba(255, 255, 255, 0.9)",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              {mailboxName}
            </Text>
          </Section>

          {/* Main Content */}
          <Section
            style={{
              backgroundColor: colors.background,
              padding: "40px 24px",
            }}
          >
            {/* Alert Summary */}
            <Section
              style={{
                backgroundColor: colors.muted,
                padding: "24px",
                borderRadius: "12px",
                marginBottom: "32px",
                border: `1px solid ${colors.border}`,
                textAlign: "center",
              }}
            >
              <Text
                style={{
                  fontSize: "15px",
                  margin: "0 0 8px 0",
                  color: colors.mutedForeground,
                  lineHeight: "1.5",
                }}
              >
                {isVip ? "VIP tickets waiting" : "Tickets waiting"}
              </Text>
              <Text
                style={{
                  fontSize: "36px",
                  fontWeight: "700",
                  margin: "0 0 4px 0",
                  color: colors.destructive,
                  lineHeight: "1.2",
                }}
              >
                {overdueCount}
              </Text>
              <Text
                style={{
                  fontSize: "14px",
                  margin: "0",
                  color: colors.mutedForeground,
                  lineHeight: "1.5",
                }}
              >
                over {threshold || (isVip ? "the threshold" : "24 hours")}
              </Text>
            </Section>

            <Text
              style={{
                fontSize: "16px",
                marginBottom: "24px",
                color: colors.foreground,
                lineHeight: "1.6",
              }}
            >
              {isVip
                ? `The following VIP tickets need immediate attention:`
                : `The following assigned tickets need immediate attention:`}
            </Text>

            {/* Tickets List */}
            <Section
              style={{
                backgroundColor: "#fff8f1",
                borderLeft: "4px solid #f97316",
                padding: "24px",
                borderRadius: "8px",
                marginBottom: "24px",
              }}
            >
              {tickets.slice(0, 10).map((ticket, index) => (
                <Section
                  key={index}
                  style={{
                    marginBottom: index < Math.min(tickets.length, 10) - 1 ? "16px" : "0",
                    paddingBottom: index < Math.min(tickets.length, 10) - 1 ? "16px" : "0",
                    borderBottom:
                      index < Math.min(tickets.length, 10) - 1 ? `1px solid rgba(154, 52, 18, 0.2)` : "none",
                  }}
                >
                  <Text
                    style={{
                      fontSize: "15px",
                      margin: "0 0 4px 0",
                      color: "#9a3412",
                      fontWeight: "600",
                      lineHeight: "1.5",
                    }}
                  >
                    {ticket.subject || "No subject"}
                  </Text>
                  <Text
                    style={{
                      fontSize: "13px",
                      margin: "0",
                      color: "#9a3412",
                      lineHeight: "1.5",
                      opacity: 0.8,
                    }}
                  >
                    {ticket.assignee && `Assigned to ${ticket.assignee} • `}
                    {ticket.timeSinceLastReply} since last reply
                  </Text>
                </Section>
              ))}
              {tickets.length > 10 && (
                <Text
                  style={{
                    fontSize: "14px",
                    marginTop: "16px",
                    color: "#9a3412",
                    fontStyle: "italic",
                    textAlign: "center",
                    lineHeight: "1.5",
                  }}
                >
                  (and {tickets.length - 10} more ticket{tickets.length - 10 === 1 ? "" : "s"})
                </Text>
              )}
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Link
                href={dashboardUrl}
                style={{
                  display: "inline-block",
                  padding: "16px 32px",
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground,
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "16px",
                  lineHeight: "1.5",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                View Dashboard →
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: colors.accent,
              padding: "24px",
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <Text
              style={{
                fontSize: "12px",
                color: colors.mutedForeground,
                margin: "0 0 16px 0",
                lineHeight: "1.5",
                textAlign: "center",
              }}
            >
              You're receiving this response time alert email.{" "}
              <Link
                href={dashboardUrl}
                style={{
                  color: colors.primary,
                  textDecoration: "underline",
                  fontWeight: "500",
                }}
              >
                Manage preferences
              </Link>
            </Text>

            <Section style={{ textAlign: "center", marginTop: "20px" }}>
              <Text
                style={{
                  fontSize: "12px",
                  lineHeight: "1.5",
                  margin: "0 0 8px 0",
                  color: colors.mutedForeground,
                }}
              >
                <span style={{ opacity: 0.6 }}>Powered by</span>
              </Text>
              <Link
                href={`${baseUrl}?utm_source=response-time-alert&utm_medium=email`}
                target="_blank"
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                }}
              >
                <Img
                  src={`${baseUrl}/logo_mahogany_900_for_email.png`}
                  width="64"
                  height="auto"
                  alt="Helper Logo"
                  style={{
                    verticalAlign: "middle",
                    maxWidth: "100%",
                  }}
                />
              </Link>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

ResponseTimeAlertEmail.PreviewProps = {
  alertType: "assigned",
  mailboxName: "Support Team",
  overdueCount: 5,
  threshold: "24 hours",
  tickets: [
    { subject: "Login issue", slug: "abc123", assignee: "John Doe", timeSinceLastReply: "2 days" },
    { subject: "Payment problem", slug: "def456", assignee: "Jane Smith", timeSinceLastReply: "1 day 5 hours" },
  ],
} satisfies Props;

export default ResponseTimeAlertEmail;
