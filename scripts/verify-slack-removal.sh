#!/bin/bash

# Verification script for Slack to Email migration
# This script checks for any remaining Slack references and validates the migration

echo "🔍 Slack Removal Verification Script"
echo "===================================="
echo ""

ERRORS=0

# Check 1: No Slack imports in active TypeScript files
echo "✓ Check 1: Verifying no Slack imports in active code..."
SLACK_IMPORTS=$(grep -r "from.*slack" --include="*.ts" --include="*.tsx" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="db/drizzle" . 2>/dev/null | grep -v "pnpm-lock" | grep -v "docs/" | grep -v "\.test\." | wc -l)

if [ "$SLACK_IMPORTS" -eq 0 ]; then
    echo "  ✅ No Slack imports found"
else
    echo "  ❌ Found $SLACK_IMPORTS Slack imports in active code"
    ERRORS=$((ERRORS + 1))
    grep -r "from.*slack" --include="*.ts" --include="*.tsx" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="db/drizzle" . 2>/dev/null | grep -v "pnpm-lock" | grep -v "docs/" | grep -v "\.test\."
fi

echo ""

# Check 2: No Slack environment variables in code
echo "✓ Check 2: Verifying no Slack environment variables..."
SLACK_ENV_USAGE=$(grep -r "SLACK_CLIENT_ID\|SLACK_CLIENT_SECRET\|SLACK_SIGNING_SECRET" --include="*.ts" --include="*.tsx" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="db/drizzle" --exclude-dir="tests" . 2>/dev/null | grep -v "pnpm-lock" | wc -l)

if [ "$SLACK_ENV_USAGE" -eq 0 ]; then
    echo "  ✅ No Slack environment variable usage found"
else
    echo "  ❌ Found $SLACK_ENV_USAGE Slack environment variable usages"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 3: Verify Slack directories are deleted
echo "✓ Check 3: Verifying Slack directories are deleted..."
SLACK_DIRS=("lib/slack" "app/api/webhooks/slack" "app/api/connect/slack")
for dir in "${SLACK_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ❌ Directory still exists: $dir"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✅ Deleted: $dir"
    fi
done

echo ""

# Check 4: Verify email template files exist
echo "✓ Check 4: Verifying email template files exist..."
EMAIL_TEMPLATES=("lib/emails/dailyReport.tsx" "lib/emails/weeklyReport.tsx" "lib/emails/vipNotification.tsx" "lib/emails/ticketAlert.tsx" "lib/emails/teamNotifications.ts")
for template in "${EMAIL_TEMPLATES[@]}"; do
    if [ -f "$template" ]; then
        echo "  ✅ Found: $template"
    else
        echo "  ❌ Missing: $template"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check 5: Verify job files use email instead of Slack
echo "✓ Check 5: Verifying jobs use email notifications..."
JOB_FILES=("jobs/generateDailyReports.ts" "jobs/generateWeeklyReports.ts" "jobs/notifyVipMessage.ts" "jobs/checkVipResponseTimes.ts" "jobs/checkAssignedTicketResponseTimes.ts")
for job in "${JOB_FILES[@]}"; do
    if grep -q "sendEmail\|sendDailyReportEmail\|sendWeeklyReportEmail\|sendVipNotificationEmail\|sendTicketAlertEmail" "$job" 2>/dev/null; then
        echo "  ✅ $job uses email notifications"
    else
        echo "  ❌ $job may not be using email notifications"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check 6: Verify database migration file exists
echo "✓ Check 6: Verifying database migration exists..."
if [ -f "db/drizzle/0124_remove_slack_integration.sql" ]; then
    echo "  ✅ Migration file exists: 0124_remove_slack_integration.sql"
    echo "  📄 Migration contents:"
    cat db/drizzle/0124_remove_slack_integration.sql | grep -E "DROP TABLE|DROP COLUMN" | sed 's/^/    /'
else
    echo "  ❌ Migration file not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 7: Verify schema files don't have Slack fields
echo "✓ Check 7: Verifying schema files have no Slack fields..."
SCHEMA_FILES=("db/schema/mailboxes.ts" "db/schema/conversationMessages.ts" "db/schema/faqs.ts" "db/schema/notes.ts")
for schema in "${SCHEMA_FILES[@]}"; do
    if grep -qi "slack" "$schema" 2>/dev/null; then
        echo "  ❌ $schema still contains Slack references"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✅ $schema has no Slack fields"
    fi
done

echo ""

# Check 8: Verify test script exists
echo "✓ Check 8: Verifying test script exists..."
if [ -f "scripts/test-email-notifications.ts" ]; then
    echo "  ✅ Test script exists: scripts/test-email-notifications.ts"
else
    echo "  ❌ Test script not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 9: Verify package.json doesn't have Slack dependencies
echo "✓ Check 9: Verifying no Slack dependencies in package.json..."
if grep -q "@slack/web-api\|@slack/types" package.json 2>/dev/null; then
    echo "  ❌ package.json still contains Slack dependencies"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No Slack dependencies in package.json"
fi

echo ""

# Check 10: Count remaining Slack references (informational)
echo "✓ Check 10: Counting remaining Slack references (informational)..."
TOTAL_SLACK_REFS=$(grep -ri "slack" --include="*.ts" --include="*.tsx" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="db/drizzle" . 2>/dev/null | grep -v "pnpm-lock" | grep -v "docs/" | grep -v "\.test\." | wc -l)
echo "  ℹ️  Total 'slack' references in active code: $TOTAL_SLACK_REFS"
echo "  (This includes comments, strings, and test files - should be minimal)"

echo ""
echo "===================================="

if [ "$ERRORS" -eq 0 ]; then
    echo "✅ All checks passed! Slack removal is complete."
    echo ""
    echo "Next steps:"
    echo "  1. Set up environment: cp .env.local.sample .env.local"
    echo "  2. Configure RESEND_API_KEY in .env.local"
    echo "  3. Start database: npm run services:start"
    echo "  4. Run migration: npm run db:migrate"
    echo "  5. Test emails: npm run tsx scripts/test-email-notifications.ts daily"
    exit 0
else
    echo "❌ Found $ERRORS error(s). Please review and fix."
    exit 1
fi
