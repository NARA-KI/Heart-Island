# ============================================================
# Heart Island — PostToolUse Hook: Prettier 自动格式化
# 匹配条件: Edit 或 Write 工具修改了 .html/.css/.js 文件
# 作用: 文件写入后自动运行 prettier --write
#       如果 prettier 未安装则静默跳过
# ============================================================

$rawInput = [Console]::In.ReadLine()
if (-not $rawInput) { exit 0 }

try {
  $event = $rawInput | ConvertFrom-Json -ErrorAction Stop
} catch {
  exit 0
}

$filePath = $event.tool_input.file_path
if (-not $filePath) { exit 0 }

# 只对 HTML / CSS / JS 文件格式化
if ($filePath -notmatch '\.(html|css|js|mjs)$') { exit 0 }
if (-not (Test-Path $filePath)) { exit 0 }

# 检查 prettier 是否可用
$prettierCheck = npx prettier --version 2>&1
if ($LASTEXITCODE -ne 0) {
  # prettier 未安装，静默跳过
  exit 0
}

# 执行格式化
$projectRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$absolutePath = if ([System.IO.Path]::IsPathRooted($filePath)) {
  $filePath
} else {
  [System.IO.Path]::Combine($projectRoot, $filePath)
}

if (-not (Test-Path $absolutePath)) { exit 0 }

$result = npx prettier --write $absolutePath 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Output "[hooks] ✓ prettier formatted: $filePath"
} else {
  Write-Output "[hooks] ⚠ prettier failed for: $filePath (will not block)"
}
exit 0
