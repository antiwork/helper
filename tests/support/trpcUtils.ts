import { assertDefined } from "@/components/utils/assert";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getProfile } from "@/lib/data/user";
import { createTRPCContext } from "@/trpc";

export const createTestTRPCContext = async (user: typeof authUsers.$inferSelect) =>
  createTRPCContext({
    user: await createTestAuthUser(user),
    headers: new Headers({
      "x-trpc-source": "test",
    }),
  });

const createTestAuthUser = async (user: typeof authUsers.$inferSelect) => {
  return {
    email: user.email,
    ...assertDefined(await getProfile(user.id)),
  };
};
