export const isValidEmailAddress = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);
