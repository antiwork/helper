import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type TeamMember = {
  name: string;
  count: number;
};

type Props = {
  mailboxName: string;
  weekRange: string;
  activeMembers: TeamMember[];
  inactiveMembers: string[];
  totalTicketsResolved: number;
  activeUserCount: number;
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

const WeeklyReportEmail = (props: Props) => {
  const { mailboxName, weekRange, activeMembers, inactiveMembers, totalTicketsResolved, activeUserCount } = props;

  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const peopleText = activeUserCount === 1 ? "person" : "people";

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      </Head>
      <Preview>Last week in the {mailboxName} mailbox</Preview>
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
              backgroundColor: colors.primary,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
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
              Weekly Summary
            </Heading>
            <Text
              style={{
                fontSize: "16px",
                color: "rgba(255, 255, 255, 0.9)",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              {mailboxName} • {weekRange}
            </Text>
          </Section>

          {/* Main Content */}
          <Section
            style={{
              backgroundColor: colors.background,
              padding: "40px 24px",
            }}
          >
            {/* Total Replies Highlight */}
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
                Total replies this week
              </Text>
              <Text
                style={{
                  fontSize: "36px",
                  fontWeight: "700",
                  margin: "0 0 4px 0",
                  color: colors.success,
                  lineHeight: "1.2",
                }}
              >
                {totalTicketsResolved.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: "14px",
                  margin: "0",
                  color: colors.mutedForeground,
                  lineHeight: "1.5",
                }}
              >
                from {activeUserCount} {peopleText}
              </Text>
            </Section>

            {/* Active Team Members */}
            {activeMembers.length > 0 && (
              <Section
                style={{
                  backgroundColor: colors.muted,
                  padding: "24px",
                  borderRadius: "12px",
                  marginBottom: "24px",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Heading
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    margin: "0 0 20px 0",
                    color: colors.foreground,
                    lineHeight: "1.3",
                  }}
                >
                  Team Performance
                </Heading>
                {activeMembers.map((member, index) => (
                  <Section
                    key={index}
                    style={{
                      marginBottom: index < activeMembers.length - 1 ? "16px" : "0",
                      paddingBottom: index < activeMembers.length - 1 ? "16px" : "0",
                      borderBottom:
                        index < activeMembers.length - 1 ? `1px solid ${colors.border}` : "none",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: "14px",
                        margin: "0 0 4px 0",
                        color: colors.mutedForeground,
                        lineHeight: "1.5",
                      }}
                    >
                      {member.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        margin: "0",
                        color: colors.foreground,
                        lineHeight: "1.2",
                      }}
                    >
                      {member.count.toLocaleString()} {member.count === 1 ? "ticket" : "tickets"}
                    </Text>
                  </Section>
                ))}
              </Section>
            )}

            {/* Inactive Members Alert */}
            {inactiveMembers.length > 0 && (
              <Section
                style={{
                  backgroundColor: "#fff8f1",
                  borderLeft: "4px solid #f97316",
                  padding: "20px",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    margin: "0 0 8px 0",
                    color: "#9a3412",
                    fontWeight: "600",
                    lineHeight: "1.5",
                  }}
                >
                  No tickets answered this week:
                </Text>
                <Text
                  style={{
                    fontSize: "14px",
                    margin: "0",
                    color: "#9a3412",
                    lineHeight: "1.6",
                  }}
                >
                  {inactiveMembers.join(", ")}
                </Text>
              </Section>
            )}

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
              You're receiving this weekly summary email.{" "}
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
                href={`${baseUrl}?utm_source=weekly-report&utm_medium=email`}
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

WeeklyReportEmail.PreviewProps = {
  mailboxName: "Support Team",
  weekRange: "Week of 2024-01-01 to 2024-01-07",
  activeMembers: [
    { name: "John Doe", count: 45 },
    { name: "Jane Smith", count: 32 },
    { name: "Bob Johnson", count: 18 },
  ],
  inactiveMembers: ["Alice Williams", "Charlie Brown"],
  totalTicketsResolved: 95,
  activeUserCount: 3,
} satisfies Props;

export default WeeklyReportEmail;
