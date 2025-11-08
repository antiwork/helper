import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import React from "react";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  openTickets: number;
  ticketsAnswered: number;
  openTicketsOverZero?: number;
  ticketsAnsweredOverZero?: number;
  avgReplyTime?: string;
  vipAvgReplyTime?: string;
  avgWaitTime?: string;
};

const baseUrl = getBaseUrl();

export const DailyReportEmail = ({
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
          fontSize: "0.875rem",
        }}
      >
        <Text style={{ margin: "4px 0" }}>• Open tickets: {openTickets.toLocaleString()}</Text>
        <Text style={{ margin: "4px 0" }}>• Tickets answered: {ticketsAnswered.toLocaleString()}</Text>
        {openTicketsOverZero !== undefined && (
          <Text style={{ margin: "4px 0" }}>• Open tickets over $0: {openTicketsOverZero.toLocaleString()}</Text>
        )}
        {ticketsAnsweredOverZero !== undefined && (
          <Text style={{ margin: "4px 0" }}>
            • Tickets answered over $0: {ticketsAnsweredOverZero.toLocaleString()}
          </Text>
        )}
        {avgReplyTime && <Text style={{ margin: "4px 0" }}>• Average reply time: {avgReplyTime}</Text>}
        {vipAvgReplyTime && <Text style={{ margin: "4px 0" }}>• VIP average reply time: {vipAvgReplyTime}</Text>}
        {avgWaitTime && (
          <Text style={{ margin: "4px 0" }}>• Average time existing open tickets have been open: {avgWaitTime}</Text>
        )}
      </div>

      <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

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
