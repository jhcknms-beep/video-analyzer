$desktop = [Environment]::GetFolderPath("Desktop")
$sp = Join-Path $desktop "Video Analyzer.lnk"
if (Test-Path $sp) { Remove-Item $sp -Force }
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($sp)
$sc.TargetPath = "C:\Users\admin\AppData\Local\Programs\Python\Python312\pythonw.exe"
$sc.Arguments = "C:\Users\admin\video-analyzer\desktop\app.py"
$sc.WorkingDirectory = "C:\Users\admin\video-analyzer\desktop"
$sc.WindowStyle = 7
$sc.IconLocation = "C:\Users\admin\video-analyzer\frontend\public\icon.ico"
$sc.Description = "Video Analyzer"
$sc.Save()
Write-Host "GUI shortcut created"
