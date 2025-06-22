export const isValidEmailAddress = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);

/**
 * @example
 * // "1@test.com, 2@test.com" -> ["1@test.com", "2@test.com"]
 * const emails = parseEmailList("1@test.com, 2@test.com");
 */
export const parseEmailList = (list: string) =>
  list
    .trim()
    .replace(/\s/g, "")
    .split(",")
    .filter(Boolean)
    .map((emailAdress) => emailAdress.trim());
