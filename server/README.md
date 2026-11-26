# VICCS Accio RP — Servidor Base ArcaneMP (`server/`)

Estrutura base preparada de acordo com a documentação oficial do **ArcaneMP** (`https://arcane.mp/hosting` e `https://docs.arcane.mp/guides/hosting-a-server/run-a-server/`).

## O que já está instalado e testado aqui

- **Runtime Windows do ArcaneMP** (`ArcaneMPServer.exe`, `crashpad_handler.exe`, `libnode.dll`) instalado em `server/`, e launcher do jogador em `../client/ArcaneMPLauncher.exe`.
- `server.json` (e modelo `server.example.json`) configurado na porta `27016` (UDP + TCP — evitando conflito local com o `AppleMobileDeviceProcess` que ocupa `127.0.0.1:27015` no Windows), `maxplayers: 32`, `server-token: ""` (não listado na masterlist pública, acessível via Direct Connect em `127.0.0.1:27016`) e `mod.autoRespawn: true`.
- **HMP Foundations v0.12.0** instalado em `resources/` (todos os 30 módulos oficiais `hmp-*`: contas, personagens, casas de Hogwarts, inventário, spawn, feitiços, mundo, administração, etc.).
- Configurações em `data/hmp-*.json` + credenciais gravadas em `data/hmp-mysql.json` apontando para o banco `hogwartsmp` no MySQL/MariaDB do XAMPP (`127.0.0.1:3306`, usuário dedicado `hogwartsmp`, já validado com as 37 tabelas e 17 migrations criadas).
- Pastas `logs/` e `start-server.ps1` com checagem automática de executável e banco antes de iniciar.

---

## Como iniciar, logar e jogar localmente

1. Certifique-se de que o **MySQL** no **XAMPP Control Panel** está rodando (`Running` na porta `3306`) — ou deixe o próprio painel iniciar para você.
2. Dê um duplo clique em **`Accio_Server_Manager.bat`** na pasta `server\` (não execute como Administrador):
   - Use **`[1]` Iniciar Servidor (Modo Padrão)** para boot normal, ou
   - Use **`[2]` Iniciar Servidor com SUPER ADMIN** para gerar/ativar a chave do comando `/admin` e gerenciar contas, backups e `server.json` pelo painel.
3. Aguarde aparecer `HogwartsMP Server successfully started` no terminal.
4. Execute `c:\Games\VICCS_Accio_HL_Server\client\ArcaneMPLauncher.exe` (ou escolha a opção **`[4]`** no painel), abra **Play → Direct Connect** e conecte em **`127.0.0.1:27016`**.

---

## Observação sobre o banco para produção

O XAMPP local roda **MariaDB 10.4.32**. No teste inicial local, todas as 17 migrations e os 30 resources do **HMP Foundations v0.12.0** subiram sem erros; porém, antes de abrir o servidor publicamente para outros jogadores em produção, a matriz oficial de compatibilidade do Foundations recomenda **MySQL 8.x** ou **MariaDB 10.6+**.

---

## Quando for abrir para outros jogadores

1. Libere a porta **`27015` UDP e TCP** no Firewall do Windows e no Port Forwarding do roteador (UDP para tráfego de jogo e TCP para download de resources/API HTTP). Nunca exponha a porta `3306` do banco.
2. Cadastre o servidor no painel da MafiaHub (<https://mafiahub.dev/dashboard/servers>) e preencha `"server-token"` no `server.json` (arquivo ignorado no `.gitignore`).
3. Opcionalmente preencha `"package-secret"` no `server.json` para proteger a chave dos pacotes de assets enviados aos clientes.

