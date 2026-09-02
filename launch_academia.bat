@echo off
title Academia Server
if exist "%~dp0build\academia-server.exe" (
    "%~dp0build\academia-server.exe"
) else (
    dart run bin/server.dart
)
