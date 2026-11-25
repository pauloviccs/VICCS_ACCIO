# Stack Tecnológico — VICCS Accio HL Server

## Runtime & Framework

| Camada | Tecnologia | Versão | Notas |
|--------|-----------|--------|-------|
| Framework Core | Arcane MP (MafiaHub) | Latest | Framework C++ com hooks no Hogwarts Legacy |
| Server Runtime | Node.js | 18+ LTS | Runtime dos serverScripts |
| Client Runtime | V8 (Sandboxed) | Embarcado | Execução isolada no cliente |
| UI Framework | CEF (Chromium) | Embarcado | Renderiza HTML/CSS/JS sobre o jogo |

## Linguagens

| Contexto | Linguagem | Padrão |
|----------|-----------|--------|
| Server Scripts | JavaScript (ES2022+) | Módulos, async/await, classes |
| Client Scripts | JavaScript (ES2022+) | Sandbox V8 |
| UI Panels | HTML5 + CSS3 + JavaScript | Web standards |
| Shared Scripts | JavaScript (ES2022+) | Lógica compartilhada client/server |
| Config Files | JSON | Configurações parametrizadas |
| Website | TypeScript + React 19 + Vite 6 | Tailwind CSS v4, Three.js, jsPDF, html2canvas |
| Edge Functions | TypeScript | Supabase Edge Functions (Deno — planejado) |

## Banco de Dados & Backend

| Serviço | Tecnologia | Uso |
|---------|-----------|-----|
| Banco Primário (Jogo) | MySQL / MariaDB | Via hmp-mysql (HMP Foundations) |
| Backend Plataforma | Supabase | Auth, Storage, Realtime, Edge Functions |
| Banco Supabase | PostgreSQL | Dados do website, analytics, logs |

## HMP Foundations (Base)

Resources padrão do Arcane MP que utilizamos como fundação:

| Resource | Função |
|----------|--------|
| `hmp-lib` | Utils, validação, comandos, localização, logging |
| `hmp-mysql` | Conexão pooled MySQL/MariaDB |
| `hmp-core` | Accounts, identity, characters, groups |
| `hmp-ui` | Notifications, dialogs, menus, inputs |
| `hmp-characters` | Criação e seleção de personagens |
| `hmp-houses` | Casas de Hogwarts, sincronização |
| `hmp-inventory` | Sistema de inventário base |
| `hmp-spawn` | Spawn e persistência de localização |
| `hmp-blips` | Marcadores no mapa e minimapa |
| `hmp-interact` | Zonas e prompts de interação |
| `hmp-shops` | Lojas e comércio |
| `hmp-pvp` | Arbitragem PvP |
| `hmp-admin` | Moderação e administração |
| `hmp-audio` | Playback de áudio via Wwise |

## Ferramentas de Desenvolvimento

| Ferramenta | Uso |
|-----------|-----|
| Git | Versionamento (monorepo `VICCS_ACCIO.git`) |
| Vite 6 + TypeScript | Build e bundling da plataforma web (`website/`) |
| Python / OpenCV | Processamento e recorte alfa de assets de varinhas |
| Supabase CLI | Gestão de banco e migrations (`supabase/` planejado) |

## Integrações Web (Website)

| Tecnologia | Uso |
|-----------|-----|
| Three.js | Estandartes 3D das Quatro Casas |
| jsPDF + html2canvas | Geração de ficha oficial em PDF e upload no Storage |
| Web Audio API + HTMLAudioElement | SFX procedurais e trilha sonora orquestral MP3 |
| Discord OAuth2 + Webhooks | Autenticação de jogadores e Rich Embeds ministeriais |

## Networking

| Aspecto | Detalhe |
|---------|---------|
| Protocolo | MafiaNet (UDP confiável/não-confiável) |
| Porta padrão | 27015 |
| Replicação | Interest-based spatial grid |
| VoIP | Proximity Voice (Opus, server-relayed) |
| Instâncias | Virtual Worlds para isolamento |

