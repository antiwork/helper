-- Update the trigger function to remove the access column
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
    inviter_user_id,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'permissions', 'member'),
    case 
      when new.raw_user_meta_data ->> 'inviter_user_id' is not null 
      then (new.raw_user_meta_data ->> 'inviter_user_id')::uuid
      else null
    end,
    now(),
    now()
  );
  return new;
end;
$$; 