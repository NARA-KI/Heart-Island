# ============================================================
# Heart Island — PreToolUse Hook: 危险命令拦截
# 匹配条件: Bash 工具调用
# 作用: 检测命令是否包含 rm -rf / del /s / git reset --hard
#        以及是否删除 assets/ public/ deploy/ core/ 等关键路径
# ============================================================

$rawInput = [Console]::In.ReadLine()
if (-not $rawInput) { exit 0 }

try {
  $event = $rawInput | ConvertFrom-Json -ErrorAction Stop
} catch {
  # JSON 解析失败时放行 (保守策略)
  exit 0
}

$command = $event.tool_input.command
if (-not $command) { exit 0 }

# --- 危险命令模式列表 ---
$blockPatterns = @(
  # Unix: rm -rf 任意路径
  'rm\s+(-[a-z]*r[a-z]*f[a-z]*|-rf|--recursive.*--force)',
  # Windows: del /s /f 或 del /S
  'del\s+/[sS]',
  # PowerShell: Remove-Item -Recurse -Force
  'Remove-Item\s+.*(-Recurse|-r)\s*.*(-Force)',
  # Git 危险操作
  'git\s+reset\s+--hard',
  'git\s+clean\s+-[fF]',
  # 递归删除 + 关键目录
  'rm\s+.*(-r[a-z]*)\s+.*assets',
  'rm\s+.*(-r[a-z]*)\s+.*public',
  'rm\s+.*(-r[a-z]*)\s+.*deploy',
  'rm\s+.*(-r[a-z]*)\s+.*core',
  'rm\s+.*(-r[a-z]*)\s+.*scripts',
  'del\s+.*assets\\',
  'del\s+.*public\\',
  'del\s+.*deploy\\',
  'Remove-Item\s+.*assets',
  'Remove-Item\s+.*public',
  'Remove-Item\s+.*deploy',
  'Remove-Item\s+.*core',
  'Remove-Item\s+.*scripts',
  # 格式化 / 破坏性磁盘操作
  'format\s+[a-zA-Z]:',
  'diskpart'
)

foreach ($pattern in $blockPatterns) {
  if ($command -match $pattern) {
    Write-Output @"
{"decision":"block","reason":"⚠️ 检测到危险操作，已自动拦截。匹配规则: $pattern`n命令: $command`n`n如需执行，请在终端手动操作确认。"}
"@
    exit 1
  }
}

exit 0
