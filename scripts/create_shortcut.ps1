$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Video Analyzer.lnk"
$launcherPath = Join-Path $PSScriptRoot "launcher.ps1"

# Remove old shortcut if exists
if (Test-Path $shortcutPath) { Remove-Item $shortcutPath -Force }

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`""
$Shortcut.WorkingDirectory = Split-Path $launcherPath -Parent
$Shortcut.WindowStyle = 7
$Shortcut.Description = "Short Video Batch Analyzer"
$Shortcut.Save()

Write-Host "Desktop shortcut created!" -ForegroundColor Green
