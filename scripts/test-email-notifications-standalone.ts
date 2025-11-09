#!/usr/bin/env tsx
/**
 * Standalone test script for email notifications
 * 
 * This script uses plain HTML templates (no React), so it works without any special flags.
 * 
 * Usage:
 *   pnpm run test:email daily
 * 
 * Or manually:
 *   pnpm run with-dev-env pnpm tsx scripts/test-email-notifications-standalone.ts daily
 */

import { sendDailyReportEmail } from "@/lib/email/notifications";
import { sendWeeklyReportEmail } from "@/lib/email/notifications";
import { sendVipNotificationEmail } from "@/lib/email/notifications";
import { sendResponseTimeAlertEmail } from "@/lib/email/notifications";
import { getTeamMemberEmails } from "@/lib/email/teamMembers";

async function testDailyReport() {
  console.log("📧 Testing Daily Report Email...");
  console.log("Getting team member emails...");
  
  const teamEmails = await getTeamMemberEmails("dailyReports");
  console.log(`Found ${teamEmails.length} team member(s) with email addresses`);
  
  if (teamEmails.length === 0) {
    console.log("❌ No team members with email addresses found. Please create a user with an email first.");
    return;
  }
  
  console.log(`Team members: ${teamEmails.join(", ")}`);
  console.log("\nSending daily report email...");
  
  const result = await sendDailyReportEmail({
    mailboxName: "Test Mailbox",
    openTickets: 10,
    ticketsAnswered: 5,
    openTicketsOverZero: 3,
    ticketsAnsweredOverZero: 2,
    averageReplyTime: "2h 30m",
    vipAverageReplyTime: "1h 15m",
    averageWaitTime: "4h 20m",
  });
  
  console.log("\n✅ Result:", JSON.stringify(result, null, 2));
  
  if (result?.success) {
    console.log(`\n✅ Success! Check your email inbox (${teamEmails.join(", ")})`);
  } else {
    console.log(`\n❌ Failed: ${result?.reason || "Unknown error"}`);
  }
}

async function testWeeklyReport() {
  console.log("\n📧 Testing Weekly Report Email...");
  
  const teamEmails = await getTeamMemberEmails("weeklyReports");
  console.log(`Found ${teamEmails.length} team member(s) with email addresses`);
  
  if (teamEmails.length === 0) {
    console.log("❌ No team members with email addresses found.");
    return;
  }
  
  const result = await sendWeeklyReportEmail({
    mailboxName: "Test Mailbox",
    weekRange: "Week of 2024-01-01 to 2024-01-07",
    activeMembers: [
      { name: "John Doe", count: 10 },
      { name: "Jane Smith", count: 5 },
    ],
    inactiveMembers: ["Bob Wilson"],
    totalTicketsResolved: 50,
    activeUserCount: 2,
  });
  
  console.log("\n✅ Result:", JSON.stringify(result, null, 2));
  
  if (result?.success) {
    console.log(`\n✅ Success! Check your email inbox`);
  } else {
    console.log(`\n❌ Failed: ${result?.reason || "Unknown error"}`);
  }
}

async function testVipNotification() {
  console.log("\n⭐ Testing VIP Notification Email...");
  
  const teamEmails = await getTeamMemberEmails("vipNotifications");
  console.log(`Found ${teamEmails.length} team member(s) with email addresses`);
  
  if (teamEmails.length === 0) {
    console.log("❌ No team members with email addresses found.");
    return;
  }
  
  const result = await sendVipNotificationEmail({
    customerName: "VIP Customer",
    customerEmail: "vip@example.com",
    message: "This is a test VIP message. Please respond quickly!",
    conversationSubject: "Urgent: Account Issue",
    conversationSlug: "test-conversation-slug",
    customerLinks: [
      { label: "Dashboard", url: "https://example.com/dashboard" },
      { label: "Billing", url: "https://example.com/billing" },
    ],
    closed: false,
  });
  
  console.log("\n✅ Result:", JSON.stringify(result, null, 2));
  
  if (result?.success) {
    console.log(`\n✅ Success! Check your email inbox`);
  } else {
    console.log(`\n❌ Failed: ${result?.reason || "Unknown error"}`);
  }
}

async function testResponseTimeAlert() {
  console.log("\n🚨 Testing Response Time Alert Email...");
  
  const teamEmails = await getTeamMemberEmails("responseTimeAlerts");
  console.log(`Found ${teamEmails.length} team member(s) with email addresses`);
  
  if (teamEmails.length === 0) {
    console.log("❌ No team members with email addresses found.");
    return;
  }
  
  const result = await sendResponseTimeAlertEmail({
    alertType: "assigned",
    mailboxName: "Test Mailbox",
    overdueCount: 5,
    tickets: [
      {
        subject: "Ticket 1: Urgent Issue",
        slug: "ticket-1",
        assignee: "John Doe",
        timeSinceLastReply: "2 days",
      },
      {
        subject: "Ticket 2: Customer Complaint",
        slug: "ticket-2",
        assignee: "Jane Smith",
        timeSinceLastReply: "3 days",
      },
    ],
    threshold: "24 hours",
  });
  
  console.log("\n✅ Result:", JSON.stringify(result, null, 2));
  
  if (result?.success) {
    console.log(`\n✅ Success! Check your email inbox`);
  } else {
    console.log(`\n❌ Failed: ${result?.reason || "Unknown error"}`);
  }
}

async function main() {
  const testType = process.argv[2] || "all";
  
  console.log("🧪 Email Notification Test Script (Standalone)");
  console.log("===============================================\n");
  
  // Check environment variables
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromAddress = process.env.RESEND_FROM_ADDRESS;
  
  if (!resendApiKey || !resendFromAddress) {
    console.log("❌ ERROR: Resend is not configured!");
    console.log("\nPlease set these environment variables:");
    console.log("  RESEND_API_KEY=re_your_key_here");
    console.log("  RESEND_FROM_ADDRESS=noreply@yourdomain.com");
    console.log("\nYou can add them to your .env file or export them:");
    console.log("  export RESEND_API_KEY=re_your_key_here");
    console.log("  export RESEND_FROM_ADDRESS=noreply@yourdomain.com");
    console.log("\nOr run with: pnpm run with-dev-env pnpm tsx scripts/test-email-notifications-standalone.ts daily");
    process.exit(1);
  }
  
  console.log("✅ Resend configured");
  console.log(`   From: ${resendFromAddress}\n`);
  
  try {
    switch (testType) {
      case "daily":
        await testDailyReport();
        break;
      case "weekly":
        await testWeeklyReport();
        break;
      case "vip":
        await testVipNotification();
        break;
      case "alert":
        await testResponseTimeAlert();
        break;
      case "all":
      default:
        await testDailyReport();
        await testWeeklyReport();
        await testVipNotification();
        await testResponseTimeAlert();
        break;
    }
    
    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();

