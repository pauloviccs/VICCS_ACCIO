# ═════════════════════════════════════════════════════════════════════════════
# VICCS Accio RP — Launcher Local do Servidor ArcaneMP
# Executa pre-flight checks no diretorio de trabalho (server/) e inicia o runtime
# ═════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$serverExe = $null
foreach ($candidate in @('ArcaneMPServer.exe', 'HogwartsMPServer.exe')) {
    $fullPath = Join-Path $PSScriptRoot $candidate
    if (Test-Path $fullPath) {
        $serverExe = $fullPath
        break
    }
}

if (-not $serverExe) {
    Write-Host ''
    Write-Host '[ERRO] Executavel do servidor ArcaneMP nao encontrado em server/.' -ForegroundColor Red
    Write-Host 'Passos para concluir a instalacao:' -ForegroundColor Yellow
    Write-Host '  1. Baixe o ZIP oficial mais recente no canal #releases do Discord do ArcaneMP (https://discord.gg/C2rNGufVcF).'
    Write-Host '  2. Extraia todo o conteudo da pasta server/ do ZIP para dentro de:'
    Write-Host "     $PSScriptRoot"
    Write-Host '  3. Extraia a pasta client/ do MESMO ZIP para uma pasta separada para abrir o jogo e conectar em 127.0.0.1.'
    Write-Host ''
    exit 1
}

New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'logs') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'resources') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'data') | Out-Null

$serverJsonPath = Join-Path $PSScriptRoot 'server.json'
if (Test-Path $serverJsonPath) {
    try {
        $sCfg = Get-Content $serverJsonPath -Raw | ConvertFrom-Json
        $srvPort = if ($sCfg.port) { [int]$sCfg.port } else { 27016 }
        $conflicts = Get-NetTCPConnection -LocalPort $srvPort -State Listen -ErrorAction SilentlyContinue
        if ($conflicts) {
            $owner = Get-Process -Id $conflicts[0].OwningProcess -ErrorAction SilentlyContinue
            $ownerName = if ($owner) { "$($owner.ProcessName) (PID $($owner.Id))" } else { "PID $($conflicts[0].OwningProcess)" }
            Write-Host "[ERRO] A porta TCP $srvPort ja esta ocupada por $ownerName." -ForegroundColor Red
            Write-Host 'Altere "port" em server.json (ex: 27016 ou 27020) para o download de arquivos funcionar.' -ForegroundColor Yellow
            exit 1
        }
    } catch {}
}

$hasFoundations = Test-Path (Join-Path $PSScriptRoot 'resources\hmp-mysql\package.json')
if ($hasFoundations) {
    $mysqlCfgPath = Join-Path $PSScriptRoot 'data\hmp-mysql.json'
    if (Test-Path $mysqlCfgPath) {
        $mysqlCfg = Get-Content $mysqlCfgPath -Raw | ConvertFrom-Json
        if ($mysqlCfg.enabled -and $mysqlCfg.password -eq 'CHANGE_ME' -and -not $env:HMP_MYSQL_URL -and -not $env:HMP_MYSQL_PASSWORD) {
            Write-Host '[AVISO] data\hmp-mysql.json ainda esta com "password": "CHANGE_ME".' -ForegroundColor Yellow
            Write-Host 'Configure a senha do banco MySQL 8.x / MariaDB 10.6+ antes de iniciar com o HMP Foundations.' -ForegroundColor Yellow
            exit 1
        }

        if ($mysqlCfg.enabled) {
            $dbHost = if ($env:HMP_MYSQL_HOST) { $env:HMP_MYSQL_HOST } else { $mysqlCfg.host }
            $dbPort = if ($env:HMP_MYSQL_PORT) { [int]$env:HMP_MYSQL_PORT } else { [int]$mysqlCfg.port }
            $tcp = New-Object System.Net.Sockets.TcpClient
            try {
                $iar = $tcp.BeginConnect($dbHost, $dbPort, $null, $null)
                $connected = $iar.AsyncWaitHandle.WaitOne(1500, $false)
                if (-not $connected -or -not $tcp.Connected) {
                    Write-Host "[ERRO] MySQL/MariaDB nao respondeu em ${dbHost}:${dbPort}." -ForegroundColor Red
                    Write-Host 'Inicie o servico MySQL 8.x ou MariaDB 10.6+ antes de rodar o servidor.' -ForegroundColor Yellow
                    exit 1
                }
            } finally {
                $tcp.Dispose()
            }
        }
    }
}

Write-Host "[VICCS Accio] Iniciando $(Split-Path $serverExe -Leaf) a partir de $PSScriptRoot ..." -ForegroundColor Cyan
& $serverExe

