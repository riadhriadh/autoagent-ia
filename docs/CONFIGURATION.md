# Configuration de l'Agent IA

Ce document explique comment configurer AutoAgent IA pour l'adapter à vos besoins.

## Fichiers de Configuration

### 1. `.env` - Variables d'Environnement

Copiez `.env.example` vers `.env` et modifiez les valeurs:

```bash
cp .env.example .env
```

#### Paramètres Principaux

**Modèle LLM:**
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3:mini
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2048
```

- `OLLAMA_MODEL`: Modèles recommandés avec 8GB RAM:
  - `phi3:mini` (3.8B) - Léger et efficace
  - `llama3.2:3b` - Bon équilibre
  - `qwen2.5:3b` - Très performant

**Workspace:**
```env
WORKSPACE_PATH=./workspace
MAX_FILE_SIZE_MB=10
ALLOWED_EXTENSIONS=.js,.ts,.jsx,.tsx,.json,.md,.txt,.html,.css,.py,.sh
```

**WhatsApp:**
```env
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./whatsapp-session
WHATSAPP_ADMIN_NUMBERS=+33612345678,+33687654321
```

- Séparez plusieurs numéros par des virgules
- Format international obligatoire (+33...)

**Sécurité:**
```env
ENABLE_COMMAND_EXECUTION=true
ENABLE_API_CALLS=true
REQUIRE_APPROVAL_FOR_DELETE=true
REQUIRE_APPROVAL_FOR_EXEC=true
REQUIRE_APPROVAL_FOR_API=false
```

### 2. `config/permissions.json` - Permissions et Sécurité

Contrôle ce que l'agent peut faire:

```json
{
  "allowedPaths": ["./workspace"],
  "deniedPaths": ["/system", "C:\\Windows"],
  "allowedCommands": ["npm", "git", "node", "python"],
  "deniedCommands": ["rm -rf", "format"],
  "maxFileSizeMB": 10,
  "criticalActions": {
    "delete": true,
    "execute": true,
    "apiCall": false
  }
}
```

#### Chemins Autorisés/Interdits

- **allowedPaths**: L'agent ne peut accéder qu'à ces répertoires
- **deniedPaths**: Interdiction explicite (prioritaire)

**Exemple:**
```json
{
  "allowedPaths": [
    "./workspace",
    "./temp"
  ],
  "deniedPaths": [
    "/etc",
    "/system",
    "C:\\Windows",
    "C:\\Program Files"
  ]
}
```

#### Commandes Autorisées

Whitelist de commandes pour la sécurité:

```json
{
  "allowedCommands": [
    "npm", "yarn", "pnpm",
    "git",
    "node", "python", "python3",
    "mkdir", "ls", "cat"
  ],
  "deniedCommands": [
    "rm -rf",
    "del /f",
    "format",
    "shutdown"
  ]
}
```

#### Actions Critiques

Définit quelles actions nécessitent une approbation:

```json
{
  "criticalActions": {
    "delete": true,          // Suppression de fichiers
    "execute": true,         // Exécution de commandes
    "apiCall": false,        // Appels API
    "gitPush": true,         // Git push
    "installPackage": false  // Installation de packages
  }
}
```

- `true`: Approbation requise
- `false`: Exécution automatique

### 3. `config/agent.config.json` - Configuration de l'Agent

Paramètres généraux de l'agent:

```json
{
  "workspacePath": "./workspace",
  "modelName": "phi3:mini",
  "maxRetries": 3,
  "maxConcurrentTasks": 3,
  "taskTimeout": 300000,
  "enableLLMCache": true,
  "logLevel": "info"
}
```

#### Paramètres

- **maxRetries**: Tentatives en cas d'échec
- **maxConcurrentTasks**: Tâches simultanées (attention à la RAM)
- **taskTimeout**: Timeout par tâche en ms (300000 = 5min)
- **enableLLMCache**: Cache des réponses LLM (économise des ressources)
- **logLevel**: Niveau de logs (`error`, `warn`, `info`, `debug`)

## Configuration Avancée

### Optimisation pour 8GB RAM

Si vous avez exactement 8GB de RAM:

```env
# .env
OLLAMA_MODEL=phi3:mini  # Environ 2GB
LLM_MAX_TOKENS=1536     # Réduire pour économiser

# agent.config.json
{
  "maxConcurrentTasks": 1,
  "enableLLMCache": true,
  "taskTimeout": 180000
}
```

### Configuration pour Développement

Plus permissif pour tester:

```json
{
  "criticalActions": {
    "delete": false,
    "execute": false,
    "apiCall": false,
    "gitPush": true,
    "installPackage": false
  }
}
```

⚠️ **Ne pas utiliser en production!**

### Configuration pour Production

Sécurité maximale:

```json
{
  "criticalActions": {
    "delete": true,
    "execute": true,
    "apiCall": true,
    "gitPush": true,
    "installPackage": true
  }
}
```

## Scénarios d'Utilisation

### 1. Agent Totalement Autonome

- Pas de WhatsApp
- Approbations via CLI seulement
- Permissions larges

```env
WHATSAPP_ENABLED=false
REQUIRE_APPROVAL_FOR_DELETE=false
REQUIRE_APPROVAL_FOR_EXEC=false
```

### 2. Agent Supervisé

- WhatsApp activé
- Approbations pour actions critiques
- Sécurité élevée

```env
WHATSAPP_ENABLED=true
REQUIRE_APPROVAL_FOR_DELETE=true
REQUIRE_APPROVAL_FOR_EXEC=true
REQUIRE_APPROVAL_FOR_API=true
```

### 3. Agent Mode Sandbox

- Workspace isolé
- Aucune commande système
- Lecture/écriture seulementjson
```env
ENABLE_COMMAND_EXECUTION=false
ENABLE_API_CALLS=false

# permissions.json
{
  "allowedPaths": ["./workspace/sandbox"],
  "allowedCommands": []
}
```

## Dépannage

### L'agent ne démarre pas

1. Vérifier qu'Ollama est lancé: `ollama list`
2. Vérifier que le modèle existe: `ollama pull phi3:mini`
3. Vérifier les permissions sur `./workspace`

### Erreurs de permissions

Vérifier `config/permissions.json`:
- Le chemin est dans `allowedPaths`?
- La commande est dans `allowedCommands`?
- L'extension de fichier est autorisée?

### WhatsApp ne se connecte pas

1. Scanner le QR code rapidement (expire après 60s)
2. Vérifier que le port n'est pas bloqué
3. Supprimer `whatsapp-session/` et réessayer

### RAM insuffisante

1. Utiliser un modèle plus petit: `phi3:mini`
2. Réduire `maxConcurrentTasks` à 1
3. Réduire `LLM_MAX_TOKENS`
4. Activer le cache: `enableLLMCache: true`

## Bonnes Pratiques

1. **Toujours tester en dev** avant de mettre en production
2. **Sauvegarder la DB** régulièrement (`data/agent.db`)
3. **Monitorer la RAM** avec `npm run cli status`
4. **Limiter les chemins** au strict nécessaire
5. **Utiliser WhatsApp** pour les notifications importantes
6. **Logger les actions** pour l'audit

## Rechargement de la Configuration

Pour recharger sans redémarrer:

```javascript
import { configLoader } from './src/core/config-loader.js';
configLoader.reload();
```

Ou redémarrer l'agent:

```bash
# Ctrl+C puis
npm run dev
```
