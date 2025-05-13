export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.modify",
];

export const GMAIL_PROVIDER_ID = "gmail";

export const GMAIL_AUTHORIZATION_PARAMS = {
  prompt: "consent",
  access_type: "offline",
  scope: GMAIL_SCOPES.join(" "),
  response_type: "code",
};

export const INVALID_SLACK_CREDENTIALS_ERROR = "invalidSlackCredentials";

export const GUMROAD_ROOT_USER_ID = 1;
export const GUMROAD_ROOT_USER_USERNAME = "gumroad";
export const GUMROAD_ROOT_USER_DEVELOPMENT_PASSWORD = "password";
