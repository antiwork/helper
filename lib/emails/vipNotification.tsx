import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  customerName: string;
  customerEmail: string;
  message: string;
  conversationSubject: string;
  conversationLink: string;
  customerLinks?: Array<{ label: string; url: string }>;
  replyMessage?: string;
  replyAuthor?: string;
  closed?: boolean;
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

const VipNotificationEmail = (props: Props) => {
  const {
    customerName,
    customerEmail,
    message,
    conversationSubject,
    conversationLink,
    customerLinks = [],
    replyMessage,
    replyAuthor,
    closed = false,
  } = props;

  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const statusColor = closed ? colors.success : colors.destructive;
  const statusText = closed ? "Resolved" : "Open";

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      </Head>
      <Preview>New message from VIP customer {customerName}</Preview>
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
              ⭐ VIP Customer • {statusText}
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
              New Message
            </Heading>
            <Text
              style={{
                fontSize: "16px",
                color: "rgba(255, 255, 255, 0.9)",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              from {customerName}
            </Text>
          </Section>

          {/* Main Content */}
          <Section
            style={{
              backgroundColor: colors.background,
              padding: "40px 24px",
            }}
          >
            {/* Customer Info */}
            <Section
              style={{
                backgroundColor: colors.muted,
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "24px",
                border: `1px solid ${colors.border}`,
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  margin: "0 0 8px 0",
                  color: colors.mutedForeground,
                  lineHeight: "1.5",
                }}
              >
                Customer
              </Text>
              <Text
                style={{
                  fontSize: "16px",
                  margin: "0 0 12px 0",
                  color: colors.foreground,
                  fontWeight: "600",
                  lineHeight: "1.5",
                }}
              >
                {customerEmail}
              </Text>
              <Text
                style={{
                  fontSize: "14px",
                  margin: "0 0 8px 0",
                  color: colors.mutedForeground,
                  lineHeight: "1.5",
                }}
              >
                Subject
              </Text>
              <Text
                style={{
                  fontSize: "16px",
                  margin: "0",
                  color: colors.foreground,
                  fontWeight: "600",
                  lineHeight: "1.5",
                }}
              >
                {conversationSubject}
              </Text>
            </Section>

            {/* Original Message */}
            <Section
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                padding: "24px",
                borderRadius: "12px",
                marginBottom: "24px",
              }}
            >
              <Heading
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  margin: "0 0 16px 0",
                  color: colors.foreground,
                  lineHeight: "1.3",
                }}
              >
                Message
              </Heading>
              <Text
                style={{
                  fontSize: "15px",
                  lineHeight: "1.7",
                  margin: "0",
                  color: colors.foreground,
                  whiteSpace: "pre-wrap",
                }}
              >
                {message}
              </Text>
            </Section>

            {/* Reply Message */}
            {replyMessage && (
              <Section
                style={{
                  backgroundColor: "#f0f9ff",
                  borderLeft: "4px solid #3b82f6",
                  padding: "24px",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <Heading
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: colors.foreground,
                    lineHeight: "1.3",
                  }}
                >
                  Reply{replyAuthor ? ` by ${replyAuthor}` : ""}
                </Heading>
                <Text
                  style={{
                    fontSize: "15px",
                    lineHeight: "1.7",
                    margin: "0",
                    color: colors.foreground,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {replyMessage}
                </Text>
              </Section>
            )}

            {/* Customer Links */}
            {customerLinks.length > 0 && (
              <Section
                style={{
                  backgroundColor: colors.muted,
                  padding: "20px",
                  borderRadius: "12px",
                  marginBottom: "24px",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    margin: "0 0 12px 0",
                    color: colors.mutedForeground,
                    fontWeight: "600",
                    lineHeight: "1.5",
                  }}
                >
                  Customer Links
                </Text>
                {customerLinks.map((link, index) => (
                  <Text
                    key={index}
                    style={{
                      fontSize: "15px",
                      margin: index < customerLinks.length - 1 ? "0 0 8px 0" : "0",
                      lineHeight: "1.6",
                    }}
                  >
                    <Link
                      href={link.url}
                      style={{
                        color: colors.primary,
                        textDecoration: "none",
                        fontWeight: "500",
                      }}
                    >
                      {link.label} →
                    </Link>
                  </Text>
                ))}
              </Section>
            )}

            {/* Closed Status */}
            {closed && (
              <Section
                style={{
                  backgroundColor: "#f0fdf4",
                  borderLeft: "4px solid #22c55e",
                  padding: "16px 20px",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    margin: "0",
                    color: "#166534",
                    fontWeight: "600",
                    lineHeight: "1.5",
                  }}
                >
                  ✓ This conversation has been closed
                </Text>
              </Section>
            )}

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Link
                href={conversationLink}
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
                View Conversation →
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
              You're receiving this VIP notification email.{" "}
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
                href={`${baseUrl}?utm_source=vip-notification&utm_medium=email`}
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

VipNotificationEmail.PreviewProps = {
  customerName: "John Smith",
  customerEmail: "john.smith@example.com",
  message: "I'm experiencing an issue with my account. Can you help me resolve this?",
  conversationSubject: "Account Issue",
  conversationLink: "https://helperai.dev/conversations/abc123",
  customerLinks: [{ label: "Dashboard", url: "https://example.com/dashboard" }],
} satisfies Props;

export default VipNotificationEmail;
