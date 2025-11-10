import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import React from "react";
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

export const WeeklyEmailReportTemplate = ({
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
            <div style={{ padding: "28px 32px 16px", borderBottom: "1px solid #e5e7eb" }}>
              <Text style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Weekly Report</Text>
              <Text style={{ margin: "6px 0 0", fontSize: "14px", color: "#6b7280" }}>{mailboxName}</Text>
              <Text style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>{dateRange}</Text>
              <Text style={{ margin: "12px 0 0", fontSize: "14px", color: "#374151" }}>
                Here&apos;s a summary of your team&apos;s activity this week.
              </Text>
            </div>

            {/* Team members list */}
            {teamMembers.length > 0 && (
              <div style={{ padding: "16px 32px" }}>
                <Text style={{ fontWeight: 600, margin: "0 0 8px" }}>Team members</Text>
                <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {teamMembers.map((member, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #eef2f7" }}>
                        <td style={{ padding: "10px 0", color: "#111827" }}>• {member.name}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                          {member.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inactive members */}
            {inactiveMembers.length > 0 && (
              <div style={{ padding: "0 32px 12px" }}>
                <Text style={{ fontSize: "14px", margin: 0 }}>
                  <strong>No tickets answered:</strong> {inactiveMembers.join(", ")}
                </Text>
              </div>
            )}

            {/* Total activity block */}
            <div style={{ padding: "8px 32px 24px" }}>
              <div
                style={{
                  background: "#f3f4f6",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <Text style={{ margin: 0, fontWeight: 700, color: "#111827" }}>Total Activity</Text>
                <Text style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 700 }}>
                  {totalReplies.toLocaleString()} replies
                </Text>
                <Text style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                  from {activeUserCount} {peopleText}
                </Text>
              </div>
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
                  href={`${baseUrl}?utm_source=weekly-report&utm_medium=email`}
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
};
