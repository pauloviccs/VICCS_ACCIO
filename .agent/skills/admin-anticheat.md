# Skill: Administração e Anti-Cheat

## Quando Usar
Ao criar, configurar ou expandir ferramentas de administração, moderação,
logging, e proteção anti-cheat do servidor.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    viccs-admin                           │
│                                                         │
│  Moderação                                              │
│  ├── Kick, Ban (temp/perm), Mute, Warn                 │
│  ├── Teleport, Freeze, Spectate                        │
│  ├── Godmode, Noclip (staff only)                      │
│  └── Audit log de TODAS as ações                       │
│                                                         │
│  Anti-Cheat                                             │
│  ├── Validação server-side de TODAS as ações           │
│  ├── Rate limiting de eventos client→server            │
│  ├── Detection de speed hack, teleport, exploit        │
│  ├── Economia: threshold de transações suspeitas       │
│  └── Auto-report + notificação a staff                 │
│                                                         │
│  Permissões                                             │
│  ├── Role-based: player, vip, helper, mod, admin, dev  │
│  ├── Capability-gated (granular por ação)              │
│  └── Hierarquia de overrides                           │
└─────────────────────────────────────────────────────────┘
```

## Config (config/admin.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-admin",
    "$version": "1.0.0",

    "roles": {
        "player":  { "level": 0, "capabilities": [] },
        "vip":     { "level": 1, "capabilities": ["vip_perks", "priority_queue"] },
        "helper":  { "level": 2, "capabilities": ["view_reports", "mute_player", "warn_player"] },
        "mod":     { "level": 3, "capabilities": ["kick", "tempban", "teleport", "freeze", "spectate"] },
        "admin":   { "level": 4, "capabilities": ["permban", "unban", "set_role", "spawn_items", "godmode"] },
        "dev":     { "level": 5, "capabilities": ["*"] }
    },

    "antiCheat": {
        "enabled": true,
        "speedThreshold": 2.0,
        "teleportThreshold": 100.0,
        "eventRateLimit": {
            "maxEventsPerSecond": 20,
            "burstAllowance": 5,
            "penaltyType": "warn_then_kick"
        },
        "economyMonitoring": {
            "suspiciousTransactionGalleons": 5000,
            "maxTransactionsPerMinute": 10,
            "autoReportThreshold": 3
        }
    },

    "moderation": {
        "maxWarnsBeforeAction": 3,
        "warnExpiryDays": 30,
        "tempBanDurations": ["1h", "6h", "1d", "3d", "7d", "30d"],
        "appealCooldownDays": 7
    },

    "logging": {
        "logAllCommands": true,
        "logAllTransactions": true,
        "logPlayerMovement": false,
        "logChatMessages": true,
        "retentionDays": 90
    }
}
```

## Comandos Admin

```javascript
// Registrar comandos de admin com validação de capabilities
function registerCommands() {
    // /kick <player> [reason]
    registerCommand('kick', 'kick', async (admin, targetName, ...reason) => {
        const target = findPlayer(targetName);
        if (!target) return notify(admin, 'error', 'Jogador não encontrado');
        
        await kickPlayer(target, reason.join(' ') || 'Sem motivo especificado');
        auditLog('kick', admin, target, reason.join(' '));
    });

    // /ban <player> <duration> [reason]
    registerCommand('ban', 'tempban', async (admin, targetName, duration, ...reason) => {
        const target = findPlayer(targetName);
        if (!target) return notify(admin, 'error', 'Jogador não encontrado');
        
        await banPlayer(target, parseDuration(duration), reason.join(' '));
        auditLog('ban', admin, target, `${duration}: ${reason.join(' ')}`);
    });

    // /tp <player> ou /tp <x> <y> <z>
    registerCommand('tp', 'teleport', async (admin, ...args) => {
        if (args.length === 1) {
            const target = findPlayer(args[0]);
            admin.setPosition(target.position);
        } else if (args.length === 3) {
            admin.setPosition({ x: +args[0], y: +args[1], z: +args[2] });
        }
        auditLog('teleport', admin, null, args.join(' '));
    });
}

function registerCommand(name, capability, handler) {
    Commands.register(`/${name}`, async (player, ...args) => {
        if (!hasCapability(player, capability)) {
            notify(player, 'error', 'Sem permissão');
            return;
        }
        await handler(player, ...args);
    });
}
```

## Validação Anti-Cheat (Server-Side)

```javascript
// Rate limiter por jogador
const rateLimits = new Map();

function checkRateLimit(playerId, eventName) {
    const key = `${playerId}:${eventName}`;
    const now = Date.now();
    const limit = config.antiCheat.eventRateLimit;

    if (!rateLimits.has(key)) {
        rateLimits.set(key, { count: 0, windowStart: now });
    }

    const entry = rateLimits.get(key);

    if (now - entry.windowStart > 1000) {
        entry.count = 0;
        entry.windowStart = now;
    }

    entry.count++;

    if (entry.count > limit.maxEventsPerSecond + limit.burstAllowance) {
        flagSuspicious(playerId, `Rate limit exceeded: ${eventName}`);
        return false;
    }

    return true;
}

// Validação de movimento (anti-speedhack)
function validateMovement(player, newPosition) {
    const distance = calculateDistance(player.position, newPosition);
    const maxDistance = player.speed * deltaTime * config.antiCheat.speedThreshold;

    if (distance > maxDistance) {
        flagSuspicious(player.id, `Speed hack suspected: ${distance}m in ${deltaTime}ms`);
        player.setPosition(player.lastValidPosition);
        return false;
    }

    player.lastValidPosition = newPosition;
    return true;
}
```

## Regras

1. **TODA ação de admin** é logada no audit log — sem exceções
2. **Capabilities são granulares** — NUNCA dê acesso genérico
3. **Anti-cheat é server-side** — client NUNCA é confiável
4. **Rate limiting** em TODOS os eventos client→server
5. **Bans persistem** no banco de dados — sobrevivem a restarts
6. **Staff NUNCA** vê dados sensíveis (IPs, senhas) — apenas IDs de conta

