# Deploy Automation Script
# Configura Vercel + Supabase + Deploy automatico

param(
    [string]$VercelToken,
    [string]$DatabaseUrl,
    [string]$ProjectId = "pj_L3AFbPwKdmo5gj0DgOV4noQtcsNI"
)

Write-Host "[SETUP] Monitor Precios IT - Deploy Automation" -ForegroundColor Cyan
Write-Host "=" * 60

# 1. Validar tokens
Write-Host "`n[1/3] Validating credentials..." -ForegroundColor Yellow
if (-not $VercelToken) {
    Write-Host "[ERROR] VERCEL_TOKEN not provided" -ForegroundColor Red
    exit 1
}
if (-not $DatabaseUrl) {
    Write-Host "[ERROR] DATABASE_URL not provided" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Credentials valid" -ForegroundColor Green

# 2. Configurar variables en Vercel via API
Write-Host "`n[2/3] Configuring Vercel environment variables..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type"  = "application/json"
}

$envVars = @(
    @{
        key    = "DATABASE_URL"
        value  = $DatabaseUrl
        target = @("production", "preview")
    },
    @{
        key    = "SERP_API_KEY"
        value  = "local_serpapi_key_replace_before_real_scraping"
        target = @("production", "preview")
    },
    @{
        key    = "SERP_PROVIDER"
        value  = "serpapi"
        target = @("production", "preview")
    },
    @{
        key    = "CRON_SECRET"
        value  = (New-Guid).Guid.Replace("-", "").Substring(0, 32)
        target = @("production", "preview")
    },
    @{
        key    = "SCRAPER_MAX_COMPANIES_PER_RUN"
        value  = "25"
        target = @("production", "preview")
    },
    @{
        key    = "SCRAPER_TARGET_CITY"
        value  = "Cordoba Capital, Cordoba, Argentina"
        target = @("production", "preview")
    }
)

$successCount = 0
$totalCount = $envVars.Count

foreach ($envVar in $envVars) {
    $body = $envVar | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod `
            -Uri "https://api.vercel.com/v10/projects/$ProjectId/env" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "  [+] $($envVar.key)" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  [!] $($envVar.key): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n[OK] Variables configured: $successCount/$totalCount" -ForegroundColor Green

# 3. Deploy a Vercel
Write-Host "`n[3/3] Starting Vercel deployment..." -ForegroundColor Cyan

$env:VERCEL_TOKEN = $VercelToken

try {
    & vercel --prod
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[OK] Deployment completed!" -ForegroundColor Green
        Write-Host "`n[INFO] Dashboard: https://monitor-precios-it-johanseb15s-projects.vercel.app" -ForegroundColor Cyan
    }
    else {
        Write-Host "`n[ERROR] Deployment failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "`n[ERROR] Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n" * 2
Write-Host "[OK] Setup completed!" -ForegroundColor Green
Write-Host "=" * 60
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Git commits to 'main' trigger auto-deploy"
Write-Host "  2. GitHub Actions runs tests before deploy"
Write-Host "  3. Database synced with Supabase"
Write-Host "`nRepository: https://github.com/johanseb15/it-support-price-monitor" -ForegroundColor Cyan
