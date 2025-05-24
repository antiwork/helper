import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { authUsers } from "@/db/supabaseSchema/auth";
import { cacheFor } from "@/lib/cache";
import { OtpEmail } from "@/lib/emails/otp";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { publicProcedure } from "../trpc";

export const userRouter = {
  startSignIn: publicProcedure.input(z.object({ email: z.string() })).mutation(async ({ input }) => {
    const user = await db.query.authUsers.findFirst({
      where: eq(authUsers.email, input.email),
    });
    if (!user) {
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

    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: assertDefined(user.email),
        subject: "Your OTP for Helper",
        react: await OtpEmail({ otp: data.properties.email_otp }),
      });
      return { email: true };
    }

    await cacheFor<string>(`otp:${user.id}`).set(data.properties.email_otp.toString(), 60 * 5);
    let dashboardUrl: string | null = null;
    const [_, projectId] = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/) ?? [];
    if (projectId) {
      const {
        rows: [cacheTable],
      } = await db.execute(sql`
        SELECT c.oid AS id
        FROM pg_class c
        JOIN pg_namespace nc on nc.oid = c.relnamespace
        WHERE c.relname = 'cache' and nc.nspname = 'public'
      `);
      dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/editor/${cacheTable?.id}?filter=key:eq:otp:${user.id}`;
    }
    return { email: false, dashboardUrl, otp: env.NODE_ENV === "development" ? data.properties.email_otp : undefined };
  }),
} satisfies TRPCRouterRecord;
