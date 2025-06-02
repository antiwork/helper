import { customType } from "drizzle-orm/pg-core";
import { symmetricDecrypt, symmetricEncrypt } from "@/db/lib/crypto";
import { env } from "@/lib/env";

const nativeEncryptColumnSecret = env.ENCRYPT_COLUMN_SECRET;

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
    return Buffer.from(symmetricEncrypt(value, nativeEncryptColumnSecret));
  },
  fromDriver(value: unknown): string {
    if (typeof value === "string") {
      // Handle PostgreSQL bytea hex format with \x prefix
      if (value.startsWith("\\x")) {
        const hexString = value.slice(2); // Remove '\x' prefix
        const bufferValue = Buffer.from(hexString, "hex");
        return symmetricDecrypt(bufferValue.toString("utf-8"), nativeEncryptColumnSecret);
      }
      return symmetricDecrypt(value, nativeEncryptColumnSecret);
    } else if (Buffer.isBuffer(value)) {
      return symmetricDecrypt(value.toString("utf-8"), nativeEncryptColumnSecret);
    }

    throw new Error(`Unexpected value type: ${typeof value}`);
  },
});
