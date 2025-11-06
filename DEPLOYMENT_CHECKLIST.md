# Deployment Checklist: Slack to Email Migration

## Pre-Deployment Verification

### ✅ Automated Checks (COMPLETED)

Run the verification script:
```bash
./scripts/verify-slack-removal.sh
```

**Status**: All 10 automated checks passed ✅

---

## Manual Testing Requirements

### 1. Environment Setup

**Status**: ⏳ REQUIRES ACTION

**Steps**:
```bash
# 1. Copy environment template
cp .env.local.sample .env.local

# 2. Configure required variables in .env.local
# - RESEND_API_KEY: Get from https://resend.com/api-keys
# - RESEND_FROM_ADDRESS: Your verified sender email
# - POSTGRES_URL: Database connection string
# - POSTGRES_URL_NON_POOLING: Direct database connection

# 3. Start local services
npm run services:start

# 4. Verify database connection
npm run db:push
```

**Expected Result**: Database connects successfully, no errors in console

---

### 2. Database Migration

**Status**: ⏳ REQUIRES ACTION

**Migration File**: `db/drizzle/0124_remove_slack_integration.sql`

**Testing in Staging**:
```bash
# Review migration first
cat db/drizzle/0124_remove_slack_integration.sql

# Run migration in staging
npm run db:migrate

# Verify migration applied
psql $POSTGRES_URL -c "\d mailboxes_mailbox" | grep -i slack
# Should return nothing

# Verify tables dropped
psql $POSTGRES_URL -c "\dt agent_*"
# Should not list agent_messages or agent_threads
```

**Expected Results**:
- All Slack columns removed from tables
- agent_messages table dropped
- agent_threads table dropped
- No errors during migration
- Application still starts successfully

**Rollback Plan** (if needed):
```sql
-- Emergency rollback: Re-add columns as nullable
ALTER TABLE mailboxes_mailbox ADD COLUMN slack_bot_token TEXT;
ALTER TABLE mailboxes_mailbox ADD COLUMN slack_bot_user_id TEXT;
ALTER TABLE mailboxes_mailbox ADD COLUMN slack_team_id TEXT;
ALTER TABLE mailboxes_mailbox ADD COLUMN slack_escalation_channel TEXT;
ALTER TABLE mailboxes_mailbox ADD COLUMN vip_channel_id TEXT;
-- (Add remaining columns as needed)
```

---

### 3. Run Manual Email Tests

**Status**: ⏳ REQUIRES ACTION

#### Test 3.1: Daily Report Email

```bash
npm run tsx scripts/test-email-notifications.ts daily
```

**Checklist**:
- [ ] Script completes without errors
- [ ] Console shows metrics (open tickets, answered tickets, etc.)
- [ ] Email received in inbox
- [ ] Email formatting looks correct
- [ ] All metrics are displayed
- [ ] Dashboard link works
- [ ] "Manage notifications" link works
- [ ] Helper logo displays correctly

**Expected Output**:
```json
{
  "success": true,
  "emailResult": {
    "sent": 3,
    "recipients": ["user1@example.com", "user2@example.com", "user3@example.com"]
  },
  "openCountMessage": "• Open tickets: 42",
  "answeredCountMessage": "• Tickets answered: 18"
}
```

---

#### Test 3.2: Weekly Report Email

```bash
npm run tsx scripts/test-email-notifications.ts weekly
```

**Checklist**:
- [ ] Script completes without errors
- [ ] Console shows member stats
- [ ] Email received in inbox
- [ ] Active members list is correct
- [ ] Inactive members list is shown
- [ ] Total reply count is accurate
- [ ] Date range is correct (last week)
- [ ] Dashboard link works

**Expected Output**:
```json
{
  "success": true,
  "emailResult": {
    "sent": 3,
    "recipients": ["user1@example.com", "user2@example.com", "user3@example.com"]
  }
}
```

---

#### Test 3.3: VIP Notification Email

**Prerequisites**:
- Have a VIP customer in the system (customer value > vipThreshold)
- Create a test message from that customer
- Get the message ID

```bash
# Replace 123 with actual message ID
npm run tsx scripts/test-email-notifications.ts vip 123
```

**Checklist**:
- [ ] Script completes without errors
- [ ] Email received in inbox
- [ ] VIP badge is visible
- [ ] Customer email is shown
- [ ] Customer value is formatted correctly ($X,XXX)
- [ ] Conversation subject is displayed
- [ ] Message preview is truncated at 300 chars
- [ ] Conversation link works
- [ ] Status indicator is correct

**Expected Output**:
```
Notification sent
```

---

#### Test 3.4: VIP Response Time Alerts

**Prerequisites**:
- Configure VIP threshold in mailbox settings
- Configure VIP expected response hours (e.g., 2 hours)
- Have at least one VIP ticket exceeding response time

```bash
npm run tsx scripts/test-email-notifications.ts vip-alerts
```

**Checklist**:
- [ ] Script completes without errors
- [ ] Email received if there are overdue VIP tickets
- [ ] Alert badge displays correctly
- [ ] Count of overdue tickets is accurate
- [ ] Ticket list shows up to 10 tickets
- [ ] Each ticket shows subject, customer, and time
- [ ] Dashboard link works

**Expected Output**:
```json
{
  "overdueCount": 3,
  "emailsSent": 3
}
```

---

#### Test 3.5: Assigned Ticket Response Time Alerts

**Prerequisites**:
- Have assigned tickets with no reply for over 24 hours

```bash
npm run tsx scripts/test-email-notifications.ts assigned-alerts
```

**Checklist**:
- [ ] Script completes without errors
- [ ] Email received if there are overdue assigned tickets
- [ ] Alert badge displays correctly
- [ ] Count of overdue tickets is accurate
- [ ] Ticket list shows assignee names
- [ ] Time since last reply is calculated correctly
- [ ] Dashboard link works

**Expected Output**:
```json
{
  "overdueCount": 5,
  "emailsSent": 3
}
```

---

### 4. Email Client Compatibility Testing

**Status**: ⏳ REQUIRES ACTION

Test email rendering in multiple clients:

**Email Clients to Test**:
- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Outlook (web)
- [ ] Outlook (desktop)
- [ ] Apple Mail (macOS)
- [ ] Apple Mail (iOS)
- [ ] Thunderbird

**For Each Client, Verify**:
- [ ] Headers render correctly (bold, proper size)
- [ ] Metrics boxes have gray background
- [ ] Links are blue and clickable
- [ ] Footer displays properly
- [ ] Helper logo loads
- [ ] Responsive on mobile (if applicable)
- [ ] No broken images
- [ ] Proper spacing and alignment

---

### 5. User Preference Testing

**Status**: ⏳ REQUIRES ACTION

#### Test 5.1: Opt-out Functionality

**Steps**:
1. Log in to the application
2. Navigate to `/settings`
3. Find email notification preferences section
4. Disable "Daily Reports"
5. Run daily report test: `npm run tsx scripts/test-email-notifications.ts daily`
6. Check inbox

**Checklist**:
- [ ] Settings page has email notification preferences
- [ ] Can toggle each notification type
- [ ] Preferences save correctly
- [ ] After disabling, email is NOT received
- [ ] Other users still receive the email
- [ ] Preferences persist after page reload

---

#### Test 5.2: Default Behavior for New Users

**Steps**:
1. Create a new user account
2. Check default email preferences
3. Trigger a notification
4. Verify email is received

**Checklist**:
- [ ] All notification types are enabled by default
- [ ] New user receives all email types
- [ ] User can opt out via settings

---

### 6. Error Handling & Logging

**Status**: ⏳ REQUIRES ACTION

#### Test 6.1: No Slack Configuration Errors

**Steps**:
```bash
# Ensure no Slack env vars are set
grep -i slack .env.local
# Should return nothing

# Start application
npm run dev

# Tail logs
tail -f logs/app.log
```

**Checklist**:
- [ ] Application starts successfully
- [ ] No errors about missing Slack configuration
- [ ] No console errors related to Slack
- [ ] Jobs run without Slack-related errors

---

#### Test 6.2: Missing Resend Configuration

**Steps**:
```bash
# Temporarily remove RESEND_API_KEY from .env.local
# Run a notification test
npm run tsx scripts/test-email-notifications.ts daily
```

**Expected Behavior**:
- [ ] Clear error message about missing Resend configuration
- [ ] Application does not crash
- [ ] Error is logged appropriately

---

#### Test 6.3: Resend API Monitoring

**Steps**:
1. Log in to Resend dashboard
2. Navigate to API section
3. Check delivery statistics

**Checklist**:
- [ ] Emails are being delivered
- [ ] Delivery success rate > 99%
- [ ] No bounces from invalid emails
- [ ] Open rate is tracked (if enabled)

---

### 7. Scheduled Job Testing

**Status**: ⏳ REQUIRES ACTION

#### Test 7.1: Daily Report Schedule

**Steps**:
```bash
# Check cron schedule in code
grep -A 5 "generateDailyReports" jobs/index.ts

# Wait for scheduled time or manually trigger via admin panel
# Monitor logs for execution
```

**Checklist**:
- [ ] Job runs at scheduled time
- [ ] Emails are sent to all eligible users
- [ ] Logs show successful execution
- [ ] No errors in job execution

---

#### Test 7.2: Weekly Report Schedule

**Steps**:
```bash
# Check cron schedule
grep -A 5 "generateWeeklyReports" jobs/index.ts

# Wait for Monday morning or manually trigger
```

**Checklist**:
- [ ] Job runs on Monday morning
- [ ] Stats cover previous week (Sunday-Saturday)
- [ ] Emails sent successfully

---

### 8. Production Deployment

**Status**: ⏳ REQUIRES ACTION

#### Pre-Production Checklist:
- [ ] All staging tests passed
- [ ] Database migration tested in staging
- [ ] Email delivery rate > 99% in staging
- [ ] No errors in staging logs for 24 hours
- [ ] Stakeholders informed of migration
- [ ] Rollback plan documented and tested

#### Production Deployment Steps:

1. **Backup Database**:
```bash
pg_dump $PROD_DATABASE_URL > backup_before_migration_$(date +%Y%m%d).sql
```

2. **Apply Migration**:
```bash
# In production environment
npm run db:migrate
```

3. **Verify Migration**:
```bash
# Check no Slack columns exist
psql $PROD_DATABASE_URL -c "\d mailboxes_mailbox" | grep -i slack
# Should return nothing
```

4. **Monitor Application**:
```bash
# Watch logs for 30 minutes
tail -f /var/log/app.log | grep -i "error\|slack"
```

5. **Test Email Delivery**:
```bash
# Send test daily report
npm run tsx scripts/test-email-notifications.ts daily

# Check Resend dashboard for delivery
```

6. **Monitor for 24 Hours**:
- [ ] Check error logs every 4 hours
- [ ] Monitor Resend delivery rate
- [ ] Check for customer complaints
- [ ] Verify scheduled jobs run successfully

---

### 9. Post-Deployment Monitoring

**Status**: ⏳ PENDING DEPLOYMENT

#### Metrics to Monitor:

**Application Metrics**:
- Error rate (should be < 0.1%)
- API response times
- Database query performance
- Job execution success rate

**Email Metrics** (Resend Dashboard):
- Delivery success rate (target: > 99%)
- Open rate (target: > 20%)
- Bounce rate (target: < 1%)
- Spam complaints (target: 0%)

**User Metrics**:
- Opt-out rate (track via database query)
- User complaints about notifications
- Support tickets related to email issues

**Database Queries for Monitoring**:
```sql
-- Check email notification preferences
SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE preferences->'emailNotifications'->>'dailyReports' = 'false') as daily_opted_out,
    COUNT(*) FILTER (WHERE preferences->'emailNotifications'->>'weeklyReports' = 'false') as weekly_opted_out,
    COUNT(*) FILTER (WHERE preferences->'emailNotifications'->>'vipAlerts' = 'false') as vip_opted_out,
    COUNT(*) FILTER (WHERE preferences->'emailNotifications'->>'ticketAlerts' = 'false') as ticket_opted_out
FROM user_profiles;

-- Check for orphaned data (should be empty after migration)
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name IN ('mailboxes_mailbox', 'conversation_messages', 'faqs', 'notes')
  AND column_name LIKE '%slack%';
```

---

## Success Criteria

The migration is considered successful when:

- [x] ✅ All automated verification checks pass
- [ ] ⏳ All manual email tests pass
- [ ] ⏳ Emails render correctly in all major clients
- [ ] ⏳ User preferences work correctly
- [ ] ⏳ Database migration completes successfully
- [ ] ⏳ No Slack-related errors in logs for 24 hours
- [ ] ⏳ Email delivery success rate > 99%
- [ ] ⏳ All scheduled jobs run successfully
- [ ] ⏳ No customer complaints about missing notifications

---

## Rollback Plan

If critical issues are discovered:

### Immediate Rollback (Code Only):
```bash
# Revert to previous version
git checkout main
git pull
npm install
pm2 restart all
```

### Full Rollback (Including Database):
```bash
# 1. Restore code
git checkout <previous-commit-hash>
npm install

# 2. Rollback database migration
# (Use the backup created before migration)
psql $PROD_DATABASE_URL < backup_before_migration_<date>.sql

# 3. Restart services
pm2 restart all

# 4. Verify Slack integration works (if reverting to Slack)
```

### Partial Rollback (Disable Jobs Only):
```sql
-- Disable email notification jobs without code changes
UPDATE cron_jobs SET enabled = false
WHERE name IN ('generateDailyReports', 'generateWeeklyReports', 'notifyVipMessage', 'checkVipResponseTimes', 'checkAssignedTicketResponseTimes');
```

---

## Support Information

### Common Issues & Solutions:

**Issue**: No emails received
- Check RESEND_API_KEY is configured
- Check user email preferences
- Check Resend dashboard for delivery status
- Verify email addresses are valid

**Issue**: Emails going to spam
- Verify SPF/DKIM records for domain
- Check Resend domain authentication
- Review email content for spam triggers

**Issue**: Migration fails
- Check database user has DROP permission
- Ensure no active connections to tables being modified
- Review constraint dependencies

### Emergency Contacts:
- DevOps Team: [contact info]
- Database Admin: [contact info]
- Resend Support: support@resend.com

---

## Completion Checklist

Before marking deployment as complete:

- [ ] All tests in this document completed
- [ ] All checkboxes marked
- [ ] 24-hour monitoring completed
- [ ] Success criteria met
- [ ] Stakeholders notified
- [ ] Documentation updated
- [ ] This checklist archived for future reference

---

**Last Updated**: 2025-11-06
**Migration Version**: 0124_remove_slack_integration
**Status**: Ready for deployment testing
