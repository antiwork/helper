// Use crypto that works in both Node.js and browser environments
const getCrypto = () => {
  // Browser environment
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  // Node.js environment
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  // Fallback for older Node.js versions
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    if (crypto.webcrypto) {
      return crypto.webcrypto;
    }
    // Create a wrapper that implements getRandomValues using Node.js crypto
    return {
      getRandomValues: (array: Uint8Array) => {
        const randomBytes = crypto.randomBytes(array.length);
        array.set(randomBytes);
        return array;
      },
    };
  } catch {
    throw new Error("Crypto not available in this environment");
  }
};

export const generateSlug = () => {
  const SLUG_LENGTH = 32;
  const BYTE_LENGTH = SLUG_LENGTH / 2;

  const array = new Uint8Array(BYTE_LENGTH);
  const crypto = getCrypto();
  crypto.getRandomValues(array);

  return Array.from(array, (byte) => byte.toString(BYTE_LENGTH).padStart(2, "0")).join("");
};
