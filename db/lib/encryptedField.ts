import { customType } from "drizzle-orm/pg-core";
import { symmetricDecrypt, symmetricEncrypt } from "@/db/lib/crypto";

export const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const encryptedField = customType<{ data: string }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: string): Buffer {
    // eslint-disable-next-line no-restricted-properties
    const fallbackSecret = process.env.ENCRYPT_COLUMN_SECRET ?? "ffffffffffffffffffffffffffffffff";
    return Buffer.from(symmetricEncrypt(value, fallbackSecret));
  },
  fromDriver(value: unknown): string {
    return decryptFieldValue(value);
  },
});

export const decryptFieldValue = (value: unknown): string => {
  // eslint-disable-next-line no-restricted-properties
  const fallbackSecret = process.env.ENCRYPT_COLUMN_SECRET ?? "ffffffffffffffffffffffffffffffff";
  if (typeof value === "string") {
    // Handle PostgreSQL bytea hex format with \x prefix
    if (value.startsWith("\\x")) {
      const hexString = value.slice(2); // Remove '\x' prefix
      const bufferValue = Buffer.from(hexString, "hex");
      return symmetricDecrypt(bufferValue.toString("utf-8"), fallbackSecret);
    }
    return symmetricDecrypt(value, fallbackSecret);
  } else if (Buffer.isBuffer(value)) {
    return symmetricDecrypt(value.toString("utf-8"), fallbackSecret);
  }

  throw new Error(`Unexpected value type: ${typeof value}`);
};
