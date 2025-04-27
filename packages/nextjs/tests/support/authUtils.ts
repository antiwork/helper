import { auth, Organization, User } from "@clerk/nextjs/server";

export const createTestAuthSession = (user: User, organization: Organization): Awaited<ReturnType<typeof auth>> => {
  return {
    userId: user.id,
    sessionId: "test-session-id",
    sessionClaims: {
      __raw: "",
      iss: "",
      sub: "",
      sid: "",
      aud: "",
      exp: 0,
      iat: 0,
      nbf: 0,
    },
    actor: undefined,
    orgId: organization.id,
    orgRole: "org:admin",
    orgSlug: organization.slug ?? undefined,
    orgPermissions: [],
    getToken: () => Promise.resolve(""),
    has: () => false,
    debug: () => ({}),
    factorVerificationAge: null,
    redirectToSignIn: () => {
      throw new Error("Not implemented");
    },
  };
};
