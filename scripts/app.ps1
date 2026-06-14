# Video Analyzer - Desktop App Window
$root = Split-Path $PSScriptRoot -Parent

# Start services
& "$PSScriptRoot\launcher.bat"

# Find Chrome
$chrome = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Start-Process $chrome -ArgumentList "--app=http://localhost:3000", "--window-size=1400,900", "--window-position=center"
} else {
    Start-Process "http://localhost:3000"
}
