CREATE POLICY "Serviço interno gerencia sessões de acesso"
ON public.user_access_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);