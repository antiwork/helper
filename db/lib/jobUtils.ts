import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { env } from "@/lib/env";

export const setupCron = async (job: string, schedule: string) => {
  // eslint-disable-next-line no-console
  console.log(`Scheduling cron job: ${job} with schedule: ${schedule}`);
  await db.execute(sql`
    select cron.schedule(${job}, ${schedule}, 'select call_job_endpoint(${JSON.stringify({ job })})');
  `);
};

export const unscheduleCron = async (job: string) => {
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
  await db.execute(sql`
    do $$
    declare
      secret_id uuid;
    begin
      select id into secret_id from vault.secrets where name = 'jobs-hmac-secret';
      
      if secret_id is not null then
        perform vault.update_secret(secret_id, ${env.ENCRYPT_COLUMN_SECRET}, 'jobs-hmac-secret');
      else
        perform vault.create_secret(${env.ENCRYPT_COLUMN_SECRET}, 'jobs-hmac-secret');
      end if;
    end $$;
  `);

  await db.execute(sql`
    create or replace function call_job_endpoint(job_body text) returns text as $$
    declare
      endpoint_url text := ${env.AUTH_URL} || '/api/job';
      response text;
    begin
      select content into response from net.http_post(
        url:=endpoint_url,
        body:=job_body,
        headers:=json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || hmac(job_body, ${env.ENCRYPT_COLUMN_SECRET}, 'sha256'))
      );
      
      return response;
    end;
    $$ language plpgsql;
  `);

  await db.execute(sql`
    create or replace function process_jobs() returns text as $$
    declare
      message_record record;
      job_count integer := 0;
      response text;
    begin
      loop
        select * into message_record from pgmq.pop('job_queue', 30);
        
        if message_record is null then
          exit;
        end if;
        
        job_count := job_count + 1;
        
        response := call_job_endpoint(message_record.message::text);
  
        raise notice 'Processed job %, response: %', message_record.msg_id, response;
      end loop;
      
      return format('Processed %s jobs', job_count);
    end;
    $$ language plpgsql;
  `);

  await db.execute(sql`
    select cron.schedule('process-jobs', '5 seconds', 'select process_jobs()');
  `);
};
