# Build script for Academia Windows Installer
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Building Academia Windows Installer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Ensure Build and Installer Output Directories Exist
if (!(Test-Path "build")) {
    New-Item -ItemType Directory -Force -Path "build" | Out-Null
}
if (!(Test-Path "installer_output")) {
    New-Item -ItemType Directory -Force -Path "installer_output" | Out-Null
}

# Copy existing database file with all user records into build folder
if (Test-Path "academy.db") {
    Copy-Item "academy.db" -Destination "build\academy.db" -Force
}

# 2. Build React Frontend
Write-Host "Step 1/3: Building React/Vite Frontend..." -ForegroundColor Yellow
Set-Location "academy"
cmd.exe /c "npm run build"
Set-Location ".."

# 3. Compile Dart Server Executable
Write-Host "Step 2/3: Compiling Dart Server Executable..." -ForegroundColor Yellow
dart compile exe bin/server.dart -o build/academia-server.exe
Set-Content -Path "build\launch_academia.bat" -Value "@echo off`r`ntitle Academia Server`r`n`"%~dp0academia-server.exe`""
Set-Content -Path "launch_academia.bat" -Value "@echo off`r`ntitle Academia Server`r`nif exist `"%~dp0build\academia-server.exe`" (`r`n    `"%~dp0build\academia-server.exe`"`r`n) else (`r`n    dart run bin/server.dart`r`n)"

# 4. Compile Inno Setup Installer
Write-Host "Step 3/3: Compiling Inno Setup Installer Executable..." -ForegroundColor Yellow
$innoCompiler = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if (Test-Path $innoCompiler) {
    & $innoCompiler Academia_Installer.iss
    Write-Host "Setup Installer Built Successfully in installer_output" -ForegroundColor Green
} else {
    Write-Host "Inno Setup Compiler ISCC.exe not found at path: $innoCompiler" -ForegroundColor Red
    Write-Host "Please compile Academia_Installer.iss manually using Inno Setup Compiler GUI." -ForegroundColor Red
}
