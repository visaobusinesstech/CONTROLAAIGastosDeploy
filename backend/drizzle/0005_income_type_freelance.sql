-- Tipo de renda e prazo freelance — Controla.ai
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS income_type text;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS income_is_recurring boolean;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS income_end_date date;
