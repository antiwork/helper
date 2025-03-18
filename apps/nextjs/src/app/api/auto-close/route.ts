import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mailboxId } = await req.json();

    if (mailboxId) {
      const mailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, mailboxId),
        columns: {
          id: true,
          autoCloseEnabled: true,
        },
      });

      if (!mailbox) {
        return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
      }

      if (!mailbox.autoCloseEnabled) {
        return NextResponse.json({ error: "Auto-close is not enabled for this mailbox" }, { status: 400 });
      }
    }

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
