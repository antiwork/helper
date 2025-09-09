import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { setupMailboxForNewUser } from "@/lib/auth/authService";
import { cacheFor } from "@/lib/cache";
import OtpEmail from "@/lib/emails/otp";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createAdminClient } from "@/lib/supabase/server";
import { protectedProcedure, publicProcedure } from "../trpc";

const safeToSendBackOTP = !env.VERCEL && env.AUTH_URL === "https://helperai.dev";

export const userRouter = {
  startSignIn: publicProcedure.input(z.object({ email: z.string() })).mutation(async ({ input }) => {
    const [user] = await db
      .select({ id: authUsers.id, email: authUsers.email, deletedAt: userProfiles.deletedAt })
      .from(authUsers)
      .innerJoin(userProfiles, eq(authUsers.id, userProfiles.id))
      .where(and(eq(authUsers.email, input.email), isNull(userProfiles.deletedAt)));

    if (!user) {
      if (isSignupPossible(input.email)) {
        return { signupPossible: true };
      }

      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const { data, error } = await createAdminClient().auth.admin.generateLink({
      type: "recovery",
      email: user.email ?? "",
    });
    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate OTP",
      });
    }

    if (env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS) {
      const resend = new Resend(env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS,
        to: assertDefined(user.email),
        subject: `Your OTP for Helper: ${data.properties.email_otp}`,
        react: OtpEmail({ otp: data.properties.email_otp }),
      });
      if (error) {
        captureExceptionAndLog(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send OTP: ${error.message}`,
        });
      }
      return { email: true };
    }

    await cacheFor<string>(`otp:${user.id}`).set(data.properties.email_otp.toString(), 60 * 5);
    let dashboardUrl: string | null = null;
    const [_, projectId] = /https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/.exec(env.NEXT_PUBLIC_SUPABASE_URL) ?? [];
    if (projectId) {
      const {
        rows: [cacheTable],
      } = await db.execute(sql`
        SELECT c.oid AS id
        FROM pg_class c
        JOIN pg_namespace nc ON nc.oid = c.relnamespace
        WHERE c.relname = 'cache' AND nc.nspname = 'public'
      `);
      dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/editor/${cacheTable?.id}?filter=key:eq:otp:${user.id}`;
    }
    return { email: false, dashboardUrl, otp: safeToSendBackOTP ? data.properties.email_otp : undefined };
  }),
  createUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        displayName: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isSignupPossible(input.email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Signup is not possible for this email domain",
        });
      }

      const supabase = createAdminClient();
      const { error } = await supabase.auth.admin.createUser({
        email: input.email,
        user_metadata: {
          display_name: input.displayName,
        },
      });
      if (error) throw error;

      return { success: true };
    }),
  onboard: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        displayName: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const existingMailbox = await db.query.mailboxes.findFirst({
        columns: { id: true },
      });

      if (existingMailbox) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A mailbox already exists. Please use the login form instead.",
        });
      }

      const supabase = createAdminClient();
      const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
        email: input.email,
        user_metadata: {
          display_name: input.displayName,
          permissions: "admin",
        },
        email_confirm: true,
      });

      if (createUserError) throw createUserError;
      if (!userData.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      await setupMailboxForNewUser(userData.user);

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: userData.user.email ?? "",
      });

      if (linkError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate OTP",
        });
      }

      return {
        otp: linkData.properties.email_otp,
      };
    }),

  currentUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const userId = ctx.user.id;

    const [user] = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        displayName: userProfiles.displayName,
        permissions: userProfiles.permissions,
        preferences: userProfiles.preferences,
      })
      .from(authUsers)
      .innerJoin(userProfiles, eq(authUsers.id, userProfiles.id))
      .where(eq(authUsers.id, userId));

    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return user;
  }),

  update: protectedProcedure
    .input(
      z.object({
        preferences: z
          .object({
            confetti: z.boolean().optional(),
            disableNextTicketPreview: z.boolean().optional(),
            autoAssignOnReply: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const [currentProfile] = await db.select().from(userProfiles).where(eq(userProfiles.id, ctx.user.id));
      if (!currentProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User profile not found" });
      }

      await db
        .update(userProfiles)
        .set({ preferences: { ...currentProfile.preferences, ...input.preferences } })
        .where(eq(userProfiles.id, ctx.user.id));
    }),
} satisfies TRPCRouterRecord;

const isSignupPossible = (email: string) => {
  const [_, emailDomain] = email.split("@");
  if (emailDomain && env.EMAIL_SIGNUP_DOMAINS.some((domain) => domain === emailDomain)) {
    return true;
  }
  return false;
};
