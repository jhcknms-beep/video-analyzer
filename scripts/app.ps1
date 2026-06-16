# Video Analyzer - Native Desktop App (WPF WebView2)
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

# Load WebView2 via .NET runtime
$code = @'
using System;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Wpf;
using Microsoft.Web.WebView2.Core;

public class AppWindow : Window {
    public AppWindow() {
        Title = "Video Analyzer";
        Width = 1440;
        Height = 920;
        MinWidth = 900;
        MinHeight = 600;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = System.Windows.Media.Brushes.Black;
        ResizeMode = ResizeMode.CanResizeWithGrip;

        var wv = new WebView2();
        wv.DefaultBackgroundColor = System.Drawing.Color.FromArgb(0x14, 0x14, 0x14);
        Content = wv;

        Loaded += async (s, e) => {
            var env = await CoreWebView2Environment.CreateAsync();
            await wv.EnsureCoreWebView2Async(env);
            wv.CoreWebView2.Navigate("http://localhost:3000");
            wv.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            wv.CoreWebView2.Settings.AreDevToolsEnabled = false;
        };
    }

    [STAThread]
    public static void Main() {
        var app = new Application();
        app.Run(new AppWindow());
    }
}
'@

# Try to compile and run
try {
    Add-Type -TypeDefinition $code -ReferencedAssemblies @(
        [System.AppDomain]::CurrentDomain.GetAssemblies() |
        Where-Object { $_.Location -like "*WebView2*" -or $_.Location -like "*PresentationFramework*" } |
        ForEach-Object { $_.Location }
    ) -ErrorAction Stop

    # Start services first
    $root = Split-Path $PSScriptRoot -Parent
    & "$root\scripts\launcher.bat"

    # Run the WPF window
    [AppWindow]::Main()
} catch {
    # Fallback: if WebView2 not available, inform user
    Write-Host "WebView2 Runtime not found. Install from: https://go.microsoft.com/fwlink/p/?LinkId=2124703" -ForegroundColor Yellow
    Write-Host "Starting in browser instead..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
}
