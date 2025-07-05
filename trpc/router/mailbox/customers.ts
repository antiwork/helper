import { TRPCRouterRecord } from "@trpc/server";
import { and, asc, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { platformCustomers } from "@/db/schema";
import { mailboxProcedure } from "./procedure";

export const customersRouter = {
  list: mailboxProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.query.platformCustomers.findMany({
        where: and(...(input.search ? [ilike(platformCustomers.email, `%${input.search}%`)] : [])),
        columns: {
          id: true,
          email: true,
        },
        orderBy: asc(platformCustomers.email),
        limit: 20,
      });
    }),
} satisfies TRPCRouterRecord;
