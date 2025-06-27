import { sql } from "drizzle-orm";
import { db } from "../client";

export async function up() {
  await db.execute(sql`
    create or replace function public.handle_new_user_profile()
    returns trigger
    language plpgsql
    security definer set search_path = ''
    as $$
    begin
      insert into public.user_profiles (
        id,
        display_name,
        permissions,
        access,
        created_at,
        updated_at
      )
      values (
        new.id,
        new.raw_user_meta_data ->> 'display_name',
        'member',
        jsonb_build_object('role', 'afk', 'keywords', jsonb_build_array()),
        now(),
        now()
      );
      return new;
    end;
    $$;

    drop trigger if exists on_auth_user_created on auth.users;

    create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user_profile();
  `);
}

export async function down() {
  await db.execute(sql`
    drop trigger if exists on_auth_user_created on auth.users;
    drop function if exists public.handle_new_user_profile;
  `);
}
