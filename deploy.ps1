# =============================================================================
# DEPLOY.PS1 — Script de publicação rápida (banco + Git push)
# =============================================================================
#
# O que é: automação PowerShell na RAIZ do monorepo Controla.AI.
#
# Para que serve: antes de ir para produção, (1) sincroniza o schema Postgres com
# db:setup (drizzle push + seed) e (2) faz git add/commit/push para origin main.
# O push dispara deploy automático na Railway (backend) e Vercel (frontend).
#
# Uso:
#   .\deploy.ps1
#   .\deploy.ps1 "mensagem do commit"
#   npm run deploy   (chama este script)
#
# Conexões:
#   - backend/ → npm run db:setup (DATABASE_URL do .env ou Railway)
#   - GitHub → Railway + Vercel CI/CD
#   - NÃO envia .env — segredos ficam nos painéis Railway/Vercel
#
# Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
# =============================================================================

param(
    [string]$Mensagem = "ajustes"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host ">> Banco: db:push + db:seed" -ForegroundColor Cyan
Push-Location "$Root\backend"
npm run db:setup
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host ">> Git: add, commit, push" -ForegroundColor Cyan
Set-Location $Root
git add .
git status
git commit -m $Mensagem
git push origin main

Write-Host ">> Concluído." -ForegroundColor Green
