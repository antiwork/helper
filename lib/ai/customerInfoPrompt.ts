import { CustomerInfo } from "@/lib/metadataApiClient";

const formatCustomerMetadata = (metadata: unknown, prefix = ""): string => {
  if (!metadata) return "-";
  if (Array.isArray(metadata)) {
    return `\n${metadata
      .map((value, index) => `${prefix}${index + 1}. ${formatCustomerMetadata(value, `${prefix}  `)}`)
      .join("\n")}`;
  }
  if (typeof metadata === "object") {
    return `\n${Object.entries(metadata)
      .map(([key, value]) => `${prefix}- ${key}: ${formatCustomerMetadata(value, `${prefix}  `)}`)
      .join("\n")}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return `${metadata}`;
};

export const customerInfoPrompt = (
  email: string | null,
  customerInfo?: (Omit<CustomerInfo, "value"> & { value?: string | number | null }) | null,
): string => {
  let userPrompt;
  if (customerInfo) {
    userPrompt = "Current user details:\n";
    if (email) userPrompt += `- Email: ${email}\n`;
    if (customerInfo.name) userPrompt += `- Name: ${customerInfo.name}\n`;
    if (customerInfo.value != null && customerInfo.value !== "")
      userPrompt += `- Customer Value: $${(Number(customerInfo.value) / 100).toFixed(2)}\n`;
    userPrompt += formatCustomerMetadata(customerInfo.metadata).trim();
  } else {
    userPrompt = email ? `\nCurrent user email: ${email}` : "Anonymous user";
  }
  return userPrompt;
};
