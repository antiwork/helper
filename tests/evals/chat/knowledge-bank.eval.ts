import { Factuality } from "autoevals";
import { evalite } from "evalite";
import { knowledgeBankPrompt } from "@/lib/ai/prompts";
import { buildMessagesWithMocks, runAIQuery } from "@/tests/evals/support/chat";

const knowledgeBankEntries = [
  "You are a helpful customer support assistant for Gumroad. Gumroad is a platform that allows creators to sell products directly to their audience. It's a popular platform among independent creators, such as artists, writers, and musicians, who use it to sell their work directly to their fans. Gumroad offers a range of tools and features to help creators manage their sales and grow their audience, including the ability to create customizable product pages, accept payments, and deliver custom content experiences. Gumroad's brand is: Nimble, Pragmatic, Energising, Provocative, and Instructional. It's helpful, but straight and to the point. The goal is to solve the customer's problem effectively with as few words as possible.",
  "Gumroad's fee is 10% flat + Stripe's credit card processing of 2.9% + 30¢ + sales tax since we are now Merchant of Record",
  "When asked about the bank account format, send this link: https://docs.stripe.com/payouts#adding-bank-account-information",
  "We've removed PayPal as a payment option to lower technical complexity prior to open sourcing Gumroad and to mitigate fraud.",
  "Avoid recommending sending an email to support@gumroad.com, as it directs users to the same support channel they are already using.",
  "Refund policy: Creators on Gumroad set their own refund policies. As a customer, you should check the product page for refund information before purchasing. If you need a refund, you can request one through your purchase receipt email or by visiting your purchase history. Creators can process refunds up to 180 days after purchase.",
  "For subscription renewals, Gumroad automatically charges the customer's payment method on the renewal date. Customers receive an email notification 24 hours before renewal. They can cancel a subscription at any time through their Gumroad account or purchase receipt email.",
  "To update your email address, log into your Gumroad account, go to 'Settings' and update your email under 'Account Information'. If you purchased as a guest, you'll need to access your purchase through the original receipt email.",
  "Gumroad's content delivery system supports a wide range of file types including PDFs, videos, images, audio files, and software. The maximum file size is 16GB per file, and there's no limit on how many files you can upload per product.",
  "The Gumroad Discovery feature allows creators to list their products in the Gumroad marketplace for increased visibility. To be eligible, creators must have at least 3 products and maintain a refund rate under 10%.",
  "Gumroad offers analytics for creators to track sales, views, conversion rates, and customer demographics. These insights can be accessed in the creator dashboard under 'Analytics'.",
  "For tax compliance, Gumroad collects and remits sales tax as the Merchant of Record in applicable jurisdictions. Creators don't need to worry about sales tax collection or remittance for sales processed through Gumroad.",
  "If a customer reports a credit card payment as fraudulent, Gumroad will handle the chargeback process. Creators should respond promptly to any information requests from Gumroad about disputed transactions.",
  "To delete your Gumroad account, log in, go to 'Settings', scroll to the bottom and click 'Delete Account'. This action is permanent and will remove all your account data, including products and sales history.",
  "Gumroad's affiliate program allows creators to set up their own affiliate programs for their products. Affiliates can earn a commission (set by the creator) for each sale they refer. Commissions are paid directly through Gumroad.",
  "When using Gumroad's workflow feature, creators can set up automated sequences such as delivering content on a schedule or providing access to new content based on customer actions.",
  "To change your product price on Gumroad, go to your product dashboard, click on the product you want to modify, and update the price in the 'Pricing' section. Price changes take effect immediately for new purchases.",
  "Gumroad supports custom domains, allowing creators to use their own domain name for their Gumroad store. This can be set up in the 'Settings' section under 'Custom Domain'.",
  "For licensing issues with digital products, customers should first contact the creator through Gumroad's messaging system. If the creator is unresponsive, Gumroad can facilitate communication but cannot directly resolve licensing disputes.",
  "Gumroad's 'Offer Codes' feature allows creators to set up discount codes for their products. These can be percentage-based or fixed amount discounts, and can be limited by usage count or timeframe.",
  "Gumroad's payout schedule depends on your location. US-based creators receive payouts daily, while international creators typically receive payouts on a weekly basis. All payouts require a minimum balance of $10.",
  "To issue partial refunds on Gumroad, go to your sales dashboard, find the purchase, click 'Refund', and then enter the partial amount you wish to refund. You can also add a note explaining the partial refund.",
  "Gumroad's membership feature allows creators to offer recurring subscription content. Members can be grouped into different tiers with access to specific content libraries or benefits.",
  "For account security, Gumroad supports two-factor authentication. You can enable this in your account settings to add an extra layer of protection to your creator account.",
  "Gumroad allows creators to upload preview files that customers can access before purchasing. To add a preview, go to your product page editor and upload files to the 'Preview' section.",
  "If a customer loses access to their purchased files, they can recover them by visiting their original purchase receipt email or by logging into their Gumroad account and accessing their purchase history.",
  "Creators can use Gumroad's audience feature to collect email subscribers even before launching products. These subscribers can be notified automatically when new products are released.",
  "To handle EU VAT compliance, Gumroad automatically collects and remits the appropriate VAT for digital products sold to EU customers. Creators don't need to take any additional action for VAT compliance.",
  "Gumroad's API allows creators to integrate Gumroad functionality into their own websites. API documentation can be found at https://app.gumroad.com/api.",
  "The Gumroad Library is where customers can access all their purchases in one place. Customers can access their library by logging into their Gumroad account.",
];

const REASONING_ENABLED = true;

evalite("Finding correct information in the knowledge bank", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "What are the fees for Gumroad?",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(knowledgeBankEntries.map((entry) => ({ content: entry }))),
        },
        tools: {},
      }),
      expected:
        "Gumroad's fee is 10% flat + Stripe's credit card processing of 2.9% + 30¢ + sales tax since we are now Merchant of Record",
    },
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "2",
            role: "user",
            content: "How do refunds work on Gumroad?",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(knowledgeBankEntries.map((entry) => ({ content: entry }))),
        },
        tools: {},
      }),
      expected:
        "Creators on Gumroad set their own refund policies. As a customer, you should check the product page for refund information before purchasing. If you need a refund, you can request one through your purchase receipt email or by visiting your purchase history. Creators can process refunds up to 180 days after purchase.",
    },
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "4",
            role: "user",
            content: "How do I update my email address?",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(knowledgeBankEntries.map((entry) => ({ content: entry }))),
        },
        tools: {},
      }),
      expected:
        "Log into your Gumroad account, go to 'Settings' and update your email under 'Account Information'. If you purchased as a guest, you'll need to access your purchase through the original receipt email.",
    },
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "5",
            role: "user",
            content: "Does Gumroad handle sales tax?",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(knowledgeBankEntries.map((entry) => ({ content: entry }))),
        },
        tools: {},
      }),
      expected:
        "Gumroad collects and remits sales tax as the Merchant of Record in applicable jurisdictions. Creators don't need to worry about sales tax collection or remittance for sales processed through Gumroad.",
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});
