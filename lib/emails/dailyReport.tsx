import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  openTickets: number;
  ticketsAnswered: number;
  openTicketsOverZero?: number;
  ticketsAnsweredOverZero?: number;
  averageReplyTime?: string;
  vipAverageReplyTime?: string;
  averageWaitTime?: string;
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

const DailyReportEmail = (props: Props) => {
  const {
    mailboxName,
    openTickets,
    ticketsAnswered,
    openTicketsOverZero,
    ticketsAnsweredOverZero,
    averageReplyTime,
    vipAverageReplyTime,
    averageWaitTime,
  } = props;

  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      </Head>
      <Preview>Daily summary for {mailboxName}</Preview>
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
              Daily Summary
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
            <Text
              style={{
                fontSize: "16px",
                color: colors.foreground,
                margin: "0 0 32px 0",
                lineHeight: "1.6",
              }}
            >
              Here's a quick overview of your mailbox activity from the last 24 hours:
            </Text>

            {/* Metrics Grid */}
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
                Key Metrics
              </Heading>

              <Section style={{ marginBottom: "16px" }}>
                <Text
                  style={{
                    fontSize: "15px",
                    margin: "0 0 4px 0",
                    color: colors.mutedForeground,
                    lineHeight: "1.5",
                  }}
                >
                  Open tickets
                </Text>
                <Text
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    margin: "0",
                    color: colors.foreground,
                    lineHeight: "1.2",
                  }}
                >
                  {openTickets.toLocaleString()}
                </Text>
              </Section>

              <Hr style={{ margin: "20px 0", borderColor: colors.border, borderWidth: "1px" }} />

              <Section style={{ marginBottom: "16px" }}>
                <Text
                  style={{
                    fontSize: "15px",
                    margin: "0 0 4px 0",
                    color: colors.mutedForeground,
                    lineHeight: "1.5",
                  }}
                >
                  Tickets answered
                </Text>
                <Text
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    margin: "0",
                    color: colors.success,
                    lineHeight: "1.2",
                  }}
                >
                  {ticketsAnswered.toLocaleString()}
                </Text>
              </Section>

              {(openTicketsOverZero !== undefined && openTicketsOverZero > 0) ||
              (ticketsAnsweredOverZero !== undefined && ticketsAnsweredOverZero > 0) ||
              averageReplyTime ||
              vipAverageReplyTime ||
              averageWaitTime ? (
                <>
                  <Hr style={{ margin: "20px 0", borderColor: colors.border, borderWidth: "1px" }} />
                  <Section>
                    {openTicketsOverZero !== undefined && openTicketsOverZero > 0 && (
                      <Text
                        style={{
                          fontSize: "14px",
                          margin: "0 0 12px 0",
                          color: colors.foreground,
                          lineHeight: "1.6",
                        }}
                      >
                        <strong>Open tickets over $0:</strong> {openTicketsOverZero.toLocaleString()}
                      </Text>
                    )}
                    {ticketsAnsweredOverZero !== undefined && ticketsAnsweredOverZero > 0 && (
                      <Text
                        style={{
                          fontSize: "14px",
                          margin: "0 0 12px 0",
                          color: colors.foreground,
                          lineHeight: "1.6",
                        }}
                      >
                        <strong>Tickets answered over $0:</strong> {ticketsAnsweredOverZero.toLocaleString()}
                      </Text>
                    )}
                    {averageReplyTime && (
                      <Text
                        style={{
                          fontSize: "14px",
                          margin: "0 0 12px 0",
                          color: colors.foreground,
                          lineHeight: "1.6",
                        }}
                      >
                        <strong>Average reply time:</strong> {averageReplyTime}
                      </Text>
                    )}
                    {vipAverageReplyTime && (
                      <Text
                        style={{
                          fontSize: "14px",
                          margin: "0 0 12px 0",
                          color: colors.foreground,
                          lineHeight: "1.6",
                        }}
                      >
                        <strong>VIP average reply time:</strong> {vipAverageReplyTime}
                      </Text>
                    )}
                    {averageWaitTime && (
                      <Text
                        style={{
                          fontSize: "14px",
                          margin: "0 0 0 0",
                          color: colors.foreground,
                          lineHeight: "1.6",
                        }}
                      >
                        <strong>Average wait time:</strong> {averageWaitTime}
                      </Text>
                    )}
                  </Section>
                </>
              ) : null}
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
              You're receiving this daily summary email.{" "}
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
                href={`${baseUrl}?utm_source=daily-report&utm_medium=email`}
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

DailyReportEmail.PreviewProps = {
  mailboxName: "Support Team",
  openTickets: 42,
  ticketsAnswered: 18,
  openTicketsOverZero: 15,
  ticketsAnsweredOverZero: 12,
  averageReplyTime: "2h 15m",
  vipAverageReplyTime: "1h 30m",
  averageWaitTime: "5h 20m",
} satisfies Props;

export default DailyReportEmail;
