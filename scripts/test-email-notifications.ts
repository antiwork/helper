/**
 * Test script for manually triggering email notifications
 *
 * Usage:
 *   npm run tsx scripts/test-email-notifications.ts daily
 *   npm run tsx scripts/test-email-notifications.ts weekly
 *   npm run tsx scripts/test-email-notifications.ts vip <message-id>
 *   npm run tsx scripts/test-email-notifications.ts vip-alerts
 *   npm run tsx scripts/test-email-notifications.ts assigned-alerts
 */

import { generateMailboxDailyReport } from "@/jobs/generateDailyReports";
import { generateMailboxWeeklyReport } from "@/jobs/generateWeeklyReports";
import { notifyVipMessage } from "@/jobs/notifyVipMessage";
import { checkVipResponseTimes } from "@/jobs/checkVipResponseTimes";
import { checkAssignedTicketResponseTimes } from "@/jobs/checkAssignedTicketResponseTimes";

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  console.log("🧪 Testing Email Notifications\n");

  try {
    switch (command) {
      case "daily":
        console.log("📧 Triggering Daily Report...");
        const dailyResult = await generateMailboxDailyReport();
        console.log("✅ Daily report result:", JSON.stringify(dailyResult, null, 2));
        break;

      case "weekly":
        console.log("📧 Triggering Weekly Report...");
        const weeklyResult = await generateMailboxWeeklyReport();
        console.log("✅ Weekly report result:", JSON.stringify(weeklyResult, null, 2));
        break;

      case "vip":
        if (!arg) {
          console.error("❌ Error: Please provide a message ID");
          console.log("Usage: npm run tsx scripts/test-email-notifications.ts vip <message-id>");
          process.exit(1);
        }
        console.log(`📧 Triggering VIP Notification for message ${arg}...`);
        const vipResult = await notifyVipMessage({ messageId: parseInt(arg) });
        console.log("✅ VIP notification result:", vipResult);
        break;

      case "vip-alerts":
        console.log("📧 Checking VIP Response Times...");
        const vipAlertsResult = await checkVipResponseTimes();
        console.log("✅ VIP alerts result:", JSON.stringify(vipAlertsResult, null, 2));
        break;

      case "assigned-alerts":
        console.log("📧 Checking Assigned Ticket Response Times...");
        const assignedAlertsResult = await checkAssignedTicketResponseTimes();
        console.log("✅ Assigned alerts result:", JSON.stringify(assignedAlertsResult, null, 2));
        break;

      default:
        console.log("❌ Unknown command:", command);
        console.log("\nAvailable commands:");
        console.log("  daily              - Send daily report email");
        console.log("  weekly             - Send weekly report email");
        console.log("  vip <message-id>   - Send VIP notification for a message");
        console.log("  vip-alerts         - Check and send VIP response time alerts");
        console.log("  assigned-alerts    - Check and send assigned ticket alerts");
        process.exit(1);
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error occurred:", error);
    process.exit(1);
  }
}

main();
