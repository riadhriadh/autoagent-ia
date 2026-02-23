# 🚀 Guide de Démarrage Rapide - AutoAgent IA

Démarrez avec AutoAgent IA en 5 minutes!

## ⚡ Installation Express

### 1. Choisir votre Provider LLM

#### Option A: Ollama (Local - Gratuit) 🏠

Installez Ollama:
- **macOS/Linux:** `curl https://ollama.ai/install.sh | sh`
- **Windows:** Téléchargez depuis https://ollama.ai

Puis téléchargez un modèle:
```bash
ollama pull phi3:mini  # Léger (2GB) - Recommandé pour 8GB RAM
# ou
ollama pull llama3:8b  # Plus performant (5GB) - Pour 16GB+ RAM
```

Dans `.env`:
```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=phi3:mini
```

#### Option B: OpenAI GPT-4 (Cloud - Payant) 🤖

1. Obtenez une clé API: https://platform.openai.com
2. Ajoutez $5-20 de crédits

Dans `.env`:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4-turbo-preview
```

#### Option C: Claude (Cloud - Payant) 🧠

1. Obtenez une clé API: https://console.anthropic.com
2. Ajoutez des crédits

Dans `.env`:
```env
LLM_PROVIDER=claude
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-2.1
```

**Note:** Utilise Claude 2.x (ancienne API). Pour Claude 3.5, une mise à jour future du SDK sera nécessaire.

📖 **[Guide complet des providers](docs/LLM_PROVIDERS.md)**

### 2. Setup du Projet

```bash
# Installer les dépendances
npm install

# Configurer
npm run setup
cp .env.example .env

# Éditer .env avec votre provider choisi
nano .env
```

### 3. Premier Lancement

```bash
# Démarrer l'agent
npm run dev
```

### 4. Scanner le QR Code (optionnel)

Si WhatsApp est activé, scannez le QR code qui s'affiche:
1. Ouvrez WhatsApp sur votre téléphone
2. Menu → Appareils connectés → Connecter un appareil
3. Scannez le QR code

## 📱 Test via WhatsApp

Envoyez à l'agent:
```
status
```

Vous devriez recevoir:
```
📊 Statut de l'Agent

✅ Tâches complétées: 0
⏳ En cours: 0
📋 En attente: 0

💾 Total: 0 tâches
```

## 🎯 Première Tâche

### Via WhatsApp

Envoyez:
```
Créer une API REST simple avec Express
```

### Via CLI

```bash
npm run dev "Créer une API REST simple avec Express"
```

### Ce qui va se passer

1. L'agent analyse la demande (5-10s)
2. Crée la structure du projet
3. Vous demande d'approuver `npm install` via WhatsApp
4. Génère le code
5. Fait un commit Git
6. Vous notifie quand c'est terminé

### Résultat

Nouveau projet dans `workspace/project-xxxxx/` avec:
- ✅ Structure Express complète
- ✅ TypeScript configuré
- ✅ Git initialisé
- ✅ README.md
- ✅ Prêt à lancer!

## 🧪 Tester le Projet Créé

```bash
# Aller dans le projet
cd workspace/project-xxxxx

# Installer et lancer
npm install
npm run dev
```

Ouvrez http://localhost:3000 - Votre API fonctionne! 🎉

## 📋 Commandes Utiles

### WhatsApp
- `status` - Voir le statut
- `liste` - Approbations en attente
- `approuve <id>` - Approuver
- `refuse <id>` - Rejeter
- `aide` - Afficher l'aide

### CLI
```bash
npm run cli status              # Statut
npm run cli list-tasks          # Tâches
npm run cli list-projects       # Projets
npm run cli list-approvals      # Approbations
npm run cli approve <id>        # Approuver
npm run cli logs                # Logs
```

## 🎨 Exemples de Demandes

### API Backend
```
Créer une API REST avec Express pour gérer des produits (CRUD)
```

### Application React
```
Créer une app React avec Vite, page d'accueil et routing
```

### Script Python
```
Créer un script Python pour analyser des fichiers CSV
```

### Full-Stack
```
Créer une appli full-stack: backend Express + frontend React pour un blog
```

## ⚙️ Configuration Rapide

### Si vous avez seulement 8GB RAM

Dans `.env`:
```env
OLLAMA_MODEL=phi3:mini
LLM_MAX_TOKENS=1536
```

Dans `config/agent.config.json`:
```json
{
  "maxConcurrentTasks": 1,
  "enableLLMCache": true
}
```

### Mode Sans WhatsApp

Dans `.env`:
```env
WHATSAPP_ENABLED=false
```

Approuvez via CLI:
```bash
npm run cli list-approvals
npm run cli approve <id>
```

### Mode Développement (Plus Permissif)

Dans `config/permissions.json`:
```json
{
  "criticalActions": {
    "delete": false,
    "execute": false,
    "apiCall": false
  }
}
```

⚠️ **Attention:** N'utilisez PAS en production!

## 🔧 Dépannage Express

### "Model not found"
```bash
ollama pull phi3:mini
```

### "Ollama connection refused"
```bash
# Vérifier qu'Ollama tourne
ollama list

# Ou le démarrer
ollama serve
```

### "WhatsApp QR expired"
```bash
# Supprimer la session et redémarrer
rm -rf whatsapp-session
npm run dev
```

### "Permission denied"
```bash
# Vérifier les permissions dans config/permissions.json
npm run cli config
```

## 📚 Documentation Complète

- [README.md](../README.md) - Vue d'ensemble
- [CONFIGURATION.md](../docs/CONFIGURATION.md) - Configuration détaillée
- [WHATSAPP_SETUP.md](../docs/WHATSAPP_SETUP.md) - Setup WhatsApp
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Architecture technique
- [USAGE.md](USAGE.md) - Exemples d'utilisation

## 🎓 Prochaines Étapes

1. ✅ Testez avec différents types de projets
2. ✅ Personnalisez les permissions
3. ✅ Ajoutez vos numéros WhatsApp
4. ✅ Explorez les templates
5. ✅ Créez vos propres outils!

## 💡 Conseils

- **Soyez spécifique** dans vos demandes
- **Approuvez rapidement** pour éviter les timeouts
- **Vérifiez les projets** générés avant de les utiliser
- **Utilisez Git** pour tracker les changements
- **Consultez les logs** en cas de problème

## 🆘 Besoin d'Aide?

1. Consultez les logs: `npm run cli logs`
2. Vérifiez la config: `npm run cli config`
3. Vérifiez le modèle: `npm run cli check-model`
4. Lisez la [documentation complète](../docs/)

---

## ✨ Vous êtes Prêt!

Votre agent IA est maintenant opérationnel. Commencez à créer des projets automatiquement!

```bash
npm run dev "Créer mon premier projet automatique!"
```

**Amusez-vous bien!** 🚀
