-- Modificar la función handle_new_user para NO asignar rol automáticamente
-- Los nuevos usuarios deben esperar a que un admin les asigne un rol

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo insertar el perfil, NO asignar rol automáticamente
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  RETURN NEW;
END;
$$;