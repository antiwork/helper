import { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { topics } from "@/db/schema";
import { mailboxProcedure } from "./procedure";

export const topicsRouter = {
  all: mailboxProcedure.query(async ({ ctx }) => {
    return await db.query.topics.findMany({
      columns: {
        id: true,
        name: true,
        parentId: true,
      },
      where: eq(topics.mailboxId, ctx.mailbox.id),
      orderBy: [topics.parentId, topics.name],
    });
  }),
} satisfies TRPCRouterRecord;
