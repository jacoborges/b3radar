ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS bolsai_key text;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS hgbrasil_key text;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS partnr_key text;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS data_mode text NOT NULL DEFAULT 'hybrid';
ALTER TABLE public.user_settings ADD CONSTRAINT data_mode_valid CHECK (data_mode IN ('brapi','hybrid','alt_first'));