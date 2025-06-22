export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.modify",
];

export const GMAIL_AUTHORIZATION_PARAMS = {
  prompt: "consent",
  access_type: "offline",
  scope: GMAIL_SCOPES.join(" "),
  response_type: "code",
};
