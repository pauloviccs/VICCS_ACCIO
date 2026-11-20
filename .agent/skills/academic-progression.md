# Skill: Sistema de Progressão Acadêmica

## Quando Usar
Ao criar, configurar ou expandir o sistema de aulas, matérias, progressão
acadêmica e graduação no servidor VICCS Accio.

## Conceito

No VICCS Accio, os jogadores são estudantes de Hogwarts. A progressão acadêmica
é o coração do RPG — aprender magias, poções e habilidades através de aulas,
prática e exploração.

## Matérias (config/subjects.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-classes",
    "$version": "1.0.0",
    "$description": "Definição de matérias e progressão acadêmica",

    "academicYear": {
        "maxLevel": 7,
        "xpPerLevel": [0, 1000, 2500, 5000, 10000, 20000, 40000],
        "classAttendanceXp": 50,
        "perfectAttendanceBonus": 1.5,
        "examPassXp": 200,
        "examFailXp": 25
    },

    "subjects": {
        "charms": {
            "name": "Feitiços",
            "professor": "professor_flitwick",
            "classroom": "charms_classroom",
            "schedule": {
                "monday": ["10:00", "14:00"],
                "wednesday": ["10:00"],
                "friday": ["14:00"]
            },
            "unlocksAtLevel": {
                "1": ["lumos", "wingardium_leviosa"],
                "2": ["accio", "depulso"],
                "3": ["expelliarmus", "protego"],
                "4": ["stupefy", "flipendo"],
                "5": ["levioso", "glacius"],
                "6": ["arresto_momentum", "transformation"],
                "7": ["viccs_tempestade_arcana"]
            },
            "examType": "practical",
            "housePointsPerClass": 5
        },
        "potions": {
            "name": "Poções",
            "professor": "professor_sharp",
            "classroom": "potions_classroom",
            "schedule": {
                "tuesday": ["10:00", "14:00"],
                "thursday": ["10:00"]
            },
            "unlocksAtLevel": {
                "1": ["wiggenweld_potion"],
                "2": ["edurus_potion"],
                "3": ["invisibility_potion"],
                "4": ["thunderbrew"],
                "5": ["focus_potion"],
                "6": ["felix_felicis"],
                "7": ["viccs_elixir_supremo"]
            },
            "examType": "crafting",
            "housePointsPerClass": 5
        },
        "defense_dark_arts": {
            "name": "Defesa Contra as Artes das Trevas",
            "professor": "professor_hecat",
            "classroom": "dada_classroom",
            "schedule": {
                "monday": ["14:00"],
                "wednesday": ["14:00"],
                "friday": ["10:00"]
            },
            "unlocksAtLevel": {
                "1": ["basic_combat_stance"],
                "3": ["confringo", "diffindo"],
                "5": ["bombarda", "incendio"],
                "7": ["ancient_magic_mastery"]
            },
            "examType": "duel",
            "housePointsPerClass": 5
        },
        "herbology": {
            "name": "Herbologia",
            "professor": "professor_garlick",
            "classroom": "greenhouse",
            "schedule": {
                "tuesday": ["14:00"],
                "thursday": ["14:00"]
            },
            "unlocksAtLevel": {
                "1": ["grow_dittany", "grow_mandrake"],
                "3": ["grow_venomous_tentacula"],
                "5": ["grow_chinese_chomping_cabbage"],
                "7": ["viccs_ancient_herb_mastery"]
            },
            "examType": "crafting",
            "housePointsPerClass": 5
        },
        "care_magical_creatures": {
            "name": "Trato das Criaturas Mágicas",
            "professor": "professor_howin",
            "classroom": "beast_paddock",
            "schedule": {
                "wednesday": ["10:00"],
                "friday": ["10:00"]
            },
            "unlocksAtLevel": {
                "1": ["beast_feed", "beast_brush"],
                "3": ["beast_tame_common"],
                "5": ["beast_tame_uncommon"],
                "7": ["beast_tame_legendary"]
            },
            "examType": "practical",
            "housePointsPerClass": 5
        }
    },

    "grades": {
        "O": { "name": "Excepcional (Outstanding)", "minScore": 90 },
        "E": { "name": "Excede Expectativas", "minScore": 75 },
        "A": { "name": "Aceitável", "minScore": 60 },
        "P": { "name": "Péssimo (Poor)", "minScore": 40 },
        "D": { "name": "Deplorável (Dreadful)", "minScore": 20 },
        "T": { "name": "Trasgo (Troll)", "minScore": 0 }
    }
}
```

## Fluxo de Aula

```
1. Horário de aula começa (scheduler do viccs-world)
   └► 'viccs:classes:classStarting' emitido

2. NPC professor vai para sala de aula (viccs-npc schedule)

3. Jogadores próximos recebem notificação
   └► "A aula de Feitiços vai começar em 5 minutos!"

4. Jogadores entram na zona da sala (viccs-interact)
   └► Presença registrada no banco

5. Aula começa:
   ├── Professor NPC faz diálogos/animações
   ├── Jogadores praticam (mini-games ou casting)
   └── Pontos de participação concedidos

6. Aula termina:
   ├── XP de presença adicionado
   ├── House Points concedidos
   └── Se elegível → exame disponível
```

## Regras

1. **Schedule das aulas** é configurável — funciona com o ciclo dia/noite do viccs-world
2. **Progressão desbloqueia** magias, poções, habilidades definidas no config
3. **Exames** podem ser práticos (duelo), crafting (poção) ou teóricos (quiz)
4. **House Points** são concedidos automaticamente por presença e performance
5. **Nenhuma habilidade** é desbloqueada sem o nível acadêmico correspondente

