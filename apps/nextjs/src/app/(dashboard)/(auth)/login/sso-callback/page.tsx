import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default async function SSOCallback({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { popup } = await searchParams;
  return (
    <div className={popup ? "h-dvh bg-white" : ""}>
      <AuthenticateWithRedirectCallback signUpForceRedirectUrl={popup ? "/login/popup/complete" : "/mailboxes"} />
    </div>
  );
}
