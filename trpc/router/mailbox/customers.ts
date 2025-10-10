import { TRPCRouterRecord } from "@trpc/server";
import { and, asc, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { platformCustomers } from "@/db/schema";
import { addCustomerNote, deleteCustomerNote, getCustomerNotes, updateCustomerNote } from "@/lib/data/customerNote";
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

  notes: {
    list: mailboxProcedure
      .input(
        z.object({
          email: z.string(),
        }),
      )
      .query(async ({ input }) => {
        return await getCustomerNotes(input.email);
      }),

    add: mailboxProcedure
      .input(
        z.object({
          email: z.string(),
          message: z.string(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const note = await addCustomerNote({
          email: input.email,
          message: input.message,
          user: ctx.user,
        });
        return { id: note.id };
      }),

    update: mailboxProcedure
      .input(
        z.object({
          noteId: z.number(),
          message: z.string().min(1),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const updatedNote = await updateCustomerNote({
          noteId: input.noteId,
          message: input.message,
          userId: ctx.user.id,
        });
        return { id: updatedNote.id };
      }),

    delete: mailboxProcedure
      .input(
        z.object({
          noteId: z.number(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await deleteCustomerNote({
          noteId: input.noteId,
          userId: ctx.user.id,
        });
        return { success: true };
      }),
  },
} satisfies TRPCRouterRecord;
