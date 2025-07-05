import { z } from "zod";
import { generateReadPageTool } from "@/lib/ai/readPageTool";
import { withWidgetAuth } from "../utils";

const requestSchema = z.object({
  pageHTML: z.string(),
  currentURL: z.string(),
});
export const POST = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: "Invalid request parameters" }, { status: 400 });
  }

  const { pageHTML, currentURL } = result.data;
  const readPageTool = await generateReadPageTool(pageHTML, currentURL, auth.session.email ?? "anonymous");

  return Response.json({ readPageTool });
});
