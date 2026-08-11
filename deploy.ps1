# Deploy rápido: sincroniza banco Neon + commit + push
# Uso (na raiz do projeto): .\deploy.ps1
# Ou com mensagem: .\deploy.ps1 "minha mensagem"

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
