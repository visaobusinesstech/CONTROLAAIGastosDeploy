# =============================================================================
# SETUP-TERMINAL.PS1 — Atalhos PowerShell para o dia a dia do TCC
# =============================================================================
#
# O que é: configura funções no perfil do PowerShell do Windows (roda UMA vez).
#
# Para que serve: cria atalhos ca (ir à pasta do projeto), castatus (git status) e
# capush (git add + commit + push via git-push.ps1). Agiliza o fluxo de desenvolvimento.
#
# Uso:
#   .\scripts\setup-terminal.ps1
#   Depois reabra o terminal ou rode: . $PROFILE
#
# Conexões:
#   - Aponta para a raiz do monorepo Controla.AI
#   - capush → scripts/git-push.ps1 → GitHub → Railway/Vercel
#
# Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
# =============================================================================

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProfilePath = $PROFILE.CurrentUserAllHosts
$Marker = "# === Controla.ai Git Shortcuts ==="

$Block = @"

$Marker
`$ControlaAiRoot = "$ProjectRoot"

function ca { Set-Location `$ControlaAiRoot }

function capush {
    param([string]`$m = "update: controla.ai changes")
    & "`$ControlaAiRoot\scripts\git-push.ps1" `$m
}

function castatus {
    Set-Location `$ControlaAiRoot
    git status
}
# === end Controla.ai ===
"@

if (Test-Path $ProfilePath) {
    $content = Get-Content $ProfilePath -Raw
    if ($content -match [regex]::Escape($Marker)) {
        Write-Host "Shortcuts already in profile." -ForegroundColor Yellow
    } else {
        Add-Content -Path $ProfilePath -Value $Block
        Write-Host "Shortcuts added to: $ProfilePath" -ForegroundColor Green
    }
} else {
    New-Item -Path $ProfilePath -ItemType File -Force | Out-Null
    Set-Content -Path $ProfilePath -Value $Block
    Write-Host "Profile created: $ProfilePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Commands (reopen terminal or run: . `$PROFILE):"
Write-Host "  ca              go to project folder"
Write-Host "  castatus        git status"
Write-Host "  capush          add + commit + push"
Write-Host '  capush "msg"    add + commit + push with message'
Write-Host ""
Write-Host "Or: npm run git:push -- ""your message"""
Write-Host ""
