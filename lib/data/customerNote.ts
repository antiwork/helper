import { and, desc, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { BasicUserProfile } from "@/db/schema";
import { customerNotes } from "@/db/schema/customerNotes";

export const addCustomerNote = async ({
  email,
  message,
  user,
}: {
  email: string;
  message: string;
  user: BasicUserProfile;
}) => {
  const note = await db
    .insert(customerNotes)
    .values({
      email,
      body: message,
      userId: user.id,
    })
    .returning()
    .then(takeUniqueOrThrow);

  return note;
};

export const updateCustomerNote = async ({
  noteId,
  message,
  userId,
}: {
  noteId: number;
  message: string;
  userId: string;
}) => {
  const [updatedNote] = await db
    .update(customerNotes)
    .set({
      body: message,
      updatedAt: new Date(),
    })
    .where(and(eq(customerNotes.id, noteId), eq(customerNotes.userId, userId)))
    .returning();

  if (!updatedNote) {
    throw new Error("Note not found or unauthorized");
  }

  return updatedNote;
};

export const deleteCustomerNote = async ({ noteId, userId }: { noteId: number; userId: string }) => {
  const [deletedNote] = await db
    .delete(customerNotes)
    .where(and(eq(customerNotes.id, noteId), eq(customerNotes.userId, userId)))
    .returning();

  if (!deletedNote) {
    throw new Error("Note not found or unauthorized");
  }

  return deletedNote;
};

export const getCustomerNotes = async (email: string) => {
  return await db.query.customerNotes.findMany({
    where: eq(customerNotes.email, email),
    orderBy: desc(customerNotes.createdAt),
  });
};
