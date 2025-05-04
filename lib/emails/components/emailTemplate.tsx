import { Body, Container, Font, Head, Heading, Hr, Html, Img, Preview, Section } from "@react-email/components";
import * as React from "react";
import { getBaseUrl } from "@/components/constants";

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
      <Head>
        <title>{subject}</title>
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
      <Body style={{ backgroundColor: "hsl(42 100% 95%)" }} className="helper-email-content">
        <Container
          style={{ margin: "0 auto", maxWidth: "600px", padding: "2rem", paddingBottom: "1rem", paddingTop: "2rem" }}
        >
          <Section style={{ marginBottom: "1rem" }}>
            <Img
              src={`${baseUrl}/logo_mahogany_900_for_email.png`}
              alt="Helper"
              style={{ margin: "0 auto", marginTop: "0", marginBottom: "0", height: "2rem", width: "auto" }}
            />
          </Section>
          <Container
            style={{
              borderRadius: "0.5rem",
              border: "1px solid hsl(218 10% 84%)",
              borderStyle: "solid",
              backgroundColor: "hsl(0 0% 100%)",
              padding: "1rem",
              fontSize: "1rem",
              lineHeight: "1.5",
            }}
          >
            <Heading as="h1" style={{ fontSize: "1.5rem" }}>
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
