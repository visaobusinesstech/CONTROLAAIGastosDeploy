-- Token de reset com índice UNIQUE (lookup do link de “esqueci a senha”)
-- Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
-- Idempotente: local e Railway.

DROP INDEX IF EXISTS password_reset_tokens_token_sha256_idx;

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_token_sha256_uidx
  ON password_reset_tokens (token_sha256);
