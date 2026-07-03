# ============================================================
# Heart Island - PostToolUse Hook: Auto-run audit scripts
# Trigger: Edit/Write on app.js / styles.css / index.html / core/*.mjs
# Effect: Runs npm audit:probability, audit:options, build (if they exist)
#         120s cooldown to avoid running too frequently
# ============================================================

$rawInput = [Console]::In.ReadLine()
if (-not $rawInput) { exit 0 }

try {
  $event = $rawInput | ConvertFrom-Json -ErrorAction Stop
}
catch {
  exit 0
}

$filePath = $event.tool_input.file_path
if (-not $filePath) { exit 0 }

# Only trigger for core file modifications
$isKeyFile = $filePath -match '(app\.js|styles\.css|index\.html|core[\\/].*\.mjs|scripts[\\/].*\.mjs)$'
if (-not $isKeyFile) { exit 0 }

# --- Cooldown: skip if last run was within 120 seconds ---
$projectRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$cooldownFile = Join-Path $projectRoot ".claude\hooks\.last-audit-timestamp"

if (Test-Path $cooldownFile) {
  try {
    $lastRun = [datetime]::Parse((Get-Content $cooldownFile -Raw).Trim())
    $elapsed = [datetime]::Now - $lastRun
    if ($elapsed.TotalSeconds -lt 120) {
      exit 0
    }
  }
  catch {
    # Timestamp file corrupted, continue anyway
  }
}

# --- Check and run scripts ---
$packageJsonPath = Join-Path $projectRoot "package.json"
if (-not (Test-Path $packageJsonPath)) {
  Write-Output "[hooks] WARN: package.json not found, skipping audit"
  exit 0
}

$pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$scripts = $pkg.scripts.PSObject.Properties.Name

Write-Output "[hooks] --- Post-audit triggered (modified: $filePath) ---"

# Save current location and switch to project root
$prevLocation = Get-Location
Set-Location $projectRoot

# 1. audit:probability
if ($scripts -contains "audit:probability") {
  Write-Output "[hooks] Running: npm run audit:probability..."
  $result = npm run audit:probability 2>&1
  if ($result) { $result | ForEach-Object { Write-Output $_ } }
  if ($LASTEXITCODE -ne 0) {
    Write-Output "[hooks] WARN: audit:probability exited with code $LASTEXITCODE"
  }
  else {
    Write-Output "[hooks] OK: audit:probability passed"
  }
}
else {
  Write-Output "[hooks] SKIP: audit:probability script not found"
}

# 2. audit:options
if ($scripts -contains "audit:options") {
  Write-Output "[hooks] Running: npm run audit:options..."
  $result = npm run audit:options 2>&1
  if ($result) { $result | ForEach-Object { Write-Output $_ } }
  if ($LASTEXITCODE -ne 0) {
    Write-Output "[hooks] WARN: audit:options exited with code $LASTEXITCODE"
  }
  else {
    Write-Output "[hooks] OK: audit:options passed"
  }
}
else {
  Write-Output "[hooks] SKIP: audit:options script not found"
}

# 3. build (may not exist - skip gracefully)
if ($scripts -contains "build") {
  Write-Output "[hooks] Running: npm run build..."
  $result = npm run build 2>&1
  if ($result) { $result | ForEach-Object { Write-Output $_ } }
  if ($LASTEXITCODE -ne 0) {
    Write-Output "[hooks] WARN: build exited with code $LASTEXITCODE"
  }
  else {
    Write-Output "[hooks] OK: build passed"
  }
}
else {
  Write-Output "[hooks] SKIP: build script not found"
}

Write-Output "[hooks] --- Audit complete ---"

# Restore original location
Set-Location $prevLocation

# Update cooldown timestamp
try {
  [datetime]::Now.ToString("o") | Set-Content $cooldownFile
}
catch {
  # Failed to write timestamp, ignore
}

exit 0
