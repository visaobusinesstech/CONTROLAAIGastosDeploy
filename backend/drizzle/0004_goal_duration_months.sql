-- Prazo da meta em meses (ex: "5 meses", "1 ano" = 12) — Controla.ai
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS duration_months integer;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz;
