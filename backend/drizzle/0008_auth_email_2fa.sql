-- Recuperação de senha, confirmação de e-mail e verificação em 2 etapas (OTP)
-- Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
-- Idempotente: pode rodar local e em produção (Railway) sem quebrar schema existente.

-- Contas já cadastradas entram como e-mail verificado (não trava login legado)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Novos cadastros via ORM começam com e-mail ainda não confirmado
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;

UPDATE users
SET email_verified_at = created_at
WHERE email_verified = true
  AND email_verified_at IS NULL;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE two_factor_method AS ENUM ('email', 'app', 'sms');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE two_factor_purpose AS ENUM ('register', 'login', 'enable', 'disable');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256 text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_token_sha256_idx
  ON password_reset_tokens (token_sha256);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS two_factor_secrets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  method two_factor_method NOT NULL DEFAULT 'email',
  secret_base32 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS two_factor_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose two_factor_purpose NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS two_factor_challenges_user_id_idx
  ON two_factor_challenges (user_id);
