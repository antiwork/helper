import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import React from "react";
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

export const VipNotificationEmailTemplate = ({
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
        margin: 0,
        padding: 0,
        backgroundColor: "#f6f8fb",
        color: "#111827",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <div style={{ padding: "32px 16px" }}>
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "28px 32px 16px", borderBottom: "1px solid #e5e7eb" }}>
            <Text style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>⭐ VIP Customer</Text>
            <Text style={{ margin: "10px 0 0", fontSize: "14px" }}>
              New message from <strong>{customerName}</strong> ({customerEmail})
            </Text>
          </div>

          {/* Message card */}
          <div style={{ padding: "16px 32px" }}>
            <div
              style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: 8,
                fontSize: "0.875rem",
                borderLeft: closed ? "4px solid #22C55E" : "4px solid #EF4444",
              }}
            >
              <Text style={{ fontWeight: 600, margin: "4px 0" }}>Original message:</Text>
              <Text style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>{originalMessage}</Text>

              {replyMessage && (
                <>
                  <Hr style={{ margin: "12px 0" }} />
                  <Text style={{ fontWeight: 600, margin: "4px 0" }}>Reply:</Text>
                  <Text style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>{replyMessage}</Text>
                </>
              )}
            </div>
          </div>

          {/* Customer links */}
          {customerLinks && customerLinks.length > 0 && (
            <div style={{ padding: "0 32px 8px" }}>
              <Text style={{ fontSize: "0.875rem", margin: 0 }}>
                {customerLinks.map((link, index) => (
                  <span key={index}>
                    <Link href={link.url} style={{ color: "#007bff", textDecoration: "none", marginRight: 12 }}>
                      {link.label}
                    </Link>
                  </span>
                ))}
              </Text>
            </div>
          )}

          {/* View link & status */}
          <div style={{ padding: "4px 32px 20px" }}>
            <Text style={{ margin: 0 }}>
              <Link href={conversationLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: 500 }}>
                View in Helper →
              </Link>
            </Text>
            {closed && closedBy && (
              <Text style={{ fontSize: "0.875rem", color: "#22C55E", marginTop: "8px" }}>✓ Closed by {closedBy}</Text>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "0 32px 28px" }}>
            <Hr style={{ margin: "8px 0 16px", width: "64px", borderColor: "#e5e7eb" }} />
            <Text
              style={{
                fontSize: "12px",
                lineHeight: "20px",
                marginTop: "4px",
                marginBottom: 0,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              <span style={{ opacity: 0.7 }}>Powered by</span>
              <Link
                href={`${baseUrl}?utm_source=vip-notification&utm_medium=email`}
                target="_blank"
                style={{ color: "#6b7280", textDecoration: "none" }}
              >
                <Img
                  //src={`${baseUrl}/logo_mahogany_900_for_email.png`}
                  src="https://raw.githubusercontent.com/antiwork/helper/main/public/logo_mahogany_900_for_email.png"
                  width="64"
                  alt="Helper Logo"
                  style={{ verticalAlign: "middle", marginLeft: "2px" }}
                />
              </Link>
            </Text>
          </div>
        </div>
      </div>
    </Body>
  </Html>
);
