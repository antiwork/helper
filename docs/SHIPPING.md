## Building a "Magical Auto-Assign" Feature

This outlines the implementation of an auto-assign feature, focusing on the code changes required in the provided Next.js application.

**1. Database Schema:**

A new table is needed to store auto-assign rules. This table will integrate with the existing `mailboxes` and `topics` tables:

- `id` (serial, primary key)
- `mailboxId` (integer, references mailboxes table)
- `subtopicId` (integer, references subtopics table)
- `assignees` (text array, stores Clerk user IDs of assignees)
- `replyWithAIFirst` (boolean, default false)
- Note: Consider adding an index on `mailboxId` and `subtopicId` to improve query performance

Implementation steps:
1. Create a new file `src/db/schema/autoAssignRules.ts` with the table definition using integer references (not foreign keys) and `withTimestamps` helper
2. Run `npm run db:generate` to automatically generate the migration files
3. The migration will be created in the `drizzle` directory and can be reviewed before applying

**2. tRPC Endpoint:**

Create new tRPC endpoints for managing auto-assign rules within the `mailbox` router:

- `mailbox.autoAssignRules.create`: Creates a new rule. Input would be the rule details (leveraging existing subtopic IDs, assignees, AI reply toggle).
- `mailbox.autoAssignRules.list`: Lists existing rules for a mailbox, including subtopic details.
- `mailbox.autoAssignRules.update`: Updates an existing rule.
- `mailbox.autoAssignRules.delete`: Deletes a rule.

These endpoints will interact with the new database table and should be protected procedures. The files that would change include:

- `src/trpc/router/mailbox/index.ts`: Add the `autoAssignRules` router.
- `src/trpc/router/mailbox/autoAssignRules.ts`: Implement the new endpoints.

**3. Server-Side Logic (Trigger Points):**

The auto-assign system needs to be triggered at several key moments:

1. New Email Conversations:
   - In `handleGmailWebhookEvent` when a new conversation is created
   - Use existing subtopic detection to classify and apply rules

2. Chat that requests human support:
   - When a chat conversation requests human support and becomes an open conversation
   - Trigger point: `handleChatHumanSupportRequested` event

Implementation in each trigger point:

```typescript
async function applyAutoAssignRules(conversation: Conversation) {
  const rules = await db.query.autoAssignRules.findMany({
    where: eq(autoAssignRules.mailboxId, conversation.mailboxId),
  });

  const matchingRule = rules.find(rule => 
    rule.subtopicId === conversation.subtopicId
  );

  if (matchingRule) {
    await db.update(conversations)
      .set({ assignedToUserIds: matchingRule.assignees })
      .where(eq(conversations.id, conversation.id));

    if (matchingRule.replyWithAIFirst) {
      // Trigger AI response flow
    }

    // Notify assignees via Slack if enabled
  }
}
```

Relevant files:
- `src/inngest/functions/handleGmailWebhookEvent.ts`
- `src/inngest/functions/handleChatHumanSupportRequested.ts`
- `src/inngest/functions/handleConversationReopened.ts`
- `src/inngest/functions/handleConversationSubtopicUpdated.ts`

**4. Subtopic Integration:**

Since conversations already have topics assigned:
- Focus auto-assign rules on subtopics for more granular control
- Leverage the existing subtopic detection and classification system
- Ensure UI displays the full topic > subtopic hierarchy
- Consider adding subtopic-based filters or sorting in the auto-assign rules list

**5. Frontend UI (Settings Page):**

A new section on the mailbox settings page is required to manage auto-assign rules. This will be implemented as a new tab in the mailbox settings area, similar to other mailbox configuration sections:

Settings UI Components:
- Create a new `AutoAssignSettings` component in `src/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/autoAssignSettings.tsx`
- Add the component to the settings tabs in `settings.tsx`

The Auto-Assign Settings should include:

1. Rules Management Table:
   - Display existing rules in a table format with columns for:
     - Topic > Subtopic (using existing topic/subtopic picker)
     - Assignees (multi-select of team members)
     - AI First Reply toggle
     - Actions (edit/delete)
   - Sort rules by creation date or topic/subtopic
   - Filter rules by topic, subtopic, or assignee

2. Rule Creation/Edit Form:
   - Topic selector (using existing topic picker component)
   - Team member multi-select (reuse existing team member selector)
   - Toggle for AI First Reply
   - Validation to ensure required fields are filled

3. Empty State:
   - Show helpful onboarding content when no rules exist
   - Quick-start guide for creating first rule
   - Example use cases

This involves changes to:
- `src/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/settings.tsx`: Add new auto-assign tab
- `src/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/autoAssignSettings.tsx`: New component for auto-assign configuration
- Create reusable components for rule form and table in `src/components/settings/autoAssign/`

**Example Implementation (Partial):**

```typescript
// src/inngest/functions/handleGmailWebhookEvent.ts (simplified)
// ... existing code ...
const rules = await db.query.autoAssignRules.findMany({
    where: eq(autoAssignRules.mailboxId, mailbox.id),
  });

for (const message of messages) {
  // ... existing message handling ...

  const topic = await detectTopic(parsedEmail, mailbox);

  const matchingRule = rules.find(rule => rule.topicId === topic?.id);
  if (matchingRule) {
    await db.update(conversations)
      .set({ assignedToUserIds: matchingRule.assignees })
      .where(eq(conversations.id, conversation.id));

    if (matchingRule.replyWithAIFirst) {
      // Trigger AI response flow
    }

    // Notify assignees via Slack if enabled
  }

  // ... rest of the existing code ...
}
```

This is a high-level overview.  Specific implementation details may vary, but this should provide a solid starting point for building the auto-assign feature.
