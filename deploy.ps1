# Heart Island Beta 0.9.5 — Deploy Script
# Copies root source files to deploy/ and creates zip archive
# Run: powershell -ExecutionPolicy Bypass -File deploy.ps1

$root = "c:\Users\Haru\Desktop\Heart Island(VS Code))"
$deploy = "$root\deploy"

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Heart Island Beta 0.9.5 — Deploy" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Copy root source files to deploy
Write-Host "[1/3] Copying source files to deploy\" -ForegroundColor Yellow

$files = @("index.html", "styles.css", "app.js")
foreach ($f in $files) {
    $src = Join-Path $root $f
    $dst = Join-Path $deploy $f
    Copy-Item $src -Destination $dst -Force
    $size = (Get-Item $dst).Length
    Write-Host "  $f → deploy\$f  ($([math]::Round($size/1024,1)) KB)" -ForegroundColor Green
}

# 2. Verify deploy files match root
Write-Host ""
Write-Host "[2/3] Verifying deploy/ matches root" -ForegroundColor Yellow
$allMatch = $true
foreach ($f in $files) {
    $src = Join-Path $root $f
    $dst = Join-Path $deploy $f
    $srcHash = (Get-FileHash $src -Algorithm SHA256).Hash
    $dstHash = (Get-FileHash $dst -Algorithm SHA256).Hash
    if ($srcHash -eq $dstHash) {
        Write-Host "  $f : MATCH" -ForegroundColor Green
    } else {
        Write-Host "  $f : MISMATCH" -ForegroundColor Red
        $allMatch = $false
    }
}

if (-not $allMatch) {
    Write-Host ""
    Write-Host "  WARNING: Some files don't match. Re-running copy..." -ForegroundColor Yellow
    foreach ($f in $files) {
        Copy-Item (Join-Path $root $f) -Destination (Join-Path $deploy $f) -Force
    }
}

# 3. Create zip
Write-Host ""
Write-Host "[3/3] Creating zip archive" -ForegroundColor Yellow
$zipPath = Join-Path $root "heart-island-beta-0.9.5-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$deployFiles = @(
    (Join-Path $deploy "index.html"),
    (Join-Path $deploy "styles.css"),
    (Join-Path $deploy "app.js")
)
Compress-Archive -Path $deployFiles -DestinationPath $zipPath -Force
$zipSize = (Get-Item $zipPath).Length
Write-Host "  heart-island-beta-0.9.5-deploy.zip  ($([math]::Round($zipSize/1024,1)) KB)" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Deploy complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host " Deploy files (3):" -ForegroundColor White
foreach ($f in $files) {
    $size = (Get-Item (Join-Path $deploy $f)).Length
    Write-Host "   deploy\$f  ($([math]::Round($size/1024,1)) KB)" -ForegroundColor Gray
}
Write-Host " Zip: heart-island-beta-0.9.5-deploy.zip" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
