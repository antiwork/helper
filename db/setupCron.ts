import { cleanupOldCronJobs, setupCron, setupJobFunctions } from "@/db/lib/cronUtils";
import { cronJobs } from "@/jobs";

await setupJobFunctions();

await cleanupOldCronJobs(Object.values(cronJobs).flatMap((jobs) => Object.keys(jobs)));

for (const [schedule, jobs] of Object.entries(cronJobs)) {
  for (const job of Object.keys(jobs)) {
    await setupCron(job, schedule);
  }
}
