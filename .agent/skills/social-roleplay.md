# Skill: Social e Roleplay (Chat, Emotes, Interações)

## Quando Usar
Ao criar, configurar ou expandir funcionalidades sociais — chat roleplay,
emotes, interações entre jogadores, correio owl, e sistemas de relacionamento.

## Subsistemas

```
┌─────────────────────────────────────────────────────────┐
│                    viccs-social                          │
│                                                         │
│  ├── Chat System                                        │
│  │   ├── IC (In-Character) chat com alcance             │
│  │   ├── OOC (Out-of-Character) chat                   │
│  │   ├── Whisper (privado)                              │
│  │   ├── House chat (por Casa)                         │
│  │   └── Slash commands (/me, /do, /shout)             │
│  │                                                     │
│  ├── Emote System                                      │
│  │   ├── Animações de roleplay                         │
│  │   ├── Emotes contextuais                            │
│  │   └── Custom emotes por nível/casa                  │
│  │                                                     │
│  ├── Owl Mail                                          │
│  │   ├── Mensagens offline entre jogadores              │
│  │   ├── Anexar items (via viccs-inventory)            │
│  │   └── Notificações de recebimento                   │
│  │                                                     │
│  └── Relationships                                     │
│      ├── Amizades, grupos, rivais                      │
│      └── Sistema de reputação                          │
└─────────────────────────────────────────────────────────┘
```

## Config (config/social.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-social",
    "$version": "1.0.0",

    "chat": {
        "icRange": 20.0,
        "shoutRange": 50.0,
        "whisperRange": 5.0,
        "oocEnabled": true,
        "maxMessageLength": 256,
        "cooldownMs": 500,
        "profanityFilter": true,
        "formats": {
            "ic": "{player.firstName} {player.lastName} diz: \"{message}\"",
            "shout": "{player.firstName} {player.lastName} GRITA: \"{message}\"",
            "whisper": "{player.firstName} sussurra: \"{message}\"",
            "me": "* {player.firstName} {player.lastName} {action}",
            "do": "** {description} **",
            "ooc": "[OOC] {player.nickname}: {message}"
        }
    },

    "emotes": {
        "wave": { "name": "Acenar", "animation": "emote_wave", "durationMs": 2000 },
        "bow": { "name": "Reverência", "animation": "emote_bow", "durationMs": 2500 },
        "clap": { "name": "Aplaudir", "animation": "emote_clap", "durationMs": 3000 },
        "sit": { "name": "Sentar", "animation": "emote_sit", "durationMs": 0, "toggle": true },
        "dance": { "name": "Dançar", "animation": "emote_dance", "durationMs": 0, "toggle": true },
        "laugh": { "name": "Rir", "animation": "emote_laugh", "durationMs": 2000 },
        "study": { "name": "Estudar", "animation": "emote_study", "durationMs": 0, "toggle": true }
    },

    "owlMail": {
        "maxMailsPerDay": 20,
        "maxAttachments": 3,
        "deliveryDelayMs": 30000,
        "mailExpiryDays": 30,
        "costPerMail": 1
    },

    "relationships": {
        "maxFriends": 50,
        "friendRequestExpiry": 72,
        "reputationEnabled": true
    }
}
```

## Chat IC com Alcance

```javascript
// O chat IC é proximity-based — apenas jogadores próximos ouvem

Events.on('viccs:social:chatIC', (player, message) => {
    if (!validateMessage(player, message)) return;

    const nearbyPlayers = getPlayersInRange(player.position, config.chat.icRange);
    const formattedMessage = formatChat('ic', player, message);

    nearbyPlayers.forEach((nearby) => {
        const distance = calculateDistance(player.position, nearby.position);
        const opacity = 1 - (distance / config.chat.icRange);

        Events.emit(nearby, 'viccs:social:chatDisplay', {
            message: formattedMessage,
            opacity: Math.max(0.3, opacity),
            type: 'ic',
        });
    });
});
```

## Regras

1. **Chat IC é proximity-based** — distância afeta opacidade do texto
2. **Chat OOC** é global mas pode ser desabilitado
3. **Profanity filter** é server-side — processado antes de enviar
4. **Owl Mail** tem custo (Knuts) e delay para imersão
5. **Emotes** respeitam cooldown para prevenir spam de animações
6. **TODA mensagem** de chat passa pelo server para validação

