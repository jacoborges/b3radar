ALTER TABLE public.user_settings
ADD COLUMN selected_sectors jsonb;

COMMENT ON COLUMN public.user_settings.selected_sectors IS
  'Setores exibidos nas listas do usuário; NULL representa todos os setores.';