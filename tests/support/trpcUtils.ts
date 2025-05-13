import { User } from "@supabase/supabase-js";
import { authUsers } from "@/db/schema";
import { createTRPCContext } from "@/trpc";

export const createTestTRPCContext = (user: typeof authUsers.$inferSelect) =>
  createTRPCContext({
    user: createTestAuthUser(user),
    headers: new Headers({
      "x-trpc-source": "test",
    }),
  });

const createTestAuthUser = (user: typeof authUsers.$inferSelect): User => {
  return {
    id: user.id,
    email: user.email ?? undefined,
    user_metadata: user.user_metadata ?? {},
    app_metadata: {},
    aud: "authenticated",
    created_at: user.created_at?.toISOString() ?? new Date().toISOString(),
  };
};
