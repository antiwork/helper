import { customType } from "drizzle-orm/pg-core";
import { symmetricDecrypt, symmetricEncrypt } from "@/db/lib/crypto";
import { DjangoCryptoCompat } from "@/db/lib/djangoCrypto";
import { env } from "@/lib/env";

const secretKey = env.CRYPTO_SECRET;
const nativeEncryptColumnSecret = env.ENCRYPT_COLUMN_SECRET;
const djangoCrypto = new DjangoCryptoCompat(secretKey);

export const encryptedField = customType<{ data: string }>({
  dataType() {
    return "bytea";
  },

  toDriver(value: string): Buffer {
    return djangoCrypto.encrypt(value);
  },

  fromDriver(value: unknown): string {
    let bufferValue: Buffer;
    if (typeof value === "string") {
      bufferValue = Buffer.from(value.slice(2), "hex"); // Remove '\x' prefix
    } else if (Buffer.isBuffer(value)) {
      bufferValue = value;
    } else {
      throw new Error(`Unexpected value type: ${typeof value}`);
    }

    const decrypted = djangoCrypto.decrypt(bufferValue);
    return decrypted.toString("utf-8");
  },
});

export const nativeEncryptedField = customType<{ data: string }>({
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
