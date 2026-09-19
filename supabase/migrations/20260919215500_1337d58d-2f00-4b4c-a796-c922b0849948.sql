CREATE TABLE public.user_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_session_id uuid NOT NULL,
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  signed_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_access_sessions_user_client_unique UNIQUE (user_id, client_session_id),
  CONSTRAINT user_access_sessions_time_order CHECK (
    last_seen_at >= signed_in_at
    AND (signed_out_at IS NULL OR signed_out_at >= signed_in_at)
  )
);

GRANT ALL ON public.user_access_sessions TO service_role;

ALTER TABLE public.user_access_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX user_access_sessions_user_signed_in_idx
  ON public.user_access_sessions (user_id, signed_in_at DESC);
CREATE INDEX user_access_sessions_retention_idx
  ON public.user_access_sessions (signed_in_at);

COMMENT ON TABLE public.user_access_sessions IS
  'Histórico de períodos de acesso ao aplicativo, retido por 12 meses.';