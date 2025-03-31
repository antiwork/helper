import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";
import * as React from "react";
import { getBaseUrl } from "@/components/constants";
import { DocumentTitle } from "@/components/documentTitle";
import tailwindConfig from "../../../tailwind.config";

type Props = {
  subject: string;
  previewText: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export type ResendEmail<P> = ((props: P) => React.ReactNode) & {
  PreviewProps?: P;
};

const baseUrl = getBaseUrl();

const globalStyles = `
  body, html {
    margin: 0;
    padding: 0;
    width: 100% !important;
    height: 100% !important;
    background-color: #fff8e8;
  }
  body {
    font-family: Arial, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #111827;
    background-color: #fff8e8;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  img {
    -ms-interpolation-mode: bicubic;
    border: 0;
    height: auto;
    line-height: 100%;
    outline: none;
    text-decoration: none;
    max-width: 100%;
  }
  * {
    box-sizing: border-box;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    padding: 0;
    font-weight: bold;
  }
  .helper-email-content a {
    color: #480f0e;
  }
  h1 {
    font-size: 24px;
  }
  h2 {
    font-size: 20px;
  }
  h3 {
    font-size: 18px;
  }
  hr {
    border: none;
    border-top: 1px solid #d1d5db;
    margin: 16px 0;
  }
`;

export const EmailTemplate: ResendEmail<Props> = ({ subject, previewText, children, footer }) => {
  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Tailwind config={tailwindConfig}>
        <Head>
          <DocumentTitle>{subject}</DocumentTitle>
          <Font
            fontFamily="Sundry-Regular"
            fallbackFontFamily="sans-serif"
            webFont={{
              url: `${baseUrl}/fonts/Sundry-Regular.woff2`,
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
          <style>{globalStyles}</style>
        </Head>
        <Body className="helper-email-content bg-secondary">
          <Container className="mx-auto max-w-[600px] p-8 pb-4 pt-8">
            <Section className="mb-4">
              <Img
                src={`${baseUrl}/logo_mahogany_900_for_email.png`}
                alt="Helper"
                className="mx-auto my-0 h-8 w-auto"
              />
            </Section>
            {/* The extra `border-solid` is needed for the border to appear for some reason */}
            <Container className="rounded-lg border border-solid border-border bg-background p-4 text-base leading-normal">
              <Heading as="h1" className="text-2xl">
                {subject}
              </Heading>
              <Section>{children}</Section>
              {footer && (
                <>
                  <Hr />
                  {footer}
                </>
              )}
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

EmailTemplate.PreviewProps = {
  subject: "Welcome to Helper",
  previewText: "This is a sample preview text.",
  children: <p>This is a sample email body.</p>,
  footer: <p>This is a sample footer.</p>,
};

export default EmailTemplate;
