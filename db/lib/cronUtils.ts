import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { getOrCreateSecret, SECRET_NAMES } from "@/lib/secrets";

export const setupCron = async (job: string, schedule: string) => {
  // eslint-disable-next-line no-console
  console.log(`Scheduling cron job: ${job} with schedule: ${schedule}`);
  await db.execute(sql`
    select cron.schedule(${job}, ${schedule}, ${`select call_job_endpoint('${JSON.stringify({ job })}', '')`});
  `);
};

const unscheduleCron = async (job: string) => {
  await db.execute(sql`
    select cron.unschedule(${job});
  `);
};

export const cleanupOldCronJobs = async (currentJobs: string[]) => {
  const jobsInClause = sql.join(
    currentJobs.map((job) => sql`${job}`),
    sql`, `,
  );
  const result = await db.execute(sql`
    select jobname from cron.job where jobname not in (${jobsInClause}) and jobname != 'process-jobs';
  `);

  const jobsToDelete = result.rows as { jobname: string }[];

  for (const job of jobsToDelete) {
    // eslint-disable-next-line no-console
    console.log(`Unscheduling cron job: ${job.jobname}`);
    await unscheduleCron(job.jobname);
  }
};

export const setupJobFunctions = async () => {
  // Ensure the HMAC secret exists in vault
  await getOrCreateSecret(SECRET_NAMES.JOBS_HMAC);

  await db.execute(
    sql.raw(`
      create or replace function call_job_endpoint(job_body text, queue_message_id text) returns text as $$
      declare
        endpoint_url text := '${env.NODE_ENV === "development" ? "http://host.docker.internal:3010" : env.AUTH_URL}/api/job';
        hmac_secret text;
        timestamp_str text;
        hmac_payload text;
        response text;
      begin
        select decrypted_secret into hmac_secret from vault.decrypted_secrets where name = '${SECRET_NAMES.JOBS_HMAC}';
        
        timestamp_str := extract(epoch from now())::text;
        hmac_payload := timestamp_str || '.' || job_body;
        
        select content into response from http((
          'POST',
          endpoint_url,
          array[
            http_header('Content-Type', 'application/json'), 
            http_header('Authorization', 'Bearer ' || encode(hmac(hmac_payload, hmac_secret, 'sha256'), 'hex')),
            http_header('X-Timestamp', timestamp_str),
            http_header('X-Queue-Message-Id', queue_message_id)
          ],
          'application/json',
          job_body
        )::http_request);
        
        return response;
      end;
      $$ language plpgsql;
    `),
  );

  await db.execute(sql`
    create or replace function process_jobs() returns text as $$
    declare
      message_record record;
      job_count integer := 0;
      response text;
      start_time timestamp := clock_timestamp();
    begin
      loop
        select * into message_record from pgmq.pop('jobs');
        
        if message_record is null then
          exit;
        end if;
        
        if extract(epoch from (clock_timestamp() - start_time)) >= 20 then
          raise notice 'Stopping job processing after 20 seconds, processed % jobs', job_count;
          exit;
        end if;

        job_count := job_count + 1;
        
        response := call_job_endpoint(message_record.message::text, message_record.msg_id::text);
  
        raise notice 'Processed job %, response: %', message_record.msg_id, response;
      end loop;
      
      return format('Processed %s jobs in %s seconds', job_count, round(extract(epoch from (clock_timestamp() - start_time))::numeric, 2));
    end;
    $$ language plpgsql;
  `);

  await db.execute(sql`
    select cron.schedule('process-jobs', '5 seconds', 'select process_jobs()');
  `);
};
