-- Account-level Study Lab state such as phrasal verb favorites.
CREATE TABLE IF NOT EXISTS public.study_lab_user_state (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  state_key TEXT NOT NULL,
  state_value TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_study_lab_user_state_user_key UNIQUE (user_id, state_key)
);

CREATE INDEX IF NOT EXISTS idx_study_lab_user_state_user_id
  ON public.study_lab_user_state (user_id);

CREATE OR REPLACE FUNCTION public.set_study_lab_user_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_study_lab_user_state_updated_at
  ON public.study_lab_user_state;

CREATE TRIGGER trg_study_lab_user_state_updated_at
BEFORE UPDATE ON public.study_lab_user_state
FOR EACH ROW
EXECUTE FUNCTION public.set_study_lab_user_state_updated_at();
