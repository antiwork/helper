import emailAddresses from "email-addresses";

// Bob <bob@example.com>, Charlie <charlie@example.com>, dave@example.com
export const extractAddresses = (value: string) => {
  return (
    emailAddresses
      .parseAddressList(value)
      ?.flatMap((addr) => ("address" in addr ? [addr] : addr.addresses))
      .map(({ address }) => address) ?? []
  );
};

export const parseEmailAddress = (address: string) => {
  const result = emailAddresses.parseOneAddress(address);
  return result?.type === "mailbox" ? result : result?.addresses[0];
};
