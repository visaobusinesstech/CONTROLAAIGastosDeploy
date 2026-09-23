-- Dia do recebimento da renda (memória do agente / registro automático mensal)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS income_pay_day integer;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS income_pay_weekday integer;
