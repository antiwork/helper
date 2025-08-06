import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  conversationSubject: string;
  conversationSlug: string;
  eventType: string;
  eventDescription: string;
  updatedByName?: string;
};

const baseUrl = getBaseUrl();

const ConversationUpdateEmail = ({ 
  conversationSubject, 
  conversationSlug, 
  eventType, 
  eventDescription,
  updatedByName 
}: Props) => (
  <Html>
    <Head />
    <Preview>Update on "{conversationSubject}" - {eventDescription}</Preview>
    <Body
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        padding: "1rem",
      }}
    >
      <Text style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
        Conversation Update
      </Text>
      
      <Text style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
        There's been an update to a conversation you're following:
      </Text>

      <div style={{ 
        backgroundColor: "#f8fafc", 
        padding: "1rem", 
        borderRadius: "0.375rem", 
        marginBottom: "1.5rem",
        border: "1px solid #e2e8f0"
      }}>
        <Text style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          "{conversationSubject}"
        </Text>
        <Text style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          <strong>Update:</strong> {eventDescription}
        </Text>
        {updatedByName && (
          <Text style={{ fontSize: "0.875rem", color: "#64748b" }}>
            Updated by {updatedByName}
          </Text>
        )}
      </div>

      <Text style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        <Link
          href={`${baseUrl}/conversations/${conversationSlug}`}
          style={{ 
            backgroundColor: "#3b82f6", 
            color: "white", 
            padding: "0.5rem 1rem", 
            borderRadius: "0.375rem",
            textDecoration: "none",
            display: "inline-block"
          }}
        >
          View Conversation
        </Link>
      </Text>

      <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />
      
      <Text style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>
        You're receiving this because you're following this conversation.
      </Text>
      
      <Text style={{ fontSize: "0.75rem", color: "#64748b" }}>
        <Link 
          href={`${baseUrl}/conversations/${conversationSlug}`} 
          style={{ color: "#64748b" }}
        >
          Unfollow this conversation
        </Link>
      </Text>
    </Body>
  </Html>
);

ConversationUpdateEmail.PreviewProps = {
  conversationSubject: "Issue with login functionality",
  conversationSlug: "issue-login-abc123",
  eventType: "status_change",
  eventDescription: "Status changed from Open to Closed",
  updatedByName: "Sarah Johnson",
} satisfies Props;

export default ConversationUpdateEmail;