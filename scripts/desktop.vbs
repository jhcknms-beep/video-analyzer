' Video Analyzer - Desktop Application
' Double-click to launch as a native desktop app
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(root)

' Kill old processes
WshShell.Run "taskkill /f /im python.exe >nul 2>&1", 0, True
WshShell.Run "taskkill /f /im pythonw.exe >nul 2>&1", 0, True

' Start backend detached
WshShell.CurrentDirectory = root & "\backend"
WshShell.Run "C:\Users\admin\AppData\Local\Programs\Python\Python312\pythonw.exe -m uvicorn main:app --host 0.0.0.0 --port 8001", 0, False
WScript.Sleep 4000

' Start frontend detached
WshShell.CurrentDirectory = root & "\frontend"
WshShell.Run "cmd /c npm run dev", 0, False
WScript.Sleep 6000

' Open in Chrome app mode (frameless window)
chrome = ""
for each p in Array( _
    "C:\Program Files\Google\Chrome\Application\chrome.exe", _
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", _
    WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe", _
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", _
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe" _
)
    if fso.FileExists(p) then chrome = p : exit for
next

if chrome <> "" then
    WshShell.Run """" & chrome & """ --app=http://localhost:3000 --window-size=1400,900 --window-position=center", 1, False
else
    WshShell.Run "http://localhost:3000", 1, False
end if
