-- Migration 0012 — OTP no esqueci senha + exclusão física em auditoria
-- Doc TCC: TCC_DOCUMENTACAO.md

-- Propósito OTP para redefinição de senha em 2 etapas
DO $$ BEGIN
  ALTER TYPE two_factor_purpose ADD VALUE IF NOT EXISTS 'password_reset';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ação de exclusão física (só admin@admin.com via API)
DO $$ BEGIN
  ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'delete';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
