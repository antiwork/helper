import { Body, Head, Hr, Html, Img, Link, Markdown, Preview, Tailwind, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";
import tailwindConfig from "../../tailwind.config";

type Props = {
  content: string;
};

const baseUrl = getBaseUrl();

const AIReplyEmail = ({ content }: Props) => (
  <Html>
    <Tailwind config={tailwindConfig}>
      <Head />
      <Preview>{content}</Preview>
      <Body className="font-system-ui">
        <div className="text-sm mb-6">
          <Markdown>{content}</Markdown>
        </div>
        <Text className="text-sm opacity-60">
          This response was created by our AI support agent. Need human support? Let us know in your reply.
        </Text>
        <Hr className="mx-0 my-6 w-16" />
        <Text className="text-xs leading-[22px] mt-3 mb-6">
          <span className="opacity-60">Powered by</span>
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

AIReplyEmail.PreviewProps = {
  content:
    "Reasons you might want to use Gumroad are:\n\n- Gumroad makes it easy to sell digital products.\n- Gumroad makes it easy to sell physical products.\n- Gumroad makes it easy to sell services.",
} satisfies Props;

export default AIReplyEmail;
