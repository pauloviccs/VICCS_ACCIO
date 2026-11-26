@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VICCS Accio RP - Gerenciador do Servidor ArcaneMP

where powershell >nul 2>nul
if errorlevel 1 (
    echo [ERRO] PowerShell nao encontrado no sistema.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-manager.ps1" %*
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo [AVISO] O gerenciador encerrou com codigo %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%

