# Usage: .\scripts\git-push.ps1 "commit message"
# Or: npm run git:push -- "commit message"

param(
    [Parameter(Position = 0)]
    [string]$Message = "update: controla.ai changes"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ""
Write-Host "=== Controla.ai Git Push ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

if (-not (Test-Path ".git")) {
    Write-Host "Running git init..." -ForegroundColor Yellow
    git init
    git branch -M main
    $remote = git remote get-url origin 2>$null
    if (-not $remote) {
        git remote add origin https://github.com/visaobusinesstech/CONTROLAAIGastosDeploy.git
        Write-Host "Remote origin added." -ForegroundColor Green
    }
}

Write-Host "--- git status ---" -ForegroundColor Gray
git status

$porcelain = git status --porcelain
if (-not $porcelain) {
    Write-Host ""
    Write-Host "Nothing to commit." -ForegroundColor Yellow
    $ahead = git rev-list --count origin/main..HEAD 2>$null
    if ($ahead -and [int]$ahead -gt 0) {
        Write-Host "Pushing $ahead pending commit(s)..." -ForegroundColor Yellow
        git push -u origin main
        Write-Host "Push done!" -ForegroundColor Green
    } else {
        Write-Host "Already synced with origin/main." -ForegroundColor Green
    }
    exit 0
}

Write-Host ""
Write-Host "--- git add ---" -ForegroundColor Gray
git add -A

$staged = git diff --cached --name-only
foreach ($f in $staged) {
    if ($f -match "\.env$" -and $f -notmatch "\.env\.example$") {
        Write-Host "ERROR: refusing to commit secret file: $f" -ForegroundColor Red
        git reset HEAD $f
        exit 1
    }
}

Write-Host ""
Write-Host "--- git commit ---" -ForegroundColor Gray
git commit -m $Message

Write-Host ""
Write-Host "--- git push ---" -ForegroundColor Gray
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Push failed. Try: git pull --rebase origin main" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Push successful!" -ForegroundColor Green
Write-Host "Repo: https://github.com/visaobusinesstech/CONTROLAAIGastosDeploy"
Write-Host ""
