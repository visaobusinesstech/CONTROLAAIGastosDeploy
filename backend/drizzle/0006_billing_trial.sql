-- Trial de 30 dias + usuários legados isentos de cobrança
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_grandfathered boolean NOT NULL DEFAULT false;

-- Contas já existentes no deploy mantêm acesso gratuito permanente
UPDATE users SET billing_grandfathered = true WHERE billing_grandfathered = false;

-- Novos usuários (após migration) recebem trial ao cadastrar via app
-- Usuários não-legados sem trial: 30 dias a partir de agora (só se coluna acabou de ser criada)
UPDATE users
SET trial_ends_at = NOW() + INTERVAL '30 days'
WHERE billing_grandfathered = false
  AND trial_ends_at IS NULL
  AND email <> 'admin@admin.com';
