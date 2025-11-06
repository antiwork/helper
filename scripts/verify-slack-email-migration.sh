#!/bin/bash

echo "================================================"
echo "FINAL COMPREHENSIVE VERIFICATION"
echo "Slack to Email Migration"
echo "================================================"
echo ""

ERRORS=0

# Check 1: Verify all 8 Slack integration points are migrated
echo "✓ Check 1: Slack Integration Points Migrated"
echo "-------------------------------------------"

check_migration() {
    local file=$1
    local function=$2
    if grep -q "$function" "$file" 2>/dev/null; then
        echo "  ✅ $file uses $function"
    else
        echo "  ❌ $file does NOT use $function"
        ERRORS=$((ERRORS + 1))
    fi
}

check_migration "jobs/generateDailyReports.ts" "sendDailyReportEmail"
check_migration "jobs/generateWeeklyReports.ts" "sendWeeklyReportEmail"
check_migration "jobs/notifyVipMessage.ts" "sendVipNotificationEmail"
check_migration "jobs/checkVipResponseTimes.ts" "sendTicketAlertEmail"
check_migration "jobs/checkAssignedTicketResponseTimes.ts" "sendTicketAlertEmail"

# Check if lib/slack files are deleted
if [ ! -d "lib/slack" ]; then
    echo "  ✅ lib/slack/ deleted (Slack Agent Integration removed)"
else
    echo "  ❌ lib/slack/ still exists"
    ERRORS=$((ERRORS + 1))
fi

# Check knowledge.ts has no Slack notifications
if ! grep -q "slack" lib/data/knowledge.ts 2>/dev/null; then
    echo "  ✅ lib/data/knowledge.ts has no Slack references"
else
    echo "  ❌ lib/data/knowledge.ts still has Slack references"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 2: Database schema changes in migration
echo "✓ Check 2: Database Migration Completeness"
echo "-------------------------------------------"

MIGRATION="db/drizzle/0124_remove_slack_integration.sql"

check_migration_has() {
    local pattern=$1
    local description=$2
    if grep -q "$pattern" "$MIGRATION" 2>/dev/null; then
        echo "  ✅ $description"
    else
        echo "  ❌ MISSING: $description"
        ERRORS=$((ERRORS + 1))
    fi
}

# Tables
check_migration_has "DROP TABLE.*agent_messages" "Drops agent_messages table"
check_migration_has "DROP TABLE.*agent_threads" "Drops agent_threads table"

# Mailbox fields - need to check actual column names
check_migration_has "DROP COLUMN.*slack_bot_token" "Removes slack_bot_token"
check_migration_has "DROP COLUMN.*slack_bot_user_id" "Removes slack_bot_user_id"
check_migration_has "DROP COLUMN.*slack_team_id" "Removes slack_team_id"
check_migration_has "DROP COLUMN.*vip_channel_id" "Removes vip_channel_id"

# Check for slackAlertChannel or slack_escalation_channel
if grep -q "slack_escalation_channel\|slack_alert_channel" "$MIGRATION"; then
    echo "  ✅ Removes Slack alert/escalation channel"
else
    echo "  ⚠️  WARNING: No slack_alert_channel or slack_escalation_channel in migration"
fi

# Other tables
check_migration_has "conversation_messages.*DROP COLUMN.*slack_channel" "Removes conversation_messages.slack_channel"
check_migration_has "conversation_messages.*DROP COLUMN.*slack_message_ts" "Removes conversation_messages.slack_message_ts"
check_migration_has "faqs.*DROP COLUMN.*slack" "Removes faqs Slack fields"
check_migration_has "notes.*DROP COLUMN.*slack" "Removes notes Slack fields"

echo ""

# Check 3: All specified files removed
echo "✓ Check 3: All Specified Files Removed"
echo "-------------------------------------------"

FILES_TO_CHECK=(
    "lib/slack/client.ts"
    "lib/slack/constants.ts"
    "lib/slack/linkUnfurl.ts"
    "lib/slack/shared.ts"
    "lib/slack/vipNotifications.ts"
    "jobs/handleSlackAgentMessage.ts"
    "app/(dashboard)/settings/integrations/slackSetting.tsx"
    "components/useShowToastForSlackConnectStatus.ts"
    "packages/marketing/app/slackNotification.tsx"
    "packages/marketing/app/slackInterface.tsx"
    "tests/trpc/router/mailbox/slack.test.ts"
    "trpc/router/mailbox/slack.ts"
    "db/schema/agentMessages.ts"
    "db/schema/agentThreads.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -e "$file" ]; then
        echo "  ✅ Removed: $file"
    else
        echo "  ❌ STILL EXISTS: $file"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check 4: Additional checklist items
echo "✓ Check 4: Additional Checklist Items"
echo "-------------------------------------------"

# Check marketing page
if ! grep -q "SlackInterface" packages/marketing/app/page.tsx 2>/dev/null; then
    echo "  ✅ SlackInterface removed from marketing page"
else
    echo "  ❌ SlackInterface still in marketing page"
    ERRORS=$((ERRORS + 1))
fi

# Check updateVipMessageOnClose removed
if ! grep -q "updateVipMessageOnClose" lib/data/conversation.ts 2>/dev/null; then
    echo "  ✅ updateVipMessageOnClose removed from conversation.ts"
else
    echo "  ❌ updateVipMessageOnClose still in conversation.ts"
    ERRORS=$((ERRORS + 1))
fi

# Check Slack constants removed from search.ts
if ! grep -q "from.*slack.*constants" lib/data/conversation/search.ts 2>/dev/null; then
    echo "  ✅ Slack constants import removed from search.ts"
else
    echo "  ❌ Slack constants still imported in search.ts"
    ERRORS=$((ERRORS + 1))
fi

# Check slack_bot removed from searchSchema
if ! grep -q "slack_bot" lib/data/conversation/searchSchema.ts 2>/dev/null; then
    echo "  ✅ slack_bot removed from searchSchema"
else
    echo "  ❌ slack_bot still in searchSchema"
    ERRORS=$((ERRORS + 1))
fi

# Check customerSetting.tsx
if ! grep -q "SlackChannels\|vipChannelId" app/\(dashboard\)/settings/customers/customerSetting.tsx 2>/dev/null; then
    echo "  ✅ Slack notifications removed from customerSetting.tsx"
else
    echo "  ❌ Slack references still in customerSetting.tsx"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 5: Environment variables and dependencies
echo "✓ Check 5: Environment & Dependencies"
echo "-------------------------------------------"

if ! grep -q "SLACK_CLIENT_ID\|SLACK_CLIENT_SECRET\|SLACK_SIGNING_SECRET" lib/env.ts 2>/dev/null; then
    echo "  ✅ Slack env vars removed from lib/env.ts"
else
    echo "  ❌ Slack env vars still in lib/env.ts"
    ERRORS=$((ERRORS + 1))
fi

if ! grep -q "@slack" package.json 2>/dev/null; then
    echo "  ✅ @slack dependencies removed from package.json"
else
    echo "  ❌ @slack dependencies still in package.json"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 6: Email system implementation
echo "✓ Check 6: Email System Implementation"
echo "-------------------------------------------"

EMAIL_TEMPLATES=(
    "lib/emails/dailyReport.tsx"
    "lib/emails/weeklyReport.tsx"
    "lib/emails/vipNotification.tsx"
    "lib/emails/ticketAlert.tsx"
)

for template in "${EMAIL_TEMPLATES[@]}"; do
    if [ -f "$template" ]; then
        echo "  ✅ $template exists"
    else
        echo "  ❌ MISSING: $template"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ -f "lib/emails/teamNotifications.ts" ]; then
    echo "  ✅ lib/emails/teamNotifications.ts exists"

    # Check it has all the required functions
    for func in sendDailyReportEmail sendWeeklyReportEmail sendVipNotificationEmail sendTicketAlertEmail; do
        if grep -q "$func" lib/emails/teamNotifications.ts; then
            echo "  ✅   - Has $func function"
        else
            echo "  ❌   - MISSING $func function"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo "  ❌ MISSING: lib/emails/teamNotifications.ts"
    ERRORS=$((ERRORS + 1))
fi

# Check email preferences in userProfiles
if grep -q "emailNotifications" db/schema/userProfiles.ts 2>/dev/null; then
    echo "  ✅ Email preferences added to userProfiles schema"
else
    echo "  ❌ Email preferences NOT in userProfiles schema"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 7: No Slack references in active code
echo "✓ Check 7: No Slack References in Active Code"
echo "-------------------------------------------"

SLACK_IMPORTS=$(grep -r "from.*slack" --include="*.ts" --include="*.tsx" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="db/drizzle" . 2>/dev/null | grep -v "pnpm-lock" | grep -v "docs/" | grep -v "\.test\." | wc -l)

if [ "$SLACK_IMPORTS" -eq 0 ]; then
    echo "  ✅ Zero Slack imports in active code"
else
    echo "  ❌ Found $SLACK_IMPORTS Slack imports in active code"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "================================================"
echo "FINAL RESULTS"
echo "================================================"

if [ "$ERRORS" -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo ""
    echo "The migration is COMPLETE and ready for deployment."
    exit 0
else
    echo "❌ Found $ERRORS issue(s)"
    echo ""
    echo "Please review and fix the issues above."
    exit 1
fi
