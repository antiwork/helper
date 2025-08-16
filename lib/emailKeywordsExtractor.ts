import { mailboxes } from "@/db/schema";
import { runAIQuery } from "./ai";
import { MINI_MODEL } from "./ai/core";

const examples: [email: string, keywords: string][] = [
  [
    "Email: Delete my email from your files\n\nHi, Can you please delete my email address from your website and all newsletters. Thank you.",
    "delete email",
  ],
  [
    "Email: We have recently had people say checkout is adding a \"Tip\" but they can't remove it. We didn't add this as a feature we have had hundreds of people buy it without a tip, it just started showing up. Is there a reason this is happening!",
    "checkout tip feature",
  ],
  ["Email: Refund\n\nI need to get refund for this transaction, it was by mistake.", "refund transaction"],
  [
    "Email: Services not visible on Gumroad discover\n\nHello, I have added services and they are published. I cannot see my services in the marketplace. Thank you. Kind regards, Charlie",
    "Gumroad discover visibility",
  ],
  [
    "Email: RE: O365 Ebook\nAn additional $0.50 (fifty cents) charge? That wasn't from us - it must be a charge from your credit card provider for some reason. Perhaps the Gumroad support people can throw some light onto the topic. They're copied on this note and can track transactions (we can't). Cheers, David",
    "additional charge",
  ],
  [
    "Email: Re: New tender offer available\n\nyour site barely works. The tender page is just blank. Is there supposed to be something to click on?",
    "tender offer blank",
  ],
  [
    "Email: Re: Regarding your Gumroad account\n\nHi I'm replying to the suspension on the account. What's the reason? Regards Nathan\n-- Original message --\nHi, We apologize for the inconvenience, but we noticed certain behaviors in your account that indicate possible violations of our Terms of Service.",
    "Gumroad suspension",
  ],
];

export const emailKeywordsExtractor = async (params: {
  mailbox: typeof mailboxes.$inferSelect;
  subject: string;
  body: string;
}): Promise<string[]> => {
  const content = (
    await runAIQuery({
      system: [
        "Generate a space-delimited list of 1-3 keywords taken directly from the user email. Do not respond with anything else.",
        "Examples:",
        examples.map(([email, keywords]) => `${email}\n${keywords}`).join("\n\n"),
      ].join("\n\n"),
      mailbox: params.mailbox,
      temperature: 0,
      messages: [{ role: "user", content: `${params.subject}\n\n${params.body}` }],
      queryType: "email_keywords_extractor",
      model: MINI_MODEL,
      functionId: "email-keywords-extractor",
      maxTokens: 500,
    })
  ).text;

  return content
    .trim()
    .toLowerCase()
    .replace(/^"(.*)"$/, "$1")
    .split(/\s+/)
    .filter(Boolean)
    .toSorted();
};
