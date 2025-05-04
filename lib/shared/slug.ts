export const generateSlug = () => {
  const SLUG_LENGTH = 32;
  const BYTE_LENGTH = SLUG_LENGTH / 2;

  const array = new Uint8Array(BYTE_LENGTH);
  crypto.getRandomValues(array);

  return Array.from(array, (byte) => byte.toString(BYTE_LENGTH).padStart(2, "0")).join("");
};
