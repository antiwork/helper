import { ClerkProvider } from "@clerk/nextjs";
import { auth, currentUser, User } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SetActiveOrganization } from "@/app/(dashboard)/mailboxes/setActiveOrganization";
import { assertDefined } from "@/components/utils/assert";
import { createOrganization, getOrganizationMemberships } from "@/lib/data/organization";
import { api } from "@/trpc/server";

const getMailboxUrl = async (user: User, orgId: string) => {
  const mailboxes = await api.mailbox.list();
  if (mailboxes.find(({ slug }) => slug === user.unsafeMetadata.lastMailboxSlug))
    return `/mailboxes/${user.unsafeMetadata.lastMailboxSlug}/mine`;
  else if (mailboxes[0]) return `/mailboxes/${mailboxes[0].slug}/mine`;
  throw new Error("No mailbox found");
};

const Page = async () => {
  const { userId, orgId } = await auth();
  if (!userId) return redirect("/login");

  const user = assertDefined(await currentUser());

  if (orgId) {
    const mailboxUrl = await getMailboxUrl(user, orgId);
    return redirect(mailboxUrl);
  }

  const memberships = await getOrganizationMemberships(userId);
  if (memberships.data[0]) {
    return (
      <ClerkProvider dynamic>
        <SetActiveOrganization id={memberships.data[0].organization.id} />
      </ClerkProvider>
    );
  }

  const organization = await createOrganization(user);
  return (
    <ClerkProvider dynamic>
      <SetActiveOrganization id={organization.id} />
    </ClerkProvider>
  );
};

export default Page;
