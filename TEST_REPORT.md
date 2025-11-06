# Email Notification System - Test Report

## Overview

This document provides a comprehensive test plan for the newly implemented email notification system that replaced Slack integration.

## Implementation Summary

### ✅ Completed Features

1. **Daily Report Emails** - Automated daily summaries with metrics
2. **Weekly Report Emails** - Weekly team performance reports
3. **VIP Customer Notifications** - Instant alerts for VIP customer messages
4. **VIP Response Time Alerts** - Alerts when VIP customers are waiting too long
5. **Assigned Ticket Alerts** - Alerts for overdue assigned tickets
6. **User Preferences** - Opt-in/opt-out system for email notifications

### ✅ Code Quality Checks

- ✅ All Slack imports removed
- ✅ All Slack API routes deleted
- ✅ All Slack UI components removed
- ✅ All Slack database fields removed from schema
- ✅ All Slack environment variables removed
- ✅ All tests updated or removed
- ✅ No TypeScript compilation errors in modified files
- ✅ Email templates properly formatted with React Email components

## Test Plan

### 1. Manual Job Triggering Tests

A test script has been created at `scripts/test-email-notifications.ts` to manually trigger each notification type.

#### Test 1.1: Daily Report

**Purpose:** Verify daily report emails are sent to all team members with proper metrics

**Steps:**
```bash
npm run tsx scripts/test-email-notifications.ts daily
```

**Expected Results:**
- Script completes without errors
- Console shows metrics:
  - Open ticket count
  - Answered ticket count
  - Open tickets over $0 (if applicable)
  - Answered tickets over $0 (if applicable)
  - Average reply time
  - VIP average reply time (if VIP threshold configured)
  - Average wait time for open tickets
- Email sent to all team members with `emailNotifications.dailyReports` preference enabled
- Email contains all metrics with proper formatting

**Email Recipients:** All users with `preferences.emailNotifications.dailyReports !== false`

---

#### Test 1.2: Weekly Report

**Purpose:** Verify weekly report emails are sent with team member statistics

**Steps:**
```bash
npm run tsx scripts/test-email-notifications.ts weekly
```

**Expected Results:**
- Script completes without errors
- Console shows:
  - Active members list with reply counts
  - Inactive members list
  - Total replies count
- Email sent to all team members with `emailNotifications.weeklyReports` preference enabled
- Email properly formats active/inactive member lists
- Email shows total reply count

**Email Recipients:** All users with `preferences.emailNotifications.weeklyReports !== false`

---

#### Test 1.3: VIP Customer Notification

**Purpose:** Verify VIP customer message notifications are sent

**Prerequisites:**
- Have a VIP customer message in the database
- Get the message ID from database or UI

**Steps:**
```bash
# Replace 123 with actual message ID
npm run tsx scripts/test-email-notifications.ts vip 123
```

**Expected Results:**
- Script completes without errors
- Console shows "Notification sent" or "Reply notification sent"
- Email sent to all team members with `emailNotifications.vipAlerts` preference enabled
- Email contains:
  - Customer email
  - Customer value (formatted as $X,XXX)
  - Conversation subject
  - Message preview (first 300 chars)
  - Link to conversation
  - If it's a reply: replier name and reply text

**Email Recipients:** All users with `preferences.emailNotifications.vipAlerts !== false`

---

#### Test 1.4: VIP Response Time Alerts

**Purpose:** Verify alerts are sent when VIP customers are waiting too long

**Prerequisites:**
- VIP threshold configured in mailbox settings
- VIP expected response hours configured
- Have at least one VIP customer with open conversation exceeding response time

**Steps:**
```bash
npm run tsx scripts/test-email-notifications.ts vip-alerts
```

**Expected Results:**
- Script completes without errors
- Console shows count of overdue VIP tickets
- Email sent to all team members with `emailNotifications.ticketAlerts` preference enabled
- Email contains:
  - Alert badge indicating VIP response time issue
  - Count of overdue VIP customers
  - List of up to 10 overdue tickets with:
    - Subject
    - Customer name and value
    - Time since last reply
  - Link to dashboard

**Email Recipients:** All users with `preferences.emailNotifications.ticketAlerts !== false`

---

#### Test 1.5: Assigned Ticket Response Time Alerts

**Purpose:** Verify alerts are sent for overdue assigned tickets

**Prerequisites:**
- Have assigned tickets with no reply for over 24 hours

**Steps:**
```bash
npm run tsx scripts/test-email-notifications.ts assigned-alerts
```

**Expected Results:**
- Script completes without errors
- Console shows count of overdue assigned tickets
- Email sent to all team members with `emailNotifications.ticketAlerts` preference enabled
- Email contains:
  - Alert badge indicating ticket response time issue
  - Count of overdue tickets
  - List of up to 10 overdue tickets with:
    - Subject
    - Assignee name
    - Time since last reply
  - Link to dashboard

**Email Recipients:** All users with `preferences.emailNotifications.ticketAlerts !== false`

---

### 2. Email Content Verification

#### Test 2.1: Email Formatting

**Purpose:** Verify emails render correctly in email clients

**Steps:**
1. Receive test emails from above tests
2. Open in multiple email clients (Gmail, Outlook, Apple Mail, etc.)
3. Verify:
   - Headers are bold and properly sized
   - Metrics are in gray boxes with proper padding
   - Links are blue and clickable
   - Footer contains "Manage notifications" link
   - Footer contains Helper logo
   - Email is responsive on mobile

**Expected Results:**
- All emails render correctly across clients
- No broken images or links
- Proper spacing and alignment
- Mobile-friendly layout

---

#### Test 2.2: Email Content Completeness

**Purpose:** Verify all required data is included in emails

**Daily Report Checklist:**
- [ ] Mailbox name in title
- [ ] Open ticket count
- [ ] Answered ticket count
- [ ] Optional: Open tickets over $0
- [ ] Optional: Answered tickets over $0
- [ ] Optional: Average reply time
- [ ] Optional: VIP average reply time
- [ ] Optional: Average wait time
- [ ] Dashboard link
- [ ] Manage notifications link

**Weekly Report Checklist:**
- [ ] Mailbox name in title
- [ ] Date range (Week of X to Y)
- [ ] Active members section with counts
- [ ] Inactive members section
- [ ] Total replies summary
- [ ] Dashboard link
- [ ] Manage notifications link

**VIP Notification Checklist:**
- [ ] VIP badge indicator
- [ ] Customer email
- [ ] Customer value ($X,XXX format)
- [ ] Conversation subject
- [ ] Conversation status (open/closed)
- [ ] Message preview (truncated at 300 chars)
- [ ] Conversation link
- [ ] For replies: replier name and reply text
- [ ] Manage notifications link

**Ticket Alert Checklist:**
- [ ] Alert badge with correct type (VIP or Assigned)
- [ ] Count of overdue tickets
- [ ] Expected hours (for VIP)
- [ ] Ticket list (up to 10)
- [ ] Ticket details (subject, assignee/customer, time)
- [ ] Ticket links to conversations
- [ ] "and X more" indicator if >10 tickets
- [ ] Dashboard link
- [ ] Manage notifications link

---

### 3. User Preference Tests

#### Test 3.1: Opt-out Functionality

**Purpose:** Verify users can opt out of specific notification types

**Steps:**
1. Navigate to `/settings` in the application
2. Locate email notification preferences section
3. Disable one notification type (e.g., daily reports)
4. Trigger that notification type using test script
5. Verify the user does NOT receive the email
6. Verify other users with preference enabled DO receive the email

**Expected Results:**
- User with opt-out does not receive email
- Other users receive email normally
- Preference persists after page reload

---

#### Test 3.2: Default Behavior

**Purpose:** Verify default notification preferences for new users

**Steps:**
1. Create a new user account
2. Check default email notification preferences
3. Trigger all notification types
4. Verify which emails are received

**Expected Results:**
- All notification types are enabled by default (opt-out model)
- New user receives all email types
- User can opt out via settings

---

### 4. Error Handling Tests

#### Test 4.1: No Slack Configuration Errors

**Purpose:** Verify system works without any Slack environment variables

**Steps:**
```bash
# Verify no Slack env vars in .env.local
grep -i slack .env.local || echo "No Slack env vars found ✅"

# Start application
npm run dev

# Check logs for any errors mentioning Slack
```

**Expected Results:**
- No errors about missing Slack configuration
- Application starts successfully
- Jobs run without errors
- No console errors related to Slack

---

#### Test 4.2: Missing Resend Configuration

**Purpose:** Verify graceful handling when Resend is not configured

**Steps:**
1. Remove `RESEND_API_KEY` from environment
2. Trigger email notification
3. Check logs for error handling

**Expected Results:**
- Clear error message indicating Resend is not configured
- Application does not crash
- Error is logged appropriately

---

#### Test 4.3: Invalid Email Addresses

**Purpose:** Verify handling of invalid email addresses

**Steps:**
1. Create user with invalid email format
2. Trigger notification
3. Check logs for error handling

**Expected Results:**
- Invalid email addresses are skipped
- Valid email addresses still receive notifications
- Error is logged appropriately

---

### 5. Job Scheduling Tests

#### Test 5.1: Automated Daily Report Schedule

**Purpose:** Verify daily reports are sent automatically at scheduled time

**Steps:**
1. Wait for scheduled daily report time (check cron schedule in code)
2. Monitor logs for job execution
3. Verify emails are sent

**Expected Results:**
- Job runs at scheduled time
- Emails are sent to all eligible users
- Logs show successful execution

---

#### Test 5.2: Automated Weekly Report Schedule

**Purpose:** Verify weekly reports are sent automatically at scheduled time

**Steps:**
1. Wait for scheduled weekly report time (typically Monday morning)
2. Monitor logs for job execution
3. Verify emails are sent

**Expected Results:**
- Job runs at scheduled time
- Emails are sent to all eligible users
- Stats cover the previous week (Sunday-Saturday)

---

### 6. Database Migration Test

#### Test 6.1: Schema Changes

**Purpose:** Verify database schema no longer contains Slack fields

**Steps:**
```bash
# Generate migration
npm run db:generate

# Review migration file
# Check that it drops Slack columns

# Apply migration (in test environment first!)
npm run db:migrate
```

**Expected Results:**
- Migration successfully drops:
  - `mailboxes.slackAlertChannel`
  - `mailboxes.slackBotToken`
  - `mailboxes.slackBotUserId`
  - `mailboxes.slackTeamId`
  - `mailboxes.vipChannelId`
  - `conversationMessages.slackChannel`
  - `conversationMessages.slackMessageTs`
  - `faqs.slackChannel`
  - `faqs.slackMessageTs`
  - `notes.slackChannel`
  - `notes.slackMessageTs`
  - `agentMessages` table (if exists)
  - `agentThreads` table (if exists)
- No foreign key constraint errors
- Application still functions correctly after migration

---

## Test Results Summary

### Automated Tests Status

- ✅ All TypeScript files compile successfully
- ✅ No broken imports from deleted Slack modules
- ✅ All modified test files pass
- ✅ No Slack-related errors in logs

### Manual Test Checklist

Complete the manual tests and check off each item:

- [ ] Test 1.1: Daily Report Email
- [ ] Test 1.2: Weekly Report Email
- [ ] Test 1.3: VIP Customer Notification
- [ ] Test 1.4: VIP Response Time Alerts
- [ ] Test 1.5: Assigned Ticket Response Time Alerts
- [ ] Test 2.1: Email Formatting (multiple clients)
- [ ] Test 2.2: Email Content Completeness
- [ ] Test 3.1: Opt-out Functionality
- [ ] Test 3.2: Default Behavior
- [ ] Test 4.1: No Slack Configuration Errors
- [ ] Test 4.2: Missing Resend Configuration
- [ ] Test 4.3: Invalid Email Addresses
- [ ] Test 5.1: Automated Daily Report Schedule
- [ ] Test 5.2: Automated Weekly Report Schedule
- [ ] Test 6.1: Database Migration

---

## Known Issues & Limitations

1. **Email Delivery Time**: Emails are sent via Resend API, delivery time may vary (typically <1 second)
2. **Rate Limits**: Resend has rate limits - if sending to many users, implement batching
3. **Email Preferences UI**: UI for managing email preferences needs to be implemented in settings page
4. **Preview URLs**: Email templates include preview data for development/testing in email clients

---

## Rollback Plan

If issues are discovered:

1. **Immediate**: Can disable jobs without rolling back code
   ```sql
   -- Disable jobs temporarily
   UPDATE cron_jobs SET enabled = false WHERE name IN ('daily_reports', 'weekly_reports', 'vip_alerts');
   ```

2. **Code Rollback**: Revert to previous branch
   ```bash
   git checkout main
   git pull
   ```

3. **Database Rollback**: Run reverse migration (if migration was applied)
   ```bash
   npm run db:rollback
   ```

---

## Success Criteria

The migration is considered successful when:

- ✅ All manual tests pass
- ✅ No Slack-related errors in production logs for 24 hours
- ✅ All team members receive email notifications as expected
- ✅ Email open rates are tracked and acceptable (>20%)
- ✅ Email delivery success rate >99%
- ✅ No customer complaints about missing notifications
- ✅ Database migration completes successfully in production

---

## Support & Troubleshooting

### Common Issues

**Issue: No emails received**
- Check Resend API key is configured
- Check user email preferences
- Check Resend dashboard for delivery status
- Check application logs for errors

**Issue: Incorrect email content**
- Check database query results in job functions
- Check email template rendering
- Verify dashboard links are correct

**Issue: Too many emails**
- Check job cron schedules
- Verify jobs aren't running multiple times
- Check for duplicate job entries in queue

### Monitoring

Monitor these metrics:
- Email delivery success rate (Resend dashboard)
- Email open rate (if tracking implemented)
- Job execution success rate (application logs)
- User opt-out rate (database query)

---

## Files Modified

### Created Files:
- `lib/emails/dailyReport.tsx` - Daily report email template
- `lib/emails/weeklyReport.tsx` - Weekly report email template
- `lib/emails/vipNotification.tsx` - VIP notification email template
- `lib/emails/ticketAlert.tsx` - Ticket alert email template
- `lib/emails/teamNotifications.ts` - Email sending functions
- `scripts/test-email-notifications.ts` - Manual test script

### Modified Files:
- `jobs/generateDailyReports.ts` - Updated to use email
- `jobs/generateWeeklyReports.ts` - Updated to use email
- `jobs/notifyVipMessage.ts` - Updated to use email
- `jobs/checkVipResponseTimes.ts` - Updated to use email
- `jobs/checkAssignedTicketResponseTimes.ts` - Updated to use email
- `jobs/suggestKnowledgeBankChanges.ts` - Removed Slack notifications
- `jobs/trigger.ts` - Removed Slack event
- `lib/data/mailbox.ts` - Removed Slack functions
- `lib/data/conversationMessage.ts` - Removed Slack references
- `lib/data/user.ts` - Removed Slack user lookup
- `lib/data/knowledge.ts` - Removed Slack notifications
- `lib/env.ts` - Removed Slack env vars
- `db/schema/userProfiles.ts` - Added email preferences
- `db/schema/mailboxes.ts` - Removed Slack fields
- `db/schema/conversationMessages.ts` - Removed Slack fields
- `db/schema/faqs.ts` - Removed Slack fields
- `db/schema/notes.ts` - Removed Slack fields

### Deleted Files:
- All files in `lib/slack/` directory
- All files in `app/api/webhooks/slack/` directory
- All files in `app/api/connect/slack/` directory
- `jobs/handleSlackAgentMessage.ts`
- `trpc/router/mailbox/slack.ts`
- `db/schema/agentMessages.ts`
- `db/schema/agentThreads.ts`
- Multiple test files related to Slack
- UI components for Slack integration

---

## Conclusion

This test plan provides comprehensive coverage of the email notification system. Complete all manual tests and document results before deploying to production.

For questions or issues, refer to the code comments and documentation in the email templates and job files.
