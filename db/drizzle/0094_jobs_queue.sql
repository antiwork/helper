-- Copied from the Supabase dashboard after adding the queue
create table
  IF not exists pgmq.q_jobs (
    msg_id bigint generated always as identity not null,
    read_ct integer not null default 0,
    enqueued_at timestamp
    with
      time zone not null default now (),
      vt timestamp
    with
      time zone not null,
      message jsonb null,
      constraint q_jobs_pkey primary key (msg_id)
  ) TABLESPACE pg_default;

create index IF not exists q_jobs_vt_idx on pgmq.q_jobs using btree (vt) TABLESPACE pg_default;

create table
  IF not exists pgmq.a_jobs (
    msg_id bigint not null,
    read_ct integer not null default 0,
    enqueued_at timestamp
    with
      time zone not null default now (),
      archived_at timestamp
    with
      time zone not null default now (),
      vt timestamp
    with
      time zone not null,
      message jsonb null,
      constraint a_jobs_pkey primary key (msg_id)
  ) TABLESPACE pg_default;

create index IF not exists archived_at_idx_jobs on pgmq.a_jobs using btree (archived_at) TABLESPACE pg_default;

create table
  IF not exists pgmq.meta (
    queue_name character varying not null,
    is_partitioned boolean not null,
    is_unlogged boolean not null,
    created_at timestamp
    with
      time zone not null default now (),
      constraint meta_queue_name_key unique (queue_name)
  ) TABLESPACE pg_default;

insert into
  pgmq.meta (
    queue_name,
    is_partitioned,
    is_unlogged,
    created_at
  )
values
  ('jobs', false, false, now ()) on conflict (queue_name) do nothing;