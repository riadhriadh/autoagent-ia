# 🤖 AutoAgent IA - Agent IA Autonome Local

Agent IA autonome local capable de développer des applications de manière autonome avec intégration WhatsApp pour notifications et confirmations.

## 🎯 Caractéristiques

- ✅ **100% Local** - Fonctionne avec des modèles LLM locaux (Ollama)
- ✅ **Léger** - Optimisé pour 8GB RAM avec Phi-3 mini (2GB)
- ✅ **Autonome** - Analyse, planifie et exécute des tâches complexes
- ✅ **Sécurisé** - Système de permissions configurables et approbations
- ✅ **WhatsApp** - Notifications et contrôle via WhatsApp
- ✅ **Multi-langages** - Supporte Web, Python, Full-stack, etc.
- ✅ **Workspace isolé** - Chaque projet dans un environnement git isolé

## 📋 Prérequis

- **Node.js** 20.x ou supérieur
- **Ollama** installé et en cours d'exécution
- **8GB RAM minimum** (16GB recommandé)
- **WhatsApp** (optionnel, pour les notifications)

## 🚀 Installation

### 1. Installer Ollama et le modèle

```bash
# Télécharger Ollama depuis https://ollama.ai
# Puis télécharger le modèle:
ollama pull phi3:mini
```

### 2. Cloner et configurer le projet

```bash
git clone <repo-url>
cd autoagent
npm install
```

### 3. Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env
```

### 4. Initialiser la base de données

```bash
npm run setup
```

## 🎮 Utilisation

### Démarrer l'agent

```bash
# Mode développement (avec rechargement automatique)
npm run dev

# Mode production
npm run build
npm start
```

### Utiliser le CLI

```bash
# Voir le statut
npm run cli status

# Lister les tâches
npm run cli list-tasks

# Approuver une action
npm run cli approve <task-id>

# Rejeter une action
npm run cli reject <task-id>
```

### Commandes WhatsApp

Une fois l'agent connecté à WhatsApp, envoyez:

- `status` - Voir le statut de l'agent
- `approuve <id>` - Approuver une action en attente
- `refuse <id>` - Refuser une action
- `liste` - Voir les tâches en cours
- `stop` - Arrêter la tâche en cours
- `aide` - Afficher l'aide

## 📁 Structure du Projet

```
autoagent/
├── src/
│   ├── core/           # Cerveau de l'agent
│   │   ├── agent.ts    # Orchestrateur principal
│   │   ├── llm.ts      # Wrapper Ollama
│   │   ├── prompts.ts  # Prompts système
│   │   └── security.ts # Validation permissions
│   ├── tools/          # Outils disponibles
│   │   ├── filesystem.ts
│   │   ├── git.ts
│   │   ├── api.ts
│   │   └── terminal.ts
│   ├── integrations/   # Intégrations externes
│   │   └── whatsapp.ts
│   ├── db/            # Base de données
│   │   ├── database.ts
│   │   └── schema.ts
│   └── index.ts       # Point d'entrée
├── config/            # Fichiers de configuration
├── workspace/         # Projets générés
├── data/             # Base de données
├── logs/             # Logs de l'agent
└── docs/             # Documentation détaillée
```

## ⚙️ Configuration

### Permissions (`config/permissions.json`)

```json
{
  "allowedPaths": ["./workspace"],
  "deniedPaths": ["/system", "/etc", "C:\\Windows"],
  "allowedCommands": ["npm", "git", "node", "python"],
  "maxFileSize": 10485760,
  "criticalActions": ["delete", "execute", "api"]
}
```

### Paramètres Agent (`config/agent.config.json`)

Voir [docs/CONFIGURATION.md](docs/CONFIGURATION.md) pour plus de détails.

## 🛡️ Sécurité

- **Sandbox** - L'agent ne peut accéder qu'au workspace configuré
- **Whitelist** - Seules les commandes autorisées peuvent être exécutées
- **Approbations** - Les actions critiques requièrent approbation
- **Logs** - Toutes les actions sont loguées
- **Isolation** - Chaque projet dans son propre répertoire git

## 📖 Documentation

- [Guide de Configuration](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Setup WhatsApp](docs/WHATSAPP_SETUP.md)
- [Exemples d'Usage](examples/)

## 🧪 Tests

```bash
npm test
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md)

## 📝 Licence

MIT

## 🆘 Support

- Issues: [GitHub Issues](https://github.com/...)
- Documentation: [docs/](docs/)
