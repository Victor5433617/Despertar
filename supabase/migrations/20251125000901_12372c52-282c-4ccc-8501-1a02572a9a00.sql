-- Sincronizar usuarios existentes en auth.users con la tabla profiles
-- Esto creará perfiles para cualquier usuario que no tenga uno

INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Asignar rol de admin al primer usuario si no tiene rol
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;