' Video Analyzer - Silent Launcher
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(root)

WshShell.CurrentDirectory = root

WshShell.Run "pythonw -m uvicorn main:app --host 0.0.0.0 --port 8001", 0, False
WScript.Sleep 4000

WshShell.CurrentDirectory = root & "\frontend"
WshShell.Run "cmd /c npm run dev", 0, False
WScript.Sleep 6000

WshShell.Run "http://localhost:3000"
