-- Auditoria de cadastros, inativação (sem DELETE físico) e campos LGPD por nível
-- Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar

DO $$ BEGIN
  CREATE TYPE access_level AS ENUM ('user', 'viewer', 'operator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('insert', 'update', 'inactivate', 'activate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS access_level access_level NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
UPDATE users SET access_level = 'admin' WHERE lower(email) = 'admin@admin.com';

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE document_imports ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  routine text NOT NULL,
  action audit_action NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  details jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_occurred_at_idx ON audit_logs (occurred_at);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity);

CREATE TABLE IF NOT EXISTS lgpd_sensitive_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  field_name text NOT NULL,
  label text NOT NULL,
  hide_from_operator boolean NOT NULL DEFAULT false,
  hide_from_viewer boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lgpd_sensitive_fields_entity_field UNIQUE (entity, field_name)
);

INSERT INTO lgpd_sensitive_fields (entity, field_name, label, hide_from_operator, hide_from_viewer)
VALUES
  ('users', 'email', 'E-mail', false, true),
  ('users', 'phone', 'Telefone / WhatsApp', true, true),
  ('transactions', 'raw_message', 'Mensagem original WhatsApp', true, true),
  ('whatsapp_messages', 'content', 'Conteúdo da mensagem WhatsApp', true, true),
  ('whatsapp_messages', 'remote_phone', 'Telefone remoto WhatsApp', true, true),
  ('ai_logs', 'prompt', 'Prompt enviado à IA', true, true),
  ('ai_logs', 'response', 'Resposta da IA', true, true),
  ('user_consents', 'ip_address', 'Endereço IP', true, true),
  ('audit_logs', 'ip_address', 'IP da auditoria', true, true)
ON CONFLICT (entity, field_name) DO NOTHING;
