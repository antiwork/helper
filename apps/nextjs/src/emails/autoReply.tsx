import { Body, Container, Head, Hr, Html, Img, Link, Preview, Tailwind, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";
import tailwindConfig from "../../tailwind.config";

type Props = {
  content: string;
  widgetHost: string | null;
  companyName: string;
  hasPlatformCustomer: boolean;
};

const baseUrl = getBaseUrl();

const AutoReplyEmail = ({ content, companyName, widgetHost, hasPlatformCustomer }: Props) => (
  <Html>
    <Tailwind config={tailwindConfig}>
      <Head />
      <Preview>{content}</Preview>
      <Body className="bg-white font-system-ui">
        <Container className="px-3 mx-auto">
          <Text className="text-sm my-6">
            {content}
            <p>
              Best,
              <br />
              {companyName}
            </p>
          </Text>
          <Text className="text-neutral-700 text-sm my-6">
            To continue the conversation, reply to this email
            {widgetHost && hasPlatformCustomer && (
              <>
                {" or "}
                <Link href={widgetHost} target="_blank" className="text-blue-700 text-sm underline block mb-4">
                  click here
                </Link>{" "}
                and open the notification message to continue in our live chat.
              </>
            )}
            .
          </Text>
          <Hr />
          <Text className="text-neutral-500 text-xs leading-[22px] mt-3 mb-6">
            Powered by{" "}
            <Link
              href={`https://helper.ai?utm_source=auto-reply-email&utm_medium=email`}
              target="_blank"
              className="text-neutral-500 no-underline"
            >
              <Img
                src={`${baseUrl}/logo_mahogany_900_for_email.png`}
                width="64"
                alt="Helper Logo"
                className="align-middle ml-0.5"
              />
            </Link>
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

AutoReplyEmail.PreviewProps = {
  content: "Hello, how are you?",
  companyName: "Gumroad",
  widgetHost: "https://example.com",
} as Props;

export default AutoReplyEmail;
