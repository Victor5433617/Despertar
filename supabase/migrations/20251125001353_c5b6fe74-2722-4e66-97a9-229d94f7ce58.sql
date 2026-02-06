-- Agregar política para que admins puedan insertar roles
CREATE POLICY "Admins can insert user_roles" ON public.user_roles
  FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));