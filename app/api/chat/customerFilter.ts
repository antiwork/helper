import { and, eq, isNull } from "drizzle-orm";
import { conversations } from "@/db/schema";
import { WidgetSessionPayload } from "@/lib/widgetSession";

export function getCustomerFilter(session: WidgetSessionPayload) {
  if (session.isAnonymous && session.anonymousSessionId) {
    return and(isNull(conversations.mergedIntoId), eq(conversations.anonymousSessionId, session.anonymousSessionId));
  } else if (session.email) {
    return and(isNull(conversations.mergedIntoId), eq(conversations.emailFrom, session.email));
  }
  return null;
}

export function getCustomerFilterForSearch(session: WidgetSessionPayload) {
  if (session.isAnonymous && session.anonymousSessionId) {
    return { anonymousSessionId: session.anonymousSessionId };
  } else if (session.email) {
    return { customer: [session.email] };
  }
  return null;
}
