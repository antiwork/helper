import { Body, Head, Hr, Html, Img, Link, Markdown, Preview, Tailwind, Text } from "@react-email/components";
import tailwindConfig from "../../tailwind.config";

type Props = {
  content: string;
  widgetHost: string | null;
  companyName: string;
  hasPlatformCustomer: boolean;
};

// const baseUrl = getBaseUrl();
const baseUrl = "https://helper.ai";

const AutoReplyEmail = ({ content, companyName, widgetHost, hasPlatformCustomer }: Props) => (
  <Html>
    <Tailwind config={tailwindConfig}>
      <Head />
      <Preview>{content}</Preview>
      <Body className="font-system-ui">
        <div className="text-sm mb-6">
          <Markdown>{content}</Markdown>
        </div>
        <Text className="text-sm text-neutral-700 my-6">
          To continue the conversation, reply to this email
          {widgetHost && hasPlatformCustomer && (
            <>
              {" or "}
              <Link href={widgetHost} target="_blank" className="text-blue-700 underline">
                click here
              </Link>{" "}
              and open the notification message for our live chat
            </>
          )}
          .
        </Text>
        <Hr className="mx-0 w-16" />
        <Text className="text-neutral-500 text-xs leading-[22px] mt-3 mb-6">
          Powered by{" "}
          <Link
            href={`${baseUrl}?utm_source=auto-reply-email&utm_medium=email`}
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
      </Body>
    </Tailwind>
  </Html>
);

AutoReplyEmail.PreviewProps = {
  content:
    "Reasons you might want to use Gumroad are:\n\n- Gumroad makes it easy to sell digital products.\n- Gumroad makes it easy to sell physical products.\n- Gumroad makes it easy to sell services.",
  companyName: "Gumroad",
  widgetHost: "https://example.com",
  hasPlatformCustomer: true,
} as Props;

export default AutoReplyEmail;
