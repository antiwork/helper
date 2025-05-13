import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { appRouter, type AppRouter } from "./root";
import { createCallerFactory, createTRPCContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);
type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

// The `api` package should only be a production dependency in the Next.js application where it's served.
// All other apps should only add the api package as a dev dependency.
// This allows us to have full typesafety while not leaking backend code to client applications.
export { createTRPCContext, appRouter, createCaller };
export type { AppRouter, RouterInputs, RouterOutputs };
