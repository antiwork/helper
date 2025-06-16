import { setupCron, setupJobFunctions } from "@/db/lib/jobUtils";

await setupJobFunctions();

await setupCron("auto-close-inactive-conversations", "0 * * * *");
await setupCron("bulk-embedding-closed-conversations", "0 19 * * *");
await setupCron("check-assigned-ticket-response-times", "0 * * * *");
await setupCron("check-vip-response-times", "0 * * * *");
await setupCron("cleanup-dangling-files", "0 * * * *");
await setupCron("generate-daily-reports", "0 16 * * *");
await setupCron("generate-weekly-reports", "0 16 * * *");
await setupCron("renew-mailbox-watches", "0 0 * * *");
await setupCron("scheduled-website-crawl", "0 0 * * 0");
