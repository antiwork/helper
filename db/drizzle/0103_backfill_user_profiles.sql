-- Backfill user_profiles for all existing users
INSERT INTO public.user_profiles (
  id,
  display_name,
  permissions,
  access,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.raw_user_meta_data ->> 'display_name',
  coalesce(u.raw_user_meta_data ->> 'permissions', 'member'),
  jsonb_build_object(
    'role', coalesce(u.raw_user_meta_data ->> 'role', 'afk'),
    'keywords', coalesce(
      (u.raw_user_meta_data -> 'keywords')::jsonb,
      '[]'::jsonb
    )
  ),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE up.id IS NULL;  -- Only insert for users without existing profiles