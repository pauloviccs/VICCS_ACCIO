# Tarefa Ativa

## Status: 🟢 FASE 1 CONCLUÍDA (Servidor Base ArcaneMP 1.15.1 Aberto Localmente)

## Última Fase Entregue
1. **Setup & Abertura Local do Servidor ArcaneMP (`server/` + `client/`):**
   - Instalado **ArcaneMP `1.15.1`** (`b8ce055`, Framework `44.1.1`) em `server/` (`ArcaneMPServer.exe`, `crashpad_handler.exe`, `libnode.dll`) e cliente em `client/` (`ArcaneMPLauncher.exe`).
   - Instalado **HMP Foundations `v0.12.0`** completo (30 resources `hmp-*` em `server/resources/` e 26 JSONs em `server/data/`).
   - Configurado banco local `hogwartsmp` no MariaDB `10.4.32` (XAMPP) com usuário dedicado em `server/data/hmp-mysql.json`, migrando automaticamente 37 tabelas e 17 entradas em `hmp_schema_migrations`.
   - Porta ajustada para **`27016`** (UDP+TCP) em `server/server.json` devido a conflito local do `AppleMobileDeviceProcess.exe` na porta `127.0.0.1:27015`.
   - Criado painel administrativo interativo **`Accio_Server_Manager.bat`** (`server/server-manager.ps1`) com modo Super Admin (`HMP_ADMIN_BOOTSTRAP_SECRET`), gestão de cargos no banco, backups `mysqldump`, editor de `server.json`, leitura de logs e verificação de conflito de porta.
2. **Atualizações & Sincronização do Website (`website/` -> `accio_rp_website.git`):**
   - Ajustado OAuth Discord, correção de avatar no header, lore anos 2000 (Diretor Aurelian Vale Diggory), hero full-bleed `logohigh_4x.jpg` com parallax por ponteiro, remoção do isotipo no navbar, emblemas oficiais das 4 Casas integrados na UI e em 1:1 sem distorção nos estandartes 3D (`CastleBanners3D.tsx`), e subtree enviado para `accio_rp_website.git` (`94e26d8`).

## Próximos Passos (Fase 2)
- Criar os primeiros resources autorais `viccs-core`, `viccs-ui` e `viccs-characters` em `server/resources/`.
- Conectar aprovação de fichas no Supabase (`character_applications`) ao banco de gameplay (`hogwartsmp`).
- Antes da abertura pública: migrar o banco de produção para MySQL 8.x / MariaDB 10.6+, configurar `server-token` + `package-secret`, abrir portas UDP/TCP no roteador/firewall e endurecer políticas RLS do Supabase.
