# Configura secrets de GitHub Actions para CI/CD (requiere: gh auth login)
param(
    [string]$ProductionUrl = "https://monitor-precios-it.vercel.app"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "Instala GitHub CLI: https://cli.github.com/"
}

$envFile = Resolve-Path (Join-Path $PSScriptRoot "..\.env.local")
if (-not $envFile) {
    Write-Error "No existe .env.local. Ejecuta antes: npx vercel env pull .env.local --environment=production --yes"
}

function Get-EnvValue([string]$Name) {
    $line = Get-Content $envFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if (-not $line) {
        return $null
    }

    return $line.Substring($Name.Length + 1).Trim().Trim('"')
}

$secrets = @{
    APP_BASE_URL = $ProductionUrl
    CRON_SECRET  = Get-EnvValue "CRON_SECRET"
}

foreach ($entry in $secrets.GetEnumerator()) {
    if (-not $entry.Value) {
        Write-Warning "Omitido $($entry.Key): valor vacio"
        continue
    }

    $entry.Value | gh secret set $entry.Key
    Write-Host "[OK] $($entry.Key)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Configura manualmente en GitHub -> Settings -> Secrets:" -ForegroundColor Yellow
Write-Host "  VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"
Write-Host "  VERCEL_ORG_ID=team_OkUyls2cYYMiHdMAS9quELDK"
Write-Host "  VERCEL_PROJECT_ID=prj_L3AFbPwKdmo5gj0DgOV4noQtcsNI"
