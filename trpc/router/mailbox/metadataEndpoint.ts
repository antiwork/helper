import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { DataError } from "@/lib/data/dataError";
import {
  createMailboxMetadataApi,
  deleteMailboxMetadataApi,
  testMailboxMetadataApiURL,
} from "@/lib/data/mailboxMetadataApi";
import { mailboxProcedure } from "./procedure";

export const metadataEndpointRouter = {
  create: mailboxProcedure.input(z.object({ url: z.string().url() })).mutation(async ({ ctx, input: { url } }) => {
    try {
      await createMailboxMetadataApi({ url });
      return { success: true, error: undefined };
    } catch (e) {
      return { success: false, error: e instanceof DataError ? e.message : "Error adding metadata endpoint" };
    }
  }),
  delete: mailboxProcedure.mutation(async ({ ctx }) => {
    try {
      await deleteMailboxMetadataApi();
      return { success: true, error: undefined };
    } catch (e) {
      return { success: false, error: e instanceof DataError ? e.message : "Error deleting metadata endpoint" };
    }
  }),
  test: mailboxProcedure.query(async ({ ctx }) => {
    try {
      await testMailboxMetadataApiURL();
      return { success: true, error: undefined };
    } catch (e) {
      return { success: false, error: e instanceof DataError ? e.message : "Error testing metadata endpoint" };
    }
  }),
} satisfies TRPCRouterRecord;
