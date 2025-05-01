export const matchesTransactionalEmailAddress = (email: string) => {
  const regex = /noreply@.*/;
  return regex.test(email);
};
