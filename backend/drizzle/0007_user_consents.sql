-- Aceites legais LGPD no cadastro web (auditoria por usuário)
DO $$ BEGIN
  CREATE TYPE consent_type AS ENUM ('terms_of_use', 'privacy_policy', 'data_processing_lgpd');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  CONSTRAINT user_consents_user_type_version UNIQUE (user_id, consent_type, document_version)
);

CREATE INDEX IF NOT EXISTS user_consents_user_id_idx ON user_consents(user_id);
