import { Redis } from "@upstash/redis";
import { env } from "@/env";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: Redis | undefined;
}

const redis =
  global.redisGlobal ??
  new Redis({
    url: env.KV_UPSTASH_KV_REST_API_URL,
    token: env.KV_UPSTASH_KV_REST_API_TOKEN,
  });

if (env.NODE_ENV !== "production") global.redisGlobal = redis;

export { redis };
