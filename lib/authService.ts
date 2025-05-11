import { api } from "@/trpc/server";

type GmailSupportEmailInfo = {
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
};

export async function connectSupportEmail(mailboxSlug: string, properties: GmailSupportEmailInfo) {
  return await api.gmailSupportEmail.create({
    mailboxSlug,
    email: properties.email,
    accessToken: properties.access_token,
    refreshToken: properties.refresh_token,
    expiresAt: properties.expires_at,
  });
}
