import { eq } from "drizzle-orm";
import { conversations } from "@/db/schema";

export function getCustomerFilter(session: { isAnonymous: boolean; anonymousSessionId?: string; email?: string }) {
  if (session.isAnonymous && session.anonymousSessionId) {
    return eq(conversations.anonymousSessionId, session.anonymousSessionId);
  } else if (session.email) {
    return eq(conversations.customer, session.email);
  } else {
    return null;
  }
}

export function getCustomerFilterForSearch(session: { isAnonymous: boolean; anonymousSessionId?: string; email?: string }) {
  if (session.isAnonymous && session.anonymousSessionId) {
    return { anonymousSessionId: session.anonymousSessionId };
  } else if (session.email) {
    return { customer: [session.email] };
  } else {
    return null;
  }
}
