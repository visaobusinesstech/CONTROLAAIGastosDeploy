-- PASSO 1 no DBeaver: conecte em localhost:5432 como usuário "postgres" (senha: postgres)
-- PASSO 2: execute este script
-- PASSO 3: nova conexão → database controlaai → execute 0000_full_schema.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'controlaai') THEN
    CREATE ROLE controlaai LOGIN PASSWORD 'controlaai123';
  END IF;
END $$;

SELECT 'OK' WHERE EXISTS (SELECT 1 FROM pg_database WHERE datname = 'controlaai');

-- Se o banco ainda não existir, rode manualmente:
-- CREATE DATABASE controlaai OWNER controlaai;
