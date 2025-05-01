import { Organization, User } from "@clerk/nextjs/server";
import { createTRPCContext } from "@/trpc";
import { createTestAuthSession } from "./authUtils";

export const createTestTRPCContext = (user: User, organization: Organization) =>
  createTRPCContext({
    session: createTestAuthSession(user, organization),
    headers: new Headers({
      "x-trpc-source": "test",
    }),
  });
