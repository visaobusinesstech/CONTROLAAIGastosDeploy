-- Perfil de renda: recorrência (monthly_fixed | manual | weekly) para memória do agente
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS income_recurrence text;
