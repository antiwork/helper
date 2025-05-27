import { serve } from "inngest/next";
import { inngest as client } from "@/inngest/client";
import functions from "@/inngest/functions";

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client,
  functions,
  streaming: "allow",
});
