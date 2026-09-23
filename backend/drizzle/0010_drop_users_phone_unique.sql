-- Cadastro web não pode falhar porque o WhatsApp já está em outro users.phone
-- Doc TCC: TCC_DOCUMENTACAO.md

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%phone%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%email%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS users_phone_key;
DROP INDEX IF EXISTS users_phone_unique;

CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone);
