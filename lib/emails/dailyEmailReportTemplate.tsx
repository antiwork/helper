import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import React from "react";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  openTickets: number;
  ticketsAnswered: number;
  openTicketsOverZero: number;
  ticketsAnsweredOverZero: number;
  avgReplyTime?: string;
  vipAvgReplyTime?: string;
  avgWaitTime?: string;
};

const baseUrl = getBaseUrl();

export const DailyEmailReportTemplate = ({
  mailboxName,
  openTickets,
  ticketsAnswered,
  openTicketsOverZero,
  ticketsAnsweredOverZero,
  avgReplyTime,
  vipAvgReplyTime,
  avgWaitTime,
}: Props) => (
  <Html>
    <Head />
    <Preview>Daily summary for {mailboxName}</Preview>
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
          <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <Text style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Daily Summary</Text>
            <Text style={{ margin: "6px 0 0", fontSize: "14px", color: "#6b7280" }}>{mailboxName}</Text>
            <Text style={{ margin: "12px 0 0", fontSize: "14px", color: "#374151" }}>
              Here&apos;s today&apos;s summary of your mailbox activity.
            </Text>
          </div>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontSize: "14px" }}>
            <tbody>
              <SummaryRow label="Open tickets" value={openTickets.toLocaleString()} />
              <SummaryRow label="Tickets answered" value={ticketsAnswered.toLocaleString()} />
              <SummaryRow label="Open tickets over $0" value={openTicketsOverZero.toLocaleString()} />
              <SummaryRow label="Tickets answered over $0" value={ticketsAnsweredOverZero.toLocaleString()} />
              <SummaryRow label="Average reply time" value={avgReplyTime ?? "—"} />
              <SummaryRow label="VIP average reply time" value={vipAvgReplyTime ?? "—"} />
              <SummaryRow label="Average time existing open tickets have been open" value={avgWaitTime ?? "—"} last />
            </tbody>
          </table>
          <div style={{ padding: "8px 32px 28px" }}>
            <Hr style={{ margin: "8px 0 16px", width: "64px", borderColor: "#e5e7eb" }} />
            <Text
              style={{
                fontSize: "12px",
                lineHeight: "20px",
                marginTop: "4px",
                marginBottom: "0",
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              <span style={{ opacity: 0.7 }}>Powered by</span>
              <Link
                href={`${baseUrl}?utm_source=daily-report&utm_medium=email`}
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

// Reusable summary row component for better readability & consistent spacing
const SummaryRow = ({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) => (
  <tr style={{ borderBottom: last ? "none" : "1px solid #eef2f7" }}>
    <td
      style={{
        padding: "14px 32px",
        color: "#111827",
        fontWeight: 500,
        lineHeight: "20px",
        verticalAlign: "top",
        width: "68%",
      }}
    >
      {label}
    </td>
    <td
      style={{
        padding: "14px 32px",
        textAlign: "right",
        fontWeight: 600,
        color: "#111827",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </td>
  </tr>
);
