import { createHmac, timingSafeEqual } from "crypto";
import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";
import { cronJobs, eventJobs } from "@/inngest/functions";
import { EventData, EventName } from "@/inngest/utils";
import { env } from "@/lib/env";

const verifyHmac = (body: string, providedHmac: string): boolean => {
  try {
    const expectedHmac = createHmac("sha256", env.ENCRYPT_COLUMN_SECRET).update(body).digest("hex");
    return timingSafeEqual(Buffer.from(providedHmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    return false;
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const providedHmac = authHeader.slice(7);
    const body = await request.text();

    if (!verifyHmac(body, providedHmac)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = JSON.parse(body) as { event: EventName; job: string; data: EventData<EventName> } | { job: string };

    if ("event" in data) {
      const jobs = eventJobs[data.event].jobs;
      const handler = jobs[data.job as keyof typeof jobs] as (data: EventData<EventName>) => Promise<any>;
      if (!handler) {
        return new Response("Not found", { status: 404 });
      }
      waitUntil(handler(data.data));
    } else {
      const handler = Object.assign({}, ...Object.values(cronJobs))[data.job] as () => Promise<any>;
      if (!handler) {
        return new Response("Not found", { status: 404 });
      }
      waitUntil(handler());
    }

    return new Response("OK");
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
};
