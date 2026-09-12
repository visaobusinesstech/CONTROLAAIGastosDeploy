-- Migration 0013: frequência do ganho/faturamento em transactions
-- Doc TCC: TCC_DOCUMENTACAO.md
-- Valores: monthly | recurring | non_recurring | sporadic (nullable; só faz sentido em type=income)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS income_frequency text;

COMMENT ON COLUMN transactions.income_frequency IS
  'Frequência do ganho: monthly, recurring, non_recurring, sporadic (null = não informado / despesa)';
