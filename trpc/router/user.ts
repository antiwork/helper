import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import appleSignin from "apple-signin-auth";
import { z } from "zod";
import { clerkClient } from "@/lib/data/user";
import { env } from "@/lib/env";
import { protectedProcedure, publicProcedure } from "../trpc";

export const userRouter = {
  getSupabaseJWT: protectedProcedure.query(async ({ ctx }) => {
    return jwt.sign(
      {
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        sub: ctx.session.userId,
        role: "authenticated",
      },
      env.SUPABASE_JWT_SECRET,
    );
  }),

  getSignInToken: protectedProcedure.query(async ({ ctx }) => {
    const signInToken = await clerkClient.signInTokens.createSignInToken({
      userId: ctx.session.userId,
      expiresInSeconds: 60 * 60 * 24,
    });
    return signInToken.token;
  }),

  nativeAppleSignIn: publicProcedure
    .input(z.object({ firstName: z.string(), lastName: z.string(), code: z.string() }))
    .mutation(async ({ input }) => {
      if (!env.APPLE_APP_ID || !env.APPLE_TEAM_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_PRIVATE_KEY_IDENTIFIER) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Apple sign in is not configured" });
      }

      const clientSecret = appleSignin.getClientSecret({
        clientID: env.APPLE_APP_ID,
        teamID: env.APPLE_TEAM_ID,
        privateKey: env.APPLE_PRIVATE_KEY,
        keyIdentifier: env.APPLE_PRIVATE_KEY_IDENTIFIER,
      });

      const tokenResponse = await appleSignin.getAuthorizationToken(input.code, {
        clientID: env.APPLE_APP_ID,
        clientSecret,
        redirectUri: "",
      });

      const idToken = await appleSignin.verifyIdToken(tokenResponse.id_token, {
        audience: env.APPLE_APP_ID,
      });

      const users = await clerkClient.users.getUserList({ emailAddress: [idToken.email] });

      let user = users.data[0];
      if (!user) {
        user = await clerkClient.users.createUser({
          emailAddress: [idToken.email],
          firstName: input.firstName || undefined,
          lastName: input.lastName || undefined,
        });
      }

      const signInToken = await clerkClient.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: 60 * 60 * 24,
      });
      return signInToken.token;
    }),
} satisfies TRPCRouterRecord;
