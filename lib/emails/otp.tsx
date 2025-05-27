import { Body, Head, Hr, Html, Img, Link, Preview, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

const baseUrl = getBaseUrl();

const OtpEmail = ({ otp }: { otp: string }) => (
  <Html>
    <Head />
    <Preview>Your login code is {otp}</Preview>
    <Body
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <Text>
        Your login code for <a href={getBaseUrl()}>{getBaseUrl()}</a> is:
      </Text>
      <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{otp}</Text>
      <Hr style={{ margin: "1.5rem 0", width: "4rem" }} />
      <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
        <span style={{ opacity: 0.6 }}>Powered by</span>
        <Link
          href={`${baseUrl}?utm_source=auto-reply-email&utm_medium=email`}
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

OtpEmail.PreviewProps = {
  otp: "123456",
};

export default OtpEmail;
