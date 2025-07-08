import { google } from "googleapis";
import { getBaseUrl } from "@/components/constants";
import { GMAIL_AUTHORIZATION_PARAMS } from "@/lib/auth/constants";
import { env } from "@/lib/env";

export const auth = new google.auth.OAuth2({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${getBaseUrl()}/api/connect/google/callback`,
});

export const connectSupportEmailUrl = () => {
  const auth = new google.auth.OAuth2({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${getBaseUrl()}/api/connect/google/callback`,
  });
  return auth.generateAuthUrl({
    ...GMAIL_AUTHORIZATION_PARAMS,
  });
};
