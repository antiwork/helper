import { parseAddressList, parseOneAddress } from "email-addresses";

// Bob <bob@example.com>, Charlie <charlie@example.com>, dave@example.com
export const extractAddresses = (value: string) => {
  return (
    parseAddressList(value)
      ?.flatMap((addr) => ("address" in addr ? [addr] : addr.addresses))
      .map(({ address }) => address) ?? []
  );
};

export const parseEmailAddress = (address: string) => {
  const result = parseOneAddress(address);
  return result?.type === "mailbox" ? result : result?.addresses[0];
};
