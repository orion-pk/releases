param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Version = "0.6.0"
)

$ErrorActionPreference = "Stop"

# Clean leading 'v' and strip any accidental newlines or whitespace
$Version = $Version -replace '\s+', '' -replace '^v', ''
$TagName = "academy-v$Version"
$InstallerExe = "installer_output\Academia_Setup_v$Version.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Automated Release Process: v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Ensure Directories Exist
if (-not (Test-Path "build")) { New-Item -ItemType Directory -Force -Path "build" | Out-Null }
if (-not (Test-Path "installer_output")) { New-Item -ItemType Directory -Force -Path "installer_output" | Out-Null }

# 2. Auto-Update Version Numbers in Project Files
Write-Host ""
Write-Host "[1/6] Auto-updating version in pubspec.yaml, server.dart and Academia_Installer.iss..." -ForegroundColor Yellow

$pubContent = Get-Content pubspec.yaml
for ($i = 0; $i -lt $pubContent.Count; $i++) {
    if ($pubContent[$i] -like 'version:*') {
        $pubContent[$i] = "version: $Version"
    }
}
$pubContent | Set-Content pubspec.yaml

$issContent = Get-Content Academia_Installer.iss
for ($i = 0; $i -lt $issContent.Count; $i++) {
    if ($issContent[$i] -like '#define MyAppVersion*') {
        $issContent[$i] = '#define MyAppVersion "' + $Version + '"'
    } elseif ($issContent[$i] -like 'OutputBaseFilename=*') {
        $issContent[$i] = "OutputBaseFilename=Academia_Setup_v$Version"
    }
}
$issContent | Set-Content Academia_Installer.iss

$serverContent = Get-Content bin\server.dart
for ($i = 0; $i -lt $serverContent.Count; $i++) {
    if ($serverContent[$i] -like 'const String ACADEMY_CURRENT_VERSION*') {
        $serverContent[$i] = "const String ACADEMY_CURRENT_VERSION = '$Version';"
    }
}
$serverContent | Set-Content bin\server.dart

$badgePath = "academy\src\components\VersionBadge.jsx"
if (Test-Path $badgePath) {
    $badgeContent = Get-Content $badgePath
    for ($i = 0; $i -lt $badgeContent.Count; $i++) {
        if ($badgeContent[$i] -like "*|| '$Version'*") {
            # Already matching version
        } elseif ($badgeContent[$i] -like "*localStorage.getItem('academy_app_version') || '*") {
            $badgeContent[$i] = "    return localStorage.getItem('academy_app_version') || '$Version';"
        }
    }
    $badgeContent | Set-Content $badgePath
}

Write-Host "OK - Version numbers synced to $Version" -ForegroundColor Green

# 3. Commit version changes
Write-Host ""
Write-Host "[2/6] Committing version changes to main..." -ForegroundColor Yellow
git add pubspec.yaml Academia_Installer.iss bin\server.dart
git commit -m "chore: release version $Version" --allow-empty
git push origin main
Write-Host "OK - Version changes committed and pushed to main" -ForegroundColor Green

# 4. Build React Frontend
Write-Host ""
Write-Host "[3/6] Building React Frontend..." -ForegroundColor Yellow
Set-Location "academy"
cmd.exe /c "npm run build"
Set-Location ".."

# 5. Compile Dart Server Executable & Create Batch Launcher
Write-Host ""
Write-Host "[4/6] Compiling Standalone Dart Server Executable..." -ForegroundColor Yellow
dart compile exe bin/server.dart -o build/academia-server.exe
Set-Content -Path "build\launch_academia.bat" -Value "@echo off`r`nstart `"`" `"%~dp0academia-server.exe`""

# 6. Compile Inno Setup Windows Installer (.exe)
Write-Host ""
Write-Host "[5/6] Compiling Windows Installer executable..." -ForegroundColor Yellow
$innoCompiler = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (Test-Path $innoCompiler) {
    & $innoCompiler Academia_Installer.iss
} else {
    throw "Inno Setup Compiler (ISCC.exe) not found at default path: $innoCompiler"
}

if (-not (Test-Path $InstallerExe)) {
    throw "Installer executable not found at $InstallerExe"
}
Write-Host "OK - Installer created: $InstallerExe" -ForegroundColor Green

# 7. Push Release to GitHub (orion-pk/releases)
Write-Host ""
Write-Host "[6/6] Computing SHA-256 and Pushing Release to GitHub..." -ForegroundColor Yellow
$notes = "Academy Platform Release $TagName"

$ghArgs = @(
    "release", "create", $TagName,
    $InstallerExe,
    "--repo", "orion-pk/releases",
    "--title", "Academy Platform v$Version",
    "--notes", $notes
)

if ($Version -match '-beta' -or $Version -match '-alpha' -or $Version -match '-rc') {
    $ghArgs += "--prerelease"
}

try {
    gh @ghArgs
} catch {
    Write-Warning "Release exists, re-uploading installer asset with --clobber..."
    gh release upload $TagName $InstallerExe --repo orion-pk/releases --clobber
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Release $Version Published Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
