$ErrorActionPreference = 'Stop'
$projectDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$installerPath = Join-Path $projectDir 'release/StarSleep-Setup-1.0.0.exe'
$checkDir = [System.IO.Path]::GetFullPath((Join-Path $projectDir '.install-check'))
if (-not $checkDir.StartsWith($projectDir + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Unexpected installation test path' }
$existing = Get-ChildItem 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall' | ForEach-Object { Get-ItemProperty -LiteralPath $_.PSPath } | Where-Object { $_.DisplayName -eq '星眠' }
if ($existing) { throw 'An existing installation was found. Leave it intact and inspect before running the installation test.' }
$installProcess = Start-Process -FilePath $installerPath -ArgumentList @('/S', "/D=$checkDir") -WindowStyle Hidden -Wait -PassThru
if ($installProcess.ExitCode -ne 0) { throw "Installer failed: $($installProcess.ExitCode)" }
$appExe = Join-Path $checkDir '星眠.exe'
if (-not (Test-Path -LiteralPath $appExe)) { throw 'Installed executable missing' }
$desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) '星眠.lnk'
if (-not (Test-Path -LiteralPath $desktopLink)) { throw 'Desktop shortcut missing' }
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($desktopLink)
if ($shortcut.TargetPath -ne $appExe) { throw 'Desktop shortcut target is incorrect' }
node (Join-Path $PSScriptRoot 'installed-smoke.cjs') $appExe
if ($LASTEXITCODE -ne 0) { throw 'Installed application smoke test failed' }
$uninstaller = Join-Path $checkDir 'Uninstall 星眠.exe'
if (-not (Test-Path -LiteralPath $uninstaller)) { throw 'Uninstaller missing' }
$uninstallProcess = Start-Process -FilePath $uninstaller -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
for ($attempt = 0; $attempt -lt 20 -and (Test-Path -LiteralPath $appExe); $attempt++) { Start-Sleep -Milliseconds 500 }
if (Test-Path -LiteralPath $appExe) { throw 'Uninstall did not remove the app' }
if (Test-Path -LiteralPath $desktopLink) { throw 'Uninstall did not remove the shortcut' }
@{ install = 'passed'; shortcut = 'passed'; installedLaunch = 'passed'; uninstall = 'passed'; testDirectory = $checkDir } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectDir 'artifacts/install-check.json') -Encoding utf8
Write-Output 'Install, shortcut, installed launch and uninstall passed.'
