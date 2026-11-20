# Skill: World Management (Clima, Tempo, Zonas, Eventos)

## Quando Usar
Ao criar, configurar ou expandir o sistema de gestão do mundo — incluindo
ciclo dia/noite, clima, zonas, eventos mundiais, e instâncias.

## Responsabilidades do viccs-world

```
┌─────────────────────────────────────────────────────────┐
│                    viccs-world                           │
│                                                         │
│  ├── Ciclo Dia/Noite (Time System)                     │
│  ├── Clima e Estações (Weather System)                  │
│  ├── Zonas e Regiões (Zone System)                     │
│  ├── Eventos Mundiais (World Events)                    │
│  ├── Instâncias/Virtual Worlds                         │
│  └── Scheduler (Tick System)                           │
│                                                         │
│  Alimenta:                                              │
│  ├── viccs-npc     → Schedules de NPCs                 │
│  ├── viccs-classes → Horários de aulas                  │
│  ├── viccs-beasts  → Spawn/behavior por hora/clima      │
│  ├── viccs-quests  → Triggers de eventos temporais      │
│  └── viccs-combat  → Modificadores de ambiente          │
└─────────────────────────────────────────────────────────┘
```

## Config (config/world.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-world",
    "$version": "1.0.0",

    "time": {
        "enabled": true,
        "// nota": "1 dia in-game = cycleMinutes minutos reais",
        "cycleMinutes": 120,
        "startHour": 8,
        "syncToAllPlayers": true
    },

    "weather": {
        "enabled": true,
        "changeIntervalMs": 1800000,
        "types": {
            "clear":    { "weight": 40, "lightMod": 1.0, "speedMod": 1.0 },
            "cloudy":   { "weight": 25, "lightMod": 0.8, "speedMod": 1.0 },
            "rain":     { "weight": 15, "lightMod": 0.6, "speedMod": 0.9 },
            "storm":    { "weight": 8,  "lightMod": 0.4, "speedMod": 0.8 },
            "fog":      { "weight": 7,  "lightMod": 0.5, "speedMod": 0.85 },
            "snow":     { "weight": 5,  "lightMod": 0.7, "speedMod": 0.85 }
        },
        "seasonalOverrides": {
            "winter": { "snow": 30, "clear": 20 },
            "autumn": { "rain": 25, "fog": 15 }
        }
    },

    "zones": {
        "hogwarts_castle": {
            "name": "Castelo de Hogwarts",
            "type": "safe",
            "pvpAllowed": false,
            "respawnPoint": { "x": 0, "y": 0, "z": 0 },
            "music": "ambient_hogwarts_interior"
        },
        "forbidden_forest": {
            "name": "Floresta Proibida",
            "type": "dangerous",
            "pvpAllowed": true,
            "dangerLevel": 3,
            "beastSpawnMultiplier": 2.0,
            "music": "ambient_forest_dark"
        },
        "hogsmeade": {
            "name": "Hogsmeade",
            "type": "town",
            "pvpAllowed": false,
            "shops": true,
            "music": "ambient_hogsmeade"
        }
    },

    "worldEvents": {
        "quidditch_match": {
            "name": "Partida de Quadribol",
            "type": "scheduled",
            "schedule": "saturday_15:00",
            "durationMs": 1800000,
            "announcement": "Uma partida de Quadribol está prestes a começar!",
            "zone": "quidditch_pitch"
        },
        "dark_wizard_invasion": {
            "name": "Invasão de Bruxos das Trevas",
            "type": "random",
            "minIntervalMs": 7200000,
            "chance": 0.15,
            "durationMs": 900000,
            "announcement": "⚠️ Bruxos das Trevas foram avistados perto de {zone}!"
        }
    },

    "serverTick": {
        "intervalMs": 1000,
        "// nota": "Tick principal do servidor — atualiza time, weather, spawns"
    }
}
```

## Virtual Worlds (Instâncias)

O Arcane MP suporta Virtual Worlds — cópias isoladas do mundo para diferentes
propósitos:

```javascript
// World 0 = Mundo principal (todos os jogadores)
// World 1+ = Instâncias privadas

// Criar instância para uma dungeon
const instanceId = worldManager.createInstance({
    templateZone: 'forbidden_forest_cave',
    maxPlayers: 4,
    timeoutMs: 3600000,
    onComplete: (instance) => {
        distributeRewards(instance.players);
        instance.destroy();
    },
});

// Mover jogadores para a instância
players.forEach((p) => {
    p.setWorld(instanceId);
    p.setPosition(spawnPoint);
});
```

## Regras

1. **Time/Weather são sincronizados** pelo server para TODOS os jogadores
2. **Zonas definem regras** de PvP, perigo, spawns, música
3. **Eventos mundiais** são configuráveis — scheduled ou random
4. **Virtual Worlds** isolam completamente — sem interferência entre instâncias
5. **Server tick** é o heartbeat — 1 segundo, gerencia tudo que é temporal

