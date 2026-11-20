# Skill: Sistema de Magias (Spell System)

## Quando Usar
Ao criar, modificar ou expandir qualquer funcionalidade relacionada a magias
no servidor VICCS Accio — incluindo magias de combate, utilitárias, de movimento,
e magias totalmente customizadas que não existem no jogo original.

## Conceitos do Universo

### Categorias de Magia
O jogo original organiza magias em categorias. O VICCS expande isso:

```
Dano (Damage)       → Stupefy, Confringo, Diffindo, Bombarda
Controle (Control)   → Levioso, Accio, Depulso, Glacius
Força (Force)        → Flipendo, Expelliarmus, Descendo
Utilitárias          → Lumos, Reparo, Revelio, Alohomora
Imperdoáveis         → Avada Kedavra, Crucio, Imperio (restrito/RP)
Transformação        → Transformation spells
VICCS Custom         → Novas magias criadas exclusivamente para o server
```

### Arquitetura do Sistema de Magias

```
┌─────────────────────────────────────────────────────┐
│                   viccs-spells                       │
│                                                     │
│  config/spells.json ◄── Definição de TODAS as magias│
│       │                                             │
│  server/                                            │
│  ├── main.js         ◄── Init, carrega spells       │
│  ├── spell-engine.js ◄── Core: cast, cooldown, dmg  │
│  ├── spell-effects.js◄── Efeitos visuais/sonoros    │
│  ├── events.js       ◄── Event handlers             │
│  ├── database.js     ◄── Persistência (aprendizado) │
│  └── validators.js   ◄── Validação anti-cheat       │
│                                                     │
│  Comunica com:                                      │
│  ├── viccs-combat    (dano, PvP/PvE)               │
│  ├── viccs-inventory (reagentes, varinhas)          │
│  ├── viccs-classes   (aprendizado via aulas)        │
│  ├── viccs-quests    (progresso de missões)         │
│  └── viccs-world     (efeitos no ambiente)          │
└─────────────────────────────────────────────────────┘
```

## Config de Magias (config/spells.json)

Cada magia é 100% configurável sem alterar código:

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-spells",
    "$version": "1.0.0",
    "$description": "Definição de todas as magias do servidor",

    "globalSettings": {
        "globalCooldownMs": 1500,
        "maxSpellsEquipped": 8,
        "masteryLevels": 10,
        "masteryXpPerCast": 5,
        "masteryXpPerKill": 50,
        "masteryScaling": 0.12
    },

    "spells": {
        "stupefy": {
            "name": "Stupefy",
            "description": "Atordoa o alvo brevemente",
            "category": "damage",
            "tier": 1,
            "baseDamage": 40,
            "cooldownMs": 3000,
            "range": 20.0,
            "castTimeMs": 0,
            "aoeRadius": 0,
            "effects": {
                "stun": { "durationMs": 2000, "chance": 0.3 },
                "knockback": { "force": 5.0 }
            },
            "requirements": {
                "minLevel": 1,
                "masteryRequired": 0,
                "questRequired": null,
                "classRequired": null
            },
            "visuals": {
                "clientFx": "spell_stupefy_cast",
                "impactFx": "spell_stupefy_hit",
                "soundCast": "sfx_stupefy_cast",
                "soundImpact": "sfx_stupefy_hit",
                "color": "#FF4444"
            },
            "scaling": {
                "damagePerMastery": 4,
                "cooldownReductionPerMastery": 100,
                "stunChancePerMastery": 0.05
            }
        },

        "viccs_tempestade_arcana": {
            "name": "Tempestade Arcana",
            "description": "Invoca uma tempestade mágica localizada (VICCS Original)",
            "category": "viccs_custom",
            "tier": 5,
            "baseDamage": 120,
            "cooldownMs": 30000,
            "range": 25.0,
            "castTimeMs": 2000,
            "aoeRadius": 10.0,
            "effects": {
                "dot": { "damagePerTick": 15, "tickMs": 1000, "durationMs": 8000 },
                "slow": { "percentage": 0.4, "durationMs": 5000 }
            },
            "requirements": {
                "minLevel": 30,
                "masteryRequired": 7,
                "questRequired": "quest_ancient_magic_mastery",
                "classRequired": null
            },
            "visuals": {
                "clientFx": "spell_tempestade_cast",
                "impactFx": "spell_tempestade_zone",
                "soundCast": "sfx_tempestade_cast",
                "soundImpact": "sfx_tempestade_ambient",
                "color": "#7B5FFF"
            },
            "scaling": {
                "damagePerMastery": 12,
                "cooldownReductionPerMastery": 1000,
                "aoeRadiusPerMastery": 0.5
            }
        }
    }
}
```

## Fluxo de Cast de Magia

```
1. Client: Jogador pressiona tecla de magia
   └► Events.emit('viccs:spells:requestCast', { spellId, targetId })

2. Server: Recebe e VALIDA
   ├── Jogador conhece a magia? (spells_learned)
   ├── Magia está em cooldown? (spell_cooldowns)
   ├── Jogador tem nível/mastery suficiente?
   ├── Alvo está no range?
   ├── Jogador tem reagentes? (se necessário)
   └── PvP permitido nesta zona? (consulta viccs-combat)

3. Server: Se válido, EXECUTA
   ├── Calcula dano (base + mastery scaling)
   ├── Aplica efeitos (stun, knockback, dot, etc.)
   ├── Registra cooldown
   ├── Adiciona XP de mastery
   ├── Emite eventos para ecossistema

4. Server → Clients: Notifica resultado
   ├── Events.emit(caster, 'viccs:spells:castSuccess', data)
   ├── Events.emit(target, 'viccs:spells:hit', data)
   └── Events.emitAll(nearby, 'viccs:spells:castVisual', data)

5. Clients: Renderizam efeitos visuais/sonoros
   └► Animações, partículas, sons via clientScript
```

## Criando uma Nova Magia

### Checklist

1. Adicionar entrada em `config/spells.json`
2. Se tiver efeito novo → criar handler em `spell-effects.js`
3. Se tiver visual novo → configurar FX no client
4. Se tiver requisito especial → adicionar validação em `validators.js`
5. Testar: cast, cooldown, dano, efeitos, mastery progression

### Regras

- **TODA magia** deve estar definida no config — NUNCA hardcoded
- **Dano é calculado APENAS no server** — client renderiza visual
- **Cooldowns são enforced no server** — client mostra UI apenas
- **Mastery progression** é automática via config de XP
- **Efeitos de status** (stun, slow, dot) são processados no server tick

