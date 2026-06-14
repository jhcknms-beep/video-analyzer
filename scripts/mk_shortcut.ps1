$desktop = [Environment]::GetFolderPath("Desktop")
$sp = Join-Path $desktop "Video Analyzer.lnk"
if (Test-Path $sp) { Remove-Item $sp -Force }
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($sp)
$sc.TargetPath = "C:\Users\admin\video-analyzer\scripts\desktop.vbs"
$sc.WorkingDirectory = "C:\Users\admin\video-analyzer"
$sc.WindowStyle = 7
$sc.Description = "Video Analyzer"
$sc.Save()
Write-Host "Done"
