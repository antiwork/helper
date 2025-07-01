ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Function to automatically insert into user_profiles after a user is created
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
    coalesce(new.raw_user_meta_data ->> 'permissions', 'member'),
    jsonb_build_object(
      'role', coalesce(new.raw_user_meta_data ->> 'role', 'afk'),
      'keywords', coalesce(
        (new.raw_user_meta_data -> 'keywords')::jsonb,
        '[]'::jsonb
      )
    ),
    now(),
    now()
  );
  return new;
end;
$$;

-- Drop existing trigger if it somehow exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to run the function after a new user is inserted into auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user_profile();