# Configuration des Providers LLM

L'agent IA supporte plusieurs providers LLM pour vous offrir une flexibilité maximale entre modèles locaux et cloud.

## Providers Supportés

### 1. 🏠 Ollama (Local - Par défaut)

**Avantages:**
- ✅ Gratuit et privé
- ✅ Pas de coût API
- ✅ Fonctionne hors ligne
- ✅ Données restent locales

**Inconvénients:**
- ⚠️ Nécessite ressources locales (2-4GB RAM)
- ⚠️ Moins puissant que GPT-4 ou Claude

**Configuration:**

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3:mini
```

**Installation:**

```bash
# 1. Installer Ollama
# Windows: https://ollama.ai/download/windows
# Mac: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# 2. Télécharger un modèle
ollama pull phi3:mini        # ~2GB, recommandé (léger)
ollama pull llama3:8b        # ~5GB, plus performant
ollama pull mistral:7b       # ~4GB, équilibré
ollama pull codellama:7b     # ~4GB, spécialisé code

# 3. Lancer le serveur
ollama serve
```

**Modèles recommandés:**
- `phi3:mini` - Léger (2GB), bon pour 8GB RAM
- `llama3:8b` - Performant (5GB), pour 16GB+ RAM
- `codellama:7b` - Spécialisé code
- `mixtral:8x7b` - Très performant (26GB), pour 32GB+ RAM

---

### 2. 🤖 OpenAI (ChatGPT)

**Avantages:**
- ✅ Très performant (GPT-4, GPT-4 Turbo)
- ✅ Pas de ressources locales requises
- ✅ API rapide et fiable

**Inconvénients:**
- 💰 Payant (~$0.01-0.03 par 1K tokens)
- 🌐 Nécessite connexion internet
- 📊 Données envoyées à OpenAI

**Configuration:**

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4-turbo-preview
# OPENAI_BASE_URL=https://api.openai.com/v1  # Optionnel
```

**Obtenir une clé API:**

1. Créer un compte sur https://platform.openai.com
2. Aller dans "API Keys"
3. Créer une nouvelle clé secrète
4. Ajouter des crédits (minimum $5)

**Modèles disponibles:**

| Modèle | Prix (1M tokens) | Usage recommandé |
|--------|------------------|------------------|
| `gpt-3.5-turbo` | $0.50 / $1.50 | Tâches simples, Budget |
| `gpt-4-turbo-preview` | $10 / $30 | Équilibré performance/coût |
| `gpt-4` | $30 / $60 | Maximum de qualité |
| `gpt-4o` | $5 / $15 | Nouveau, rapide et économique |

**Estimation de coût:**

- Tâche simple (créer API) : ~10K tokens = $0.10-0.30
- Projet complet (React app) : ~50K tokens = $0.50-1.50
- Développement complexe : ~500K tokens = $5-15

---

### 3. 🧠 Claude (Anthropic)

**Avantages:**
- ✅ Excellent pour le code et raisonnement
- ✅ Très bon en analyse et décomposition
- ✅ Moins de censure que GPT-4

**Inconvénients:**
- 💰 Payant (~$0.008-0.024 par 1K tokens)
- 🌐 Nécessite connexion internet
- ⚠️ Utilise l'ancienne API Completions (Claude 2.x)

**Configuration:**

```env
LLM_PROVIDER=claude
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_MODEL=claude-2.1
```

**Obtenir une clé API:**

1. Créer un compte sur https://console.anthropic.com
2. Aller dans "API Keys"
3. Créer une nouvelle clé
4. Ajouter des crédits

**Modèles disponibles (API Completions):**

| Modèle | Prix (1M tokens) | Usage recommandé |
|--------|------------------|------------------|
| `claude-instant-1.2` | $0.80 / $2.40 | Rapide, économique |
| `claude-2.0` | $8 / $24 | Équilibré |
| `claude-2.1` | $8 / $24 | **RECOMMANDÉ** - Amélioré |

**Note:** Cette version utilise l'API Completions (Claude 2.x). Pour utiliser Claude 3.5 Sonnet et l'API Messages (nouvelle génération), une mise à jour du SDK sera nécessaire dans une version future.

**Pourquoi choisir Claude:**
- 🎯 Excellent pour architecture et planification
- 📝 Très bon pour générer du code
- 🔍 Bon en analyse de code existant

---

### 4. ☁️ Azure OpenAI

**Avantages:**
- ✅ Entreprise (SLA, support)
- ✅ Compliance (RGPD, SOC2)
- ✅ Déploiement privé possible

**Inconvénients:**
- 💰 Coût entreprise
- 🔧 Configuration complexe

**Configuration:**

```env
LLM_PROVIDER=azure
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

**Mise en place:**

1. Créer une ressource Azure OpenAI
2. Déployer un modèle
3. Récupérer endpoint et clé API

---

## 🎯 Quel Provider Choisir ?

### Pour débuter / Développement local
```
✅ Ollama (phi3:mini ou llama3)
```
- Gratuit, privé, rapide à setup
- Parfait pour apprendre et tester

### Pour usage budgété
```
✅ OpenAI GPT-3.5-Turbo ou GPT-4o
```
- Bon rapport qualité/prix
- $5-20/mois pour usage normal

### Pour meilleure qualité
```
✅ Claude 3.5 Sonnet ou GPT-4 Turbo
```
- Excellent pour projets complexes
- Meilleure compréhension du contexte

### Pour entreprise
```
✅ Azure OpenAI
```
- SLA, support, compliance
- Déploiement privé

---

## 🔀 Changer de Provider Dynamiquement

Vous pouvez changer de provider à tout moment:

```bash
# Dans .env
LLM_PROVIDER=claude  # ou openai, ollama, azure

# Redémarrer l'agent
npm run dev
```

**Via code (avancé):**

```typescript
import { llm } from './src/core/llm.js';

// Changer vers OpenAI
llm.setProvider('openai', 'gpt-4-turbo-preview');

// Changer vers Claude
llm.setProvider('claude', 'claude-2.1');

// Changer vers Ollama
llm.setProvider('ollama', 'llama3:8b');
```

---

## 💡 Bonnes Pratiques

### 1. **Développement → Local, Production → Cloud**

```env
# .env.development
LLM_PROVIDER=ollama
OLLAMA_MODEL=phi3:mini

# .env.production
LLM_PROVIDER=claude
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### 2. **Tâches Simples → Modèle Léger**

Pour tâches répétitives ou simples:
- Ollama `phi3:mini`
- OpenAI `gpt-3.5-turbo`
- Claude `haiku`

### 3. **Tâches Complexes → Modèle Puissant**

Pour architecture, refactoring, analyse:
- OpenAI `gpt-4-turbo-preview`
- Claude `claude-3-5-sonnet-20241022`
- Ollama `mixtral:8x7b` (si 32GB+ RAM)

### 4. **Monitoring des Coûts**

```typescript
import { llm } from './src/core/llm.js';

// Obtenir info provider
const info = llm.getProviderInfo();
console.log(`Provider: ${info.provider}, Model: ${info.model}`);

// Vérifier disponibilité avant utilisation
if (await llm.isModelAvailable()) {
  console.log('✅ Modèle prêt');
} else {
  console.log('❌ Modèle indisponible');
}
```

---

## 🐛 Troubleshooting

### Ollama: "Connection refused"

```bash
# Vérifier que le serveur tourne
ollama serve

# Tester
curl http://localhost:11434/api/tags
```

### OpenAI: "Invalid API key"

```bash
# Vérifier variable d'environnement
echo $OPENAI_API_KEY

# Tester clé API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Claude: "Rate limit exceeded"

- Attendre 1 minute
- Vérifier quota sur console.anthropic.com
- Passer à un tier supérieur

### Erreur générale

```bash
# Vérifier les logs
npm run cli logs

# Tester disponibilité
npm run cli check-model
```

---

## 📊 Comparaison Complète

| Critère | Ollama | OpenAI GPT-4 | Claude 2.1 | Azure |
|---------|--------|--------------|------------|-------|
| **Coût** | 🟢 Gratuit | 🟡 Moyen | 🟡 Moyen | 🔴 Élevé |
| **Performance** | 🟡 Bon | 🟢 Excellent | 🟢 Très bon | 🟢 Excellent |
| **Privacité** | 🟢 Total | 🔴 Cloud | 🔴 Cloud | 🟡 Configurable |
| **Setup** | 🟢 Simple | 🟢 Simple | 🟢 Simple | 🔴 Complexe |
| **Hors-ligne** | 🟢 Oui | 🔴 Non | 🔴 Non | 🔴 Non |
| **Code** | 🟡 Bon | 🟢 Excellent | 🟢 Très bon | 🟢 Excellent |
| **Contexte** | 🟡 4-8K | 🟢 128K | 🟢 100K | 🟢 128K |

---

## 🚀 Exemples d'Usage

### Exemple 1: Ollama pour développement local

```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=phi3:mini
```

```bash
npm run dev
# Via WhatsApp: "Crée une API Express simple"
```

### Exemple 2: GPT-4 pour projet important

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4-turbo-preview
```

```bash
npm run dev
# Via WhatsApp: "Développe une application React complète avec authentification"
```

### Exemple 3: Claude 2.1 pour analyse de code

```env
LLM_PROVIDER=claude
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-2.1
```

```bash
npm run dev
# Via WhatsApp: "Analyse mon projet et suggère des améliorations d'architecture"
```

---

## 🔗 Ressources

**Ollama:**
- Site: https://ollama.ai
- Modèles: https://ollama.ai/library
- GitHub: https://github.com/ollama/ollama

**OpenAI:**
- Platform: https://platform.openai.com
- Pricing: https://openai.com/pricing
- Docs: https://platform.openai.com/docs

**Claude (Anthropic):**
- Console: https://console.anthropic.com
- Pricing: https://www.anthropic.com/pricing
- Docs: https://docs.anthropic.com

**Azure OpenAI:**
- Portal: https://portal.azure.com
- Docs: https://learn.microsoft.com/azure/ai-services/openai/
