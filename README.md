# 🏰 VICCS Accio — Hogwarts Legacy RP Server

> Servidor de Roleplay MMO-RPG no universo de Hogwarts Legacy, construído sobre o framework [Arcane MP](https://arcane.mp/).

## ⚡ Visão Geral

O **VICCS Accio** transforma Hogwarts Legacy em uma experiência multiplayer persistente com mecânicas customizadas que ultrapassam o jogo original. Um ecossistema modular de scripts que se comunicam como um organismo vivo, criando um mundo mágico imersivo para roleplay.

## 🧙 Features Planejadas

| Sistema | Descrição |
|---------|-----------|
| 🪄 Magias | Sistema expandido com magias customizadas, mastery e combos |
| 📚 Aulas | Progressão acadêmica com matérias, aulas e exames |
| 💰 Economia | Galeões/Sicles/Knuts com lojas, comércio e anti-inflação |
| 📜 Quests | Missões dinâmicas, chains, dailies e eventos sazonais |
| 🤖 NPCs | Personagens com IA, schedules e diálogos interativos |
| 🦅 Criaturas | Captura, domesticação, vivário e habilidades únicas |
| ⚗️ Crafting | Poções, herbologia, encantamentos e alquimia avançada |
| 🏠 Habitações | Casas de jogadores com decoração e manutenção |
| 💬 Social | Chat RP com alcance, emotes, correio owl |
| ⚔️ Combate | PvP e PvE expandido com duelos formais |
| 🛡️ Admin | Moderação avançada com anti-cheat server-side |

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────┐
│          Arcane MP (MafiaHub C++)         │
├──────────────────────────────────────────┤
│  Server (Node.js)  │  Client (V8 + CEF)  │
├──────────────────────────────────────────┤
│  MySQL/MariaDB     │  Supabase           │
└──────────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
VICCS_Accio_HL_Server/
├── .agent/              # Cérebro do projeto (contexto, skills, guidelines)
├── server/              # Servidor Arcane MP e resources
├── supabase/            # Backend da plataforma (Auth, Storage, DB)
└── website/             # Website público do servidor
```

## 🗺️ Fase Atual

**Fase 0 — Biblioteca de Contexto** ✅ Completa

Próximo: **Fase 1 — Setup do Servidor e Infraestrutura**

## 📖 Documentação

Toda a documentação técnica está na pasta `.agent/`:

- [Arquitetura](.agent/context/architecture.md)
- [Stack Tecnológico](.agent/context/stack.md)
- [Database Schema](.agent/context/database_schema.md)
- [Code Style Guide](.agent/guidelines/code_style.md)
- [UI/UX Guidelines](.agent/guidelines/ui_ux.md)
- [Resource Conventions](.agent/guidelines/resource_conventions.md)
- [Plano de Implementação](.agent/implementation-plans/master-plan.md)

## 🔗 Links Importantes

- [Arcane MP](https://arcane.mp/) — Framework multiplayer
- [Arcane MP Docs](https://docs.arcane.mp/) — Documentação oficial
- [Arcane MP GitHub](https://github.com/arcane-mp) — Repositórios oficiais

---

*VICCS Accio — Accio, Aventura!* 🪄

