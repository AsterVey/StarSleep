param([ValidateSet('codex','claude')][string]$Provider)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$connectionPath = Join-Path $PSScriptRoot 'connection.json'
if (!(Test-Path -LiteralPath $connectionPath)) { [Console]::Out.WriteLine('{}'); exit 0 }
try {
  $raw = [Console]::In.ReadToEnd()
  if ($raw.Length -gt 2097152) { throw 'Hook input too large' }
  $inputEvent = $raw | ConvertFrom-Json
  $connection = Get-Content -LiteralPath $connectionPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($connection.port -lt 1 -or $connection.port -gt 65535) { throw 'Invalid bridge port' }
  $eventName = switch ($inputEvent.hook_event_name) {
    'UserPromptSubmit' { 'start' }
    'PreToolUse' { if ($inputEvent.tool_name -match '(?i)(askuserquestion|ask_user|request_user_input)') { 'waiting' } else { 'running' } }
    'PostToolUse' { 'running' }
    'PermissionRequest' { 'waiting' }
    'Notification' { if ($inputEvent.notification_type -eq 'permission_prompt') { 'waiting' } else { '' } }
    'SubagentStart' { 'child-start' }
    'SubagentStop' { 'child-stop' }
    'Stop' { 'stop' }
    'StopFailure' { 'failed' }
    'Interrupt' { 'interrupted' }
    'SessionEnd' { 'end' }
    default { '' }
  }
  if (!$eventName) { [Console]::Out.WriteLine('{}'); exit 0 }
  $ancestor = $PID
  $agentPid = 0
  for ($depth = 0; $depth -lt 10; $depth++) {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ancestor"
    if (!$processInfo -or !$processInfo.ParentProcessId) { break }
    $ancestor = [int]$processInfo.ParentProcessId
    $parentInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ancestor"
    if ($parentInfo.Name -match '^(codex|claude|claude-code|claude-cli)(\.exe)?$') { $agentPid = $ancestor; break }
  }
  # Unrecognized client processes cannot become eligible for shutdown.
  if (!$agentPid) { throw 'Cannot identify agent process' }
  $message = [string]$inputEvent.last_assistant_message
  if ($message.Length -gt 3900) { $message = $message.Substring($message.Length - 3900) }
  $backgroundClear = $false
  if ($Provider -eq 'claude') {
    $backgroundClear = ($null -ne $inputEvent.background_tasks -and $null -ne $inputEvent.session_crons -and @($inputEvent.background_tasks).Count -eq 0 -and @($inputEvent.session_crons).Count -eq 0)
  }
  $body = @{
    provider=$Provider; event=$eventName; sessionId=[string]$inputEvent.session_id
    name=(Split-Path -Path ([string]$inputEvent.cwd) -Leaf); pid=$agentPid
    at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); eventId=[guid]::NewGuid().ToString()
    message=$message; backgroundClear=$backgroundClear
  }
  if ($inputEvent.turn_id) { $body.turnId = [string]$inputEvent.turn_id }
  if ($inputEvent.agent_id) { $body.agentId = [string]$inputEvent.agent_id }
  $json = $body | ConvertTo-Json -Compress -Depth 8
  $response = Invoke-RestMethod -Method Post -Uri ("http://127.0.0.1:" + $connection.port + '/event') -Headers @{ Authorization=('Bearer ' + $connection.token) } -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 2
  if ($eventName -eq 'start' -and $response.context) {
    @{hookSpecificOutput=@{hookEventName='UserPromptSubmit';additionalContext=[string]$response.context}} | ConvertTo-Json -Compress -Depth 5
  } else { [Console]::Out.WriteLine('{}') }
} catch {
  # A lost event invalidates an armed watch. Never block or steer the Agent on failure.
  try { [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'connection-fault.txt'), [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()) } catch {}
  [Console]::Out.WriteLine('{}')
}
exit 0
