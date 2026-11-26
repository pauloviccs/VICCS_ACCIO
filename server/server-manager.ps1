# =============================================================================
# VICCS Accio RP - Painel Interativo do Servidor & Super Admin
# Executado via Accio_Server_Manager.bat a partir da raiz de server/
# =============================================================================

param(
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot

$ServerRoot = $PSScriptRoot
$ClientLauncher = Join-Path (Split-Path $ServerRoot -Parent) 'client\ArcaneMPLauncher.exe'
$ServerJsonPath = Join-Path $ServerRoot 'server.json'
$MysqlJsonPath = Join-Path $ServerRoot 'data\hmp-mysql.json'
$AdminJsonPath = Join-Path $ServerRoot 'data\hmp-admin.json'
$SecretFilePath = Join-Path $ServerRoot '.admin-secret.local'
$BackupsDir = Join-Path $ServerRoot 'backups'
$LogsPath = Join-Path $ServerRoot 'logs\hogwarts-mp.log'
$XamppMysqlBin = 'C:\xampp\mysql\bin'

function Get-ServerExe {
    foreach ($candidate in @('ArcaneMPServer.exe', 'HogwartsMPServer.exe')) {
        $p = Join-Path $ServerRoot $candidate
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Get-MysqlConfig {
    if (-not (Test-Path $MysqlJsonPath)) { return $null }
    try { return (Get-Content $MysqlJsonPath -Raw | ConvertFrom-Json) } catch { return $null }
}

function Get-ServerConfig {
    if (-not (Test-Path $ServerJsonPath)) { return $null }
    try { return (Get-Content $ServerJsonPath -Raw | ConvertFrom-Json) } catch { return $null }
}

function Save-JsonUtf8NoBom([string]$Path, $Obj) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $json = $Obj | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($Path, $json + "`n", $utf8NoBom)
}

function Test-TcpOpen([string]$HostName, [int]$Port, [int]$TimeoutMs = 900) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        return ($ok -and $tcp.Connected)
    } catch {
        return $false
    } finally {
        $tcp.Dispose()
    }
}

function Invoke-GameDbQuery([string]$Sql) {
    $mysqlExe = Join-Path $XamppMysqlBin 'mysql.exe'
    if (-not (Test-Path $mysqlExe)) {
        throw "mysql.exe nao encontrado em $XamppMysqlBin"
    }
    $cfg = Get-MysqlConfig
    $dbHost = if ($cfg -and $cfg.host) { $cfg.host } else { '127.0.0.1' }
    $dbPort = if ($cfg -and $cfg.port) { [int]$cfg.port } else { 3306 }
    $dbUser = if ($cfg -and $cfg.user) { $cfg.user } else { 'hogwartsmp' }
    $dbPass = if ($cfg -and $cfg.password) { $cfg.password } else { '' }
    $dbName = if ($cfg -and $cfg.database) { $cfg.database } else { 'hogwartsmp' }

    $args = @('-h', $dbHost, '-P', "$dbPort", '-u', $dbUser)
    if ($dbPass) { $args += "-p$dbPass" }
    $args += @('-D', $dbName, '-N', '-B', '-e', $Sql)

    $out = & $mysqlExe @args 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ($out -join "`n")
    }
    return $out
}

function Get-OrCreateAdminSecret {
    if (Test-Path $SecretFilePath) {
        $existing = (Get-Content $SecretFilePath -Raw).Trim()
        if ([System.Text.Encoding]::UTF8.GetByteCount($existing) -ge 16) {
            return $existing
        }
    }
    return New-AdminSecret
}

function New-AdminSecret {
    $bytes = New-Object byte[] 18
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = 'ACCIO-' + ([Convert]::ToBase64String($bytes) -replace '[+/=]', '')
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($SecretFilePath, $secret, $utf8NoBom)
    return $secret
}

function Start-XamppMysqlIfNeeded {
    $cfg = Get-MysqlConfig
    if (-not $cfg -or -not $cfg.enabled) { return $true }
    $dbHost = if ($cfg.host) { $cfg.host } else { '127.0.0.1' }
    $dbPort = if ($cfg.port) { [int]$cfg.port } else { 3306 }
    if (Test-TcpOpen $dbHost $dbPort 800) { return $true }

    if ($dbHost -notin @('127.0.0.1', 'localhost')) {
        Write-Host "[AVISO] Banco remoto ($dbHost`:$dbPort) inacessivel." -ForegroundColor Yellow
        return $false
    }

    $mysqld = Join-Path $XamppMysqlBin 'mysqld.exe'
    $myIni = Join-Path $XamppMysqlBin 'my.ini'
    if (-not (Test-Path $mysqld)) {
        Write-Host "[ERRO] XAMPP mysqld.exe nao encontrado em $XamppMysqlBin." -ForegroundColor Red
        return $false
    }

    Write-Host '[INFO] MySQL offline. Iniciando MariaDB do XAMPP em segundo plano...' -ForegroundColor Yellow
    $argList = if (Test-Path $myIni) { @("--defaults-file=$myIni", '--standalone') } else { @('--standalone') }
    Start-Process -FilePath $mysqld -ArgumentList $argList -WindowStyle Hidden | Out-Null

    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 600
        if (Test-TcpOpen $dbHost $dbPort 500) {
            Write-Host '[OK] MySQL/MariaDB iniciado na porta 3306!' -ForegroundColor Green
            return $true
        }
    }
    Write-Host '[ERRO] MySQL nao respondeu dentro do tempo limite.' -ForegroundColor Red
    return $false
}

function Pause-Menu {
    Write-Host ''
    Read-Host 'Pressione ENTER para voltar ao menu' | Out-Null
}

function Invoke-LaunchServer([bool]$WithSuperAdmin, [bool]$AutoRestart) {
    $exe = Get-ServerExe
    if (-not $exe) {
        Write-Host "[ERRO] ArcaneMPServer.exe nao encontrado em $ServerRoot" -ForegroundColor Red
        Pause-Menu
        return
    }

    $sCfg = Get-ServerConfig
    $srvPort = if ($sCfg -and $sCfg.port) { [int]$sCfg.port } else { 27016 }
    $portConflicts = Get-NetTCPConnection -LocalPort $srvPort -State Listen -ErrorAction SilentlyContinue
    if ($portConflicts) {
        $owner = Get-Process -Id $portConflicts[0].OwningProcess -ErrorAction SilentlyContinue
        $ownerName = if ($owner) { "$($owner.ProcessName) (PID $($owner.Id))" } else { "PID $($portConflicts[0].OwningProcess)" }
        Write-Host "[ERRO] A porta TCP $srvPort ja esta em uso por: $ownerName" -ForegroundColor Red
        Write-Host 'Isso impede o cliente de baixar os arquivos! Mude a porta na opcao [8] (ex: 27016 ou 27020).' -ForegroundColor Yellow
        Pause-Menu
        return
    }

    if (-not (Start-XamppMysqlIfNeeded)) {
        Pause-Menu
        return
    }

    $cfg = Get-MysqlConfig
    if ($cfg -and $cfg.enabled -and $cfg.password -eq 'CHANGE_ME' -and -not $env:HMP_MYSQL_URL) {
        Write-Host '[ERRO] Configure a senha em data\hmp-mysql.json antes de iniciar.' -ForegroundColor Red
        Pause-Menu
        return
    }

    New-Item -ItemType Directory -Force -Path (Join-Path $ServerRoot 'logs') | Out-Null

    $prevSecret = $env:HMP_ADMIN_BOOTSTRAP_SECRET
    if ($WithSuperAdmin) {
        $secret = Get-OrCreateAdminSecret
        $env:HMP_ADMIN_BOOTSTRAP_SECRET = $secret
        Clear-Host
        Write-Host '=====================================================================' -ForegroundColor DarkYellow
        Write-Host '  MODO SUPER ADMIN ATIVADO (/admin Bootstrap Secret)                 ' -ForegroundColor Yellow
        Write-Host '=====================================================================' -ForegroundColor DarkYellow
        Write-Host "  Chave desta sessao: $secret" -ForegroundColor Green
        Write-Host '  Como usar no jogo: digite /admin no chat e cole esta chave.' -ForegroundColor Gray
        Write-Host '  (Permite admin.noclip, admin.ban, groups, spells, inventory, etc.)' -ForegroundColor Gray
        Write-Host '=====================================================================' -ForegroundColor DarkYellow
        Write-Host ''
    } else {
        Remove-Item Env:HMP_ADMIN_BOOTSTRAP_SECRET -ErrorAction SilentlyContinue
        Clear-Host
    }

    try {
        do {
            Write-Host "[VICCS Accio] Iniciando $(Split-Path $exe -Leaf) em $ServerRoot ..." -ForegroundColor Cyan
            Write-Host '[DICA] Use "status", "help" ou "stop" no console do servidor.' -ForegroundColor DarkGray
            Write-Host ''

            $proc = Start-Process -FilePath $exe -WorkingDirectory $ServerRoot -NoNewWindow -PassThru -Wait
            $code = $proc.ExitCode
            Write-Host ''
            Write-Host "[INFO] Servidor encerrado (codigo: $code)." -ForegroundColor Yellow

            if (-not $AutoRestart) { break }
            Write-Host '[AUTO-RESTART] Reiniciando em 5 segundos... Pressione Q para cancelar ou ENTER para agora.' -ForegroundColor Magenta
            $cancel = $false
            for ($s = 0; $s -lt 50; $s++) {
                if ([Console]::KeyAvailable) {
                    $k = [Console]::ReadKey($true)
                    if ($k.Key -eq 'Q' -or $k.Key -eq 'Escape') { $cancel = $true; break }
                    if ($k.Key -eq 'Enter') { break }
                }
                Start-Sleep -Milliseconds 100
            }
            if ($cancel) { break }
        } while ($AutoRestart)
    } finally {
        if ($null -ne $prevSecret) {
            $env:HMP_ADMIN_BOOTSTRAP_SECRET = $prevSecret
        } else {
            Remove-Item Env:HMP_ADMIN_BOOTSTRAP_SECRET -ErrorAction SilentlyContinue
        }
    }

    Pause-Menu
}

function Show-DbAdminSubmenu {
    while ($true) {
        Clear-Host
        $adminCfg = if (Test-Path $AdminJsonPath) { Get-Content $AdminJsonPath -Raw | ConvertFrom-Json } else { $null }
        $reqVerified = if ($adminCfg) { [bool]$adminCfg.requireVerifiedIdentity } else { $true }
        $hasSecret = Test-Path $SecretFilePath

        Write-Host '=====================================================================' -ForegroundColor DarkCyan
        Write-Host '  SUPER ADMIN & GERENCIA DE CONTAS (hogwartsmp)                      ' -ForegroundColor Cyan
        Write-Host '=====================================================================' -ForegroundColor DarkCyan
        Write-Host "  requireVerifiedIdentity (hmp-admin.json): $reqVerified"
        Write-Host "  Chave /admin (.admin-secret.local):       $(if ($hasSecret) { 'Configurada' } else { 'Nao gerada' })"
        Write-Host ''

        $dbCfg = Get-MysqlConfig
        $dbOnline = $dbCfg -and (Test-TcpOpen $dbCfg.host ([int]$dbCfg.port) 600)
        if ($dbOnline) {
            Write-Host '--- CONTAS REGISTRADAS NO BANCO ---' -ForegroundColor Yellow
            try {
                $rows = Invoke-GameDbQuery @"
SELECT a.id,
       a.display_name,
       COALESCE(MAX(CASE WHEN g.group_key='admin' THEN CONCAT('admin (grade ', g.grade, ')') END), 'jogador') AS cargo,
       a.last_seen_at
FROM hmp_accounts a
LEFT JOIN hmp_account_groups g ON g.account_id = a.id
GROUP BY a.id, a.display_name, a.last_seen_at
ORDER BY a.id DESC
LIMIT 20;
"@
                if ($rows) {
                    foreach ($r in $rows) {
                        $cols = $r -split "`t"
                        Write-Host ("  ID {0,-4} | {1,-22} | {2,-16} | Visto: {3}" -f $cols[0], $cols[1], $cols[2], $cols[3])
                    }
                } else {
                    Write-Host '  (Nenhuma conta entrou no servidor ainda. Entre no jogo ao menos 1 vez.)' -ForegroundColor DarkGray
                }
            } catch {
                Write-Host "  [AVISO] Nao foi possivel listar contas: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host '  [OFFLINE] Inicie o MySQL para listar e promover contas do banco.' -ForegroundColor Red
        }

        Write-Host ''
        Write-Host '  [1] Promover conta por ID para Super Admin (group=admin, grade 3)'
        Write-Host '  [2] Promover conta por ID com grade customizada (1=Mod, 2=Admin, 3=Super)'
        Write-Host '  [3] Remover cargo admin de uma conta por ID'
        Write-Host '  [4] Mostrar / Copiar chave Super Admin (/admin Bootstrap Secret)'
        Write-Host '  [5] Gerar NOVA chave Super Admin (rotacionar segredo)'
        Write-Host '  [6] Alternar requireVerifiedIdentity em data/hmp-admin.json (atual: ' -NoNewline
        Write-Host "$reqVerified" -NoNewline -ForegroundColor $(if ($reqVerified) { 'Green' } else { 'Yellow' })
        Write-Host ')'
        Write-Host '  [0] Voltar'
        Write-Host ''
        $op = Read-Host 'Escolha uma opcao'

        switch ($op) {
            '1' {
                if (-not $dbOnline) { Write-Host 'MySQL offline.' -ForegroundColor Red; Pause-Menu; break }
                $id = Read-Host 'Informe o ID numerico da conta (hmp_accounts.id)'
                if ($id -match '^\d+$') {
                    try {
                        Invoke-GameDbQuery "INSERT INTO hmp_account_groups (account_id, group_key, grade) VALUES ($id, 'admin', 3) ON DUPLICATE KEY UPDATE grade = 3;" | Out-Null
                        Write-Host "[OK] Conta ID $id promovida para admin grade 3 (Super Admin)!" -ForegroundColor Green
                    } catch {
                        Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
                Pause-Menu
            }
            '2' {
                if (-not $dbOnline) { Write-Host 'MySQL offline.' -ForegroundColor Red; Pause-Menu; break }
                $id = Read-Host 'ID da conta'
                $gr = Read-Host 'Grade desejada (1, 2 ou 3)'
                if ($id -match '^\d+$' -and $gr -match '^[123]$') {
                    try {
                        Invoke-GameDbQuery "INSERT INTO hmp_account_groups (account_id, group_key, grade) VALUES ($id, 'admin', $gr) ON DUPLICATE KEY UPDATE grade = $gr;" | Out-Null
                        Write-Host "[OK] Conta ID $id definida como admin grade $gr!" -ForegroundColor Green
                    } catch {
                        Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
                Pause-Menu
            }
            '3' {
                if (-not $dbOnline) { Write-Host 'MySQL offline.' -ForegroundColor Red; Pause-Menu; break }
                $id = Read-Host 'ID da conta para remover admin'
                if ($id -match '^\d+$') {
                    try {
                        Invoke-GameDbQuery "DELETE FROM hmp_account_groups WHERE account_id = $id AND group_key = 'admin';" | Out-Null
                        Write-Host "[OK] Cargo admin removido da conta ID $id." -ForegroundColor Green
                    } catch {
                        Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
                Pause-Menu
            }
            '4' {
                $s = Get-OrCreateAdminSecret
                Write-Host ''
                Write-Host "  Chave atual (/admin): $s" -ForegroundColor Green
                try { Set-Clipboard -Value $s; Write-Host '  (Copiada para a area de transferencia!)' -ForegroundColor DarkGray } catch {}
                Pause-Menu
            }
            '5' {
                $s = New-AdminSecret
                Write-Host ''
                Write-Host "  Nova chave gerada (/admin): $s" -ForegroundColor Green
                Write-Host '  Reinicie o servidor pela opcao [2] para aplicar a nova chave.' -ForegroundColor Yellow
                Pause-Menu
            }
            '6' {
                if ($adminCfg) {
                    $adminCfg.requireVerifiedIdentity = (-not $reqVerified)
                    Save-JsonUtf8NoBom $AdminJsonPath $adminCfg
                    Write-Host "[OK] requireVerifiedIdentity agora e $($adminCfg.requireVerifiedIdentity)." -ForegroundColor Green
                    if (-not $adminCfg.requireVerifiedIdentity) {
                        Write-Host '[AVISO] Mantenha false APENAS em testes locais fechados; reative antes de abrir ao publico!' -ForegroundColor Yellow
                    }
                }
                Pause-Menu
            }
            '0' { return }
        }
    }
}

function Show-ConfigSubmenu {
    while ($true) {
        Clear-Host
        $sCfg = Get-ServerConfig
        if (-not $sCfg) { Write-Host '[ERRO] Nao foi possivel ler server.json' -ForegroundColor Red; Pause-Menu; return }
        Write-Host '=====================================================================' -ForegroundColor DarkCyan
        Write-Host '  CONFIGURACAO DO SERVIDOR (server.json)                             ' -ForegroundColor Cyan
        Write-Host '=====================================================================' -ForegroundColor DarkCyan
        Write-Host "  [1] Porta UDP/TCP:        $($sCfg.port)"
        Write-Host "  [2] Max Jogadores:        $($sCfg.maxplayers)"
        Write-Host "  [3] Senha de Entrada:     $(if ($sCfg.password) { '*** definida ***' } else { '(nenhuma / aberta)' })"
        Write-Host "  [4] Masterlist Token:     $(if ($sCfg.'server-token') { '*** configurado ***' } else { '(vazio / servidor privado)' })"
        Write-Host "  [5] Package Secret:       $(if ($sCfg.'package-secret') { '*** configurado ***' } else { '(vazio)' })"
        Write-Host "  [6] Auto Respawn:         $($sCfg.mod.autoRespawn)"
        Write-Host '  [0] Voltar'
        Write-Host ''
        $c = Read-Host 'Qual campo deseja editar?'
        switch ($c) {
            '1' {
                $v = Read-Host 'Nova porta (padrao 27015)'
                if ($v -match '^\d+$' -and [int]$v -ge 1024 -and [int]$v -le 65535) {
                    $sCfg.port = [int]$v
                    Save-JsonUtf8NoBom $ServerJsonPath $sCfg
                    Write-Host '[OK] Porta atualizada.' -ForegroundColor Green
                }
                Pause-Menu
            }
            '2' {
                $v = Read-Host 'Maximo de jogadores (1 a 128)'
                if ($v -match '^\d+$' -and [int]$v -ge 1 -and [int]$v -le 512) {
                    $sCfg.maxplayers = [int]$v
                    Save-JsonUtf8NoBom $ServerJsonPath $sCfg
                    Write-Host '[OK] maxplayers atualizado.' -ForegroundColor Green
                }
                Pause-Menu
            }
            '3' {
                $v = Read-Host 'Nova senha do servidor (deixe vazio para remover)'
                $sCfg.password = $v
                Save-JsonUtf8NoBom $ServerJsonPath $sCfg
                Write-Host '[OK] Senha de entrada atualizada.' -ForegroundColor Green
                Pause-Menu
            }
            '4' {
                $v = Read-Host 'Cole o server-token da MafiaHub (ou vazio para unlisted)'
                $sCfg.'server-token' = $v.Trim()
                Save-JsonUtf8NoBom $ServerJsonPath $sCfg
                Write-Host '[OK] server-token atualizado.' -ForegroundColor Green
                Pause-Menu
            }
            '5' {
                $v = Read-Host 'Chave package-secret (ou vazio para remover)'
                $sCfg.'package-secret' = $v.Trim()
                Save-JsonUtf8NoBom $ServerJsonPath $sCfg
                Write-Host '[OK] package-secret atualizado.' -ForegroundColor Green
                Pause-Menu
            }
            '6' {
                $sCfg.mod.autoRespawn = (-not [bool]$sCfg.mod.autoRespawn)
                Save-JsonUtf8NoBom $ServerJsonPath $sCfg
                Write-Host "[OK] autoRespawn alterado para $($sCfg.mod.autoRespawn)." -ForegroundColor Green
                Pause-Menu
            }
            '0' { return }
        }
    }
}

function Invoke-BackupDatabase {
    $dumpExe = Join-Path $XamppMysqlBin 'mysqldump.exe'
    if (-not (Test-Path $dumpExe)) {
        Write-Host "[ERRO] mysqldump.exe nao encontrado em $XamppMysqlBin" -ForegroundColor Red
        Pause-Menu
        return
    }
    if (-not (Start-XamppMysqlIfNeeded)) { Pause-Menu; return }

    New-Item -ItemType Directory -Force -Path $BackupsDir | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $outFile = Join-Path $BackupsDir "hogwartsmp_$stamp.sql"
    $cfg = Get-MysqlConfig
    $dbHost = if ($cfg -and $cfg.host) { $cfg.host } else { '127.0.0.1' }
    $dbPort = if ($cfg -and $cfg.port) { [int]$cfg.port } else { 3306 }
    $dbUser = if ($cfg -and $cfg.user) { $cfg.user } else { 'hogwartsmp' }
    $dbPass = if ($cfg -and $cfg.password) { $cfg.password } else { '' }
    $dbName = if ($cfg -and $cfg.database) { $cfg.database } else { 'hogwartsmp' }

    $args = @("--host=$dbHost", "--port=$dbPort", "--user=$dbUser")
    if ($dbPass) { $args += "--password=$dbPass" }
    $args += @('--single-transaction', "--result-file=$outFile", $dbName)

    Write-Host "[INFO] Gerando backup em $outFile ..." -ForegroundColor Cyan
    & $dumpExe @args 2>&1
    if ($LASTEXITCODE -eq 0 -and (Test-Path $outFile)) {
        $kb = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
        Write-Host "[OK] Backup concluido ($kb KB)!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Falha no backup (codigo $LASTEXITCODE)." -ForegroundColor Red
    }
    Pause-Menu
}

function Show-LogsMenu {
    Clear-Host
    Write-Host '=====================================================================' -ForegroundColor DarkCyan
    Write-Host '  DIAGNOSTICO DE LOGS (logs/hogwarts-mp.log)                         ' -ForegroundColor Cyan
    Write-Host '=====================================================================' -ForegroundColor DarkCyan
    if (-not (Test-Path $LogsPath)) {
        Write-Host '  Nenhum arquivo de log encontrado ainda.' -ForegroundColor Yellow
        Pause-Menu
        return
    }
    Write-Host '  [1] Ver ultimas 40 linhas'
    Write-Host '  [2] Filtrar apenas [error], [warning] e Startup failed'
    Write-Host '  [3] Abrir pasta logs/ no Explorer'
    Write-Host '  [0] Voltar'
    Write-Host ''
    $opt = Read-Host 'Opcao'
    switch ($opt) {
        '1' {
            Write-Host ''
            Get-Content $LogsPath -Tail 40
            Pause-Menu
        }
        '2' {
            Write-Host ''
            $matches = Select-String -Path $LogsPath -Pattern '\[error\]|\[warning\]|Startup failed|ECONNREFUSED|Access denied'
            if ($matches) {
                $matches | Select-Object -Last 40 | ForEach-Object { Write-Host $_.Line }
            } else {
                Write-Host 'Nenhum erro ou aviso critico encontrado no log!' -ForegroundColor Green
            }
            Pause-Menu
        }
        '3' {
            Start-Process explorer.exe (Join-Path $ServerRoot 'logs')
        }
    }
}

function Manage-MysqlMenu {
    Clear-Host
    $cfg = Get-MysqlConfig
    $dbHost = if ($cfg -and $cfg.host) { $cfg.host } else { '127.0.0.1' }
    $dbPort = if ($cfg -and $cfg.port) { [int]$cfg.port } else { 3306 }
    $online = Test-TcpOpen $dbHost $dbPort 700
    Write-Host '=====================================================================' -ForegroundColor DarkCyan
    Write-Host "  BANCO MYSQL / MARIADB ($dbHost`:$dbPort) - Status: $(if ($online) { 'ONLINE' } else { 'OFFLINE' })" -ForegroundColor Cyan
    Write-Host '=====================================================================' -ForegroundColor DarkCyan
    Write-Host '  [1] Iniciar MariaDB do XAMPP'
    Write-Host '  [2] Parar MariaDB do XAMPP'
    Write-Host '  [3] Testar conexao com credenciais de data\hmp-mysql.json'
    Write-Host '  [0] Voltar'
    Write-Host ''
    $opt = Read-Host 'Opcao'
    switch ($opt) {
        '1' { Start-XamppMysqlIfNeeded | Out-Null; Pause-Menu }
        '2' {
            $adminExe = Join-Path $XamppMysqlBin 'mysqladmin.exe'
            if (Test-Path $adminExe) {
                & $adminExe -h 127.0.0.1 -P 3306 -u root shutdown 2>&1 | Out-Null
                Write-Host '[OK] Comando de parada enviado ao MySQL do XAMPP.' -ForegroundColor Green
            }
            Pause-Menu
        }
        '3' {
            try {
                $res = Invoke-GameDbQuery 'SELECT VERSION(), CURRENT_USER(), DATABASE(), (SELECT COUNT(*) FROM hmp_schema_migrations);'
                Write-Host "[OK] Conexao validada: $res" -ForegroundColor Green
            } catch {
                Write-Host "[ERRO] Falha ao conectar: $($_.Exception.Message)" -ForegroundColor Red
            }
            Pause-Menu
        }
    }
}

if ($CheckOnly) {
    $exeOk = [bool](Get-ServerExe)
    $sOk = [bool](Get-ServerConfig)
    $mOk = [bool](Get-MysqlConfig)
    Write-Output "MANAGER_SYNTAX_OK exe=$exeOk server_json=$sOk mysql_json=$mOk"
    exit 0
}

while ($true) {
    Clear-Host
    $srvExe = Get-ServerExe
    $srvCfg = Get-ServerConfig
    $dbCfg = Get-MysqlConfig
    $dbHost = if ($dbCfg -and $dbCfg.host) { $dbCfg.host } else { '127.0.0.1' }
    $dbPort = if ($dbCfg -and $dbCfg.port) { [int]$dbCfg.port } else { 3306 }
    $dbOnline = Test-TcpOpen $dbHost $dbPort 500
    $srvRunning = [bool](Get-Process -Name 'ArcaneMPServer','HogwartsMPServer' -ErrorAction SilentlyContinue)
    $hasAdminSecret = Test-Path $SecretFilePath

    $statsLine = 'Banco offline'
    if ($dbOnline) {
        try {
            $rawStats = Invoke-GameDbQuery "SELECT (SELECT COUNT(*) FROM hmp_accounts), (SELECT COUNT(*) FROM hmp_characters WHERE deleted_at IS NULL), (SELECT COUNT(*) FROM hmp_account_groups WHERE group_key='admin');"
            $parts = ($rawStats -join '') -split "`t"
            if ($parts.Count -ge 3) {
                $statsLine = "Contas: $($parts[0]) | Personagens: $($parts[1]) | Admins: $($parts[2])"
            }
        } catch {
            $statsLine = 'Banco conectado (tabelas aguardando 1o boot)'
        }
    }

    Write-Host '=====================================================================' -ForegroundColor DarkYellow
    Write-Host '          VICCS ACCIO RP - PAINEL DO SERVIDOR & SUPER ADMIN          ' -ForegroundColor Yellow
    Write-Host '=====================================================================' -ForegroundColor DarkYellow
    Write-Host '  Diretorio : ' -NoNewline; Write-Host $ServerRoot -ForegroundColor DarkGray
    Write-Host '  Executavel: ' -NoNewline
    if ($srvExe) { Write-Host (Split-Path $srvExe -Leaf) -ForegroundColor Green } else { Write-Host 'AUSENTE' -ForegroundColor Red }
    Write-Host '  Servidor  : ' -NoNewline
    if ($srvRunning) { Write-Host 'RODANDO' -ForegroundColor Green } else { Write-Host 'PARADO' -ForegroundColor DarkGray }
    Write-Host "  Banco DB  : " -NoNewline
    if ($dbOnline) { Write-Host "ONLINE ($dbHost`:$dbPort) - $statsLine" -ForegroundColor Green } else { Write-Host "OFFLINE ($dbHost`:$dbPort)" -ForegroundColor Red }
    if ($srvCfg) {
        $modeLabel = if ($srvCfg.'server-token') { 'Publico (Masterlist)' } else { "Local / Direct Connect (127.0.0.1:$($srvCfg.port))" }
        Write-Host "  Rede      : Porta $($srvCfg.port) | Max $($srvCfg.maxplayers) | $modeLabel" -ForegroundColor Cyan
    }
    Write-Host "  /admin Key: $(if ($hasAdminSecret) { 'Pronta (.admin-secret.local)' } else { 'Sera gerada automaticamente na opcao [2]' })" -ForegroundColor DarkGray
    Write-Host '---------------------------------------------------------------------' -ForegroundColor DarkYellow
    Write-Host '  INICIALIZACAO & JOGO' -ForegroundColor White
    Write-Host '    [1] Iniciar Servidor (Modo Padrao)'
    Write-Host '    [2] Iniciar Servidor com SUPER ADMIN (/admin Bootstrap Secret)' -ForegroundColor Yellow
    Write-Host '    [3] Iniciar com Auto-Restart (Modo Vigia)'
    Write-Host '    [4] Abrir Client Launcher (ArcaneMPLauncher.exe)'
    Write-Host ''
    Write-Host '  SUPER ADMIN & BANCO DE DADOS' -ForegroundColor White
    Write-Host '    [5] Gerenciar MySQL do XAMPP (Iniciar / Parar / Testar)'
    Write-Host '    [6] Super Admins & Contas (Promover, Chave /admin, Politica)'
    Write-Host '    [7] Fazer Backup Completo do Banco (mysqldump)'
    Write-Host ''
    Write-Host '  CONFIGURACAO & DIAGNOSTICO' -ForegroundColor White
    Write-Host '    [8] Configurar server.json (Porta, MaxPlayers, Senha, Token)'
    Write-Host '    [9] Ver Logs / Filtrar Erros (logs/hogwarts-mp.log)'
    Write-Host '    [0] Sair'
    Write-Host '=====================================================================' -ForegroundColor DarkYellow
    $choice = Read-Host 'Digite a sua escolha'

    switch ($choice) {
        '1' { Invoke-LaunchServer -WithSuperAdmin:$false -AutoRestart:$false }
        '2' { Invoke-LaunchServer -WithSuperAdmin:$true  -AutoRestart:$false }
        '3' { Invoke-LaunchServer -WithSuperAdmin:$true  -AutoRestart:$true  }
        '4' {
            if (Test-Path $ClientLauncher) {
                Start-Process -FilePath $ClientLauncher -WorkingDirectory (Split-Path $ClientLauncher -Parent)
                Write-Host '[OK] ArcaneMPLauncher.exe iniciado!' -ForegroundColor Green
            } else {
                Write-Host "[ERRO] Launcher nao encontrado em $ClientLauncher" -ForegroundColor Red
            }
            Start-Sleep -Seconds 2
        }
        '5' { Manage-MysqlMenu }
        '6' { Show-DbAdminSubmenu }
        '7' { Invoke-BackupDatabase }
        '8' { Show-ConfigSubmenu }
        '9' { Show-LogsMenu }
        '0' { exit 0 }
    }
}

