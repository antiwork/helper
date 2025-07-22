import { generateHelperAuth } from "@helperai/react";

export const generateSession = ({
  email,
  isVip,
  anonymous,
}: {
  email?: string;
  isVip?: string;
  anonymous?: string;
}) => {
  const helperAuth = anonymous ? {} : generateHelperAuth({ email: email ?? "test@example.com" });
  return {
    ...helperAuth,
    customerMetadata: anonymous
      ? null
      : {
          name: "John Doe",
          value: isVip ? 1000_00 : 100,
          links: {
            "Billing Portal": "https://example.com",
          },
        },
  };
};
