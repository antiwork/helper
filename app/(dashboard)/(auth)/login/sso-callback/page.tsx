import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback signUpForceRedirectUrl="/mailboxes" />;
}
