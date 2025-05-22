import { serve } from "inngest/next";
import { inngest as client } from "@/inngest/client";
import functions from "@/inngest/functions";
import { env } from "@/lib/env";

export const maxDuration = env.INNGEST_MAX_DURATION;

export const { GET, POST, PUT } = serve({
  client,
  functions,
  streaming: "allow",
});
