import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  eventType: "new_message" | "status_change" | "assignment_change" | "note_added";
  triggeredByName: string;
  conversationSubject: string;
  customerEmail: string;
  conversationLink: string;
  eventDetails: {
    message?: string;
    oldStatus?: string;
    newStatus?: string;
    oldAssignee?: string;
    newAssignee?: string;
    note?: string;
  };
};

const baseUrl = getBaseUrl();

const getEventContent = ({ eventType, triggeredByName, eventDetails }: Props) => {
  switch (eventType) {
    case "new_message":
      return {
        title: "New message in conversation",
        content: (
          <>
            <Text>
              <strong>{triggeredByName}</strong> added a new message to the conversation.
            </Text>
            {eventDetails.message && (
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderLeft: "3px solid #007bff",
                  margin: "12px 0",
                  fontSize: "0.875rem",
                }}
              >
                {eventDetails.message.substring(0, 200)}
                {eventDetails.message.length > 200 ? "..." : ""}
              </div>
            )}
          </>
        ),
      };
    case "status_change":
      return {
        title: "Conversation status changed",
        content: (
          <Text>
            <strong>{triggeredByName}</strong> changed the status: <span>{eventDetails.oldStatus}</span> →{" "}
            <strong>{eventDetails.newStatus}</strong>
          </Text>
        ),
      };
    case "assignment_change":
      return {
        title: "Conversation assignment changed",
        content: (
          <Text>
            <strong>{triggeredByName}</strong> changed the assignment:{" "}
            <span>{eventDetails.oldAssignee || "Unassigned"}</span> →{" "}
            <strong>{eventDetails.newAssignee || "Unassigned"}</strong>
          </Text>
        ),
      };
    case "note_added":
      return {
        title: "New note added",
        content: (
          <Text>
            <strong>{triggeredByName}</strong> added a note to this conversation.
            {eventDetails.note && (
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderLeft: "3px solid #007bff",
                  margin: "12px 0",
                  fontSize: "0.875rem",
                }}
              >
                {eventDetails.note.substring(0, 200)}
                {eventDetails.note.length > 200 ? "..." : ""}
              </div>
            )}
          </Text>
        ),
      };
    default:
      return {
        title: "Conversation updated",
        content: (
          <Text>
            <strong>{triggeredByName}</strong> made changes to this conversation.
          </Text>
        ),
      };
  }
};

const FollowerNotificationEmail = (props: Props) => {
  const { conversationSubject, customerEmail, conversationLink } = props;
  const { title, content } = getEventContent(props);

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <Text style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>{title}</Text>

        {content}

        <div
          style={{
            background: "#f8f9fa",
            padding: "12px",
            borderRadius: "6px",
            margin: "16px 0",
            fontSize: "0.875rem",
          }}
        >
          <Text style={{ margin: "4px 0" }}>
            <strong>Subject:</strong> {conversationSubject}
          </Text>
          <Text style={{ margin: "4px 0" }}>
            <strong>Customer:</strong> {customerEmail}
          </Text>
        </div>

        <Text>
          <Link href={conversationLink} style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
            View conversation →
          </Link>
        </Text>

        <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />

        <Text style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          You're receiving this because you're following this conversation.{" "}
          <Link href={conversationLink} style={{ color: "#6b7280", textDecoration: "underline" }}>
            Manage notifications
          </Link>
        </Text>

        <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
          <span style={{ opacity: 0.6 }}>Powered by</span>
          <Link
            href={`${baseUrl}?utm_source=follower-notification&utm_medium=email`}
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

FollowerNotificationEmail.PreviewProps = {
  eventType: "status_change",
  triggeredByName: "John Doe",
  conversationSubject: "Login issue with mobile app",
  customerEmail: "customer@example.com",
  conversationLink: "https://helperai.dev/conversations/abc123",
  eventDetails: {
    oldStatus: "open",
    newStatus: "closed",
  },
} satisfies Props;

export default FollowerNotificationEmail;
