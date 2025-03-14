import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
  // Check if user is authenticated and is an admin
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mailboxId } = await req.json();

    // If mailboxId is provided, verify it exists and has auto-close enabled
    if (mailboxId) {
      const mailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, mailboxId),
        columns: {
          id: true,
          autoCloseEnabled: true,
        },
      });

      console.log(mailbox);

      if (!mailbox) {
        return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
      }

      if (!mailbox.autoCloseEnabled) {
        return NextResponse.json({ error: "Auto-close is not enabled for this mailbox" }, { status: 400 });
      }
    }

    // Trigger the auto-close job
    await inngest.send({
      name: "conversations/auto-close.check",
      data: {
        mailboxId: mailboxId ? Number(mailboxId) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Auto-close job triggered successfully",
    });
  } catch (error) {
    console.error("Error triggering auto-close job:", error);
    return NextResponse.json({ error: "Failed to trigger auto-close job" }, { status: 500 });
  }
}
