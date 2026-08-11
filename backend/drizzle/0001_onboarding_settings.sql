-- Colunas de onboarding em user_settings (renda/saldo inicial via agente IA)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS initial_balance numeric(12, 2);

-- Usuários com transações já existentes não precisam do rapport
UPDATE user_settings us
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM transactions t WHERE t.user_id = us.user_id LIMIT 1
);
