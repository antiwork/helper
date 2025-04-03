import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";

const isAuthenticatedRoute = createRouteMatcher(["/mailboxes(.*)", "/dashboard(.*)", "/desktop/signed-out(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isAuthenticatedRoute(request)) {
      await auth.protect();
    }
    const { userId } = await auth();
    Sentry.setUser({ id: userId ?? undefined });
  },
  {
    afterSignUpUrl: "/mailboxes",
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
