# Architecture AutoAgent IA

Ce document décrit l'architecture technique de l'agent IA autonome.

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    Interface Utilisateur                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  WhatsApp    │  │     CLI      │  │   Terminal   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────┐
│                   Agent Orchestrator                      │
│              (Autonomous Agent - ReAct Loop)              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. THINK  →  2. ACT  →  3. OBSERVE  →  4. REFLECT│  │
│  └────────────────────────────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────▼────────────────────────────┐ │
│  │            Task Analysis & Planning                  │ │
│  │  - Décomposition en étapes                          │ │
│  │  - Détection de criticité                           │ │
│  │  - Gestion des dépendances                          │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼─────────┐
│  LLM Wrapper   │  │  Security Mgr   │  │  Workspace Mgr │
│  (Ollama)      │  │  (Permissions)  │  │  (Projects)    │
│                │  │                 │  │                │
│  - Phi-3 mini  │  │  - Validation   │  │  - Templates   │
│  - Cache       │  │  - Approbations │  │  - Git init    │
│  - JSON parse  │  │  - Audit        │  │  - Structure   │
└────────────────┘  └─────────────────┘  └────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│   Tools Layer  │  │   Database     │  │  Integrations  │
└────────────────┘  └────────────────┘  └────────────────┘
        │                   │                    │
┌───────▼────────────────────────────────────────▼────────┐
│                    Storage & External                    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │Workspace │  │ SQLite DB│  │  Logs    │  │WhatsApp ││
│  │  Files   │  │  Tasks   │  │  Audit   │  │  API    ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
└──────────────────────────────────────────────────────────┘
```

## Composants Principaux

### 1. Agent Orchestrator (`src/core/agent.ts`)

Le cerveau de l'agent - implémente la boucle ReAct:

```typescript
while (iteration < maxIterations) {
  // 1. THINK: Analyser la situation
  thought = await analyzeCurrentState()
  
  // 2. ACT: Choisir et exécuter une action
  action = await selectAction(thought)
  result = await executeAction(action)
  
  // 3. OBSERVE: Observer le résultat
  observation = processResult(result)
  
  // 4. REFLECT: Évaluer et ajuster
  if (taskCompleted) break
  if (errorOccurred) handleError()
}
```

**Responsabilités:**
- Analyse des demandes utilisateur
- Planification des tâches
- Exécution des actions via les tools
- Gestion des erreurs et récupération
- Demande d'approbations si nécessaire

### 2. LLM Wrapper (`src/core/llm.ts`)

Interface avec Ollama pour le modèle local:

**Features:**
- ✅ Connexion à Ollama
- ✅ Cache des réponses (économie de ressources)
- ✅ Parsing JSON automatique
- ✅ Gestion des erreurs
- ✅ Support chat et génération simple

**Configuration:**
```typescript
{
  model: "phi3:mini",      // ~2GB RAM
  temperature: 0.7,        // Créativité
  maxTokens: 2048,         // Longueur max
  cache: true              // Cache activé
}
```

### 3. Security Manager (`src/core/security.ts`)

Contrôle toutes les opérations sensibles:

**Validations:**
- ✅ Chemins de fichiers (whitelist)
- ✅ Extensions autorisées
- ✅ Taille des fichiers
- ✅ Commandes système (whitelist)
- ✅ Appels API
- ✅ Actions de suppression

**Flux d'approbation:**
```typescript
validateAction() 
  → allowed: false → rejection
  → allowed: true, approval: false → execute
  → allowed: true, approval: true → request_approval
        → approved → execute
        → rejected → cancel
```

### 4. Tools Layer (`src/tools/`)

Outils disponibles pour l'agent:

#### Filesystem (`filesystem.ts`)
- `readFile()` - Lire un fichier
- `writeFile()` - Écrire dans un fichier
- `deleteFile()` - Supprimer (avec approbation)
- `createDirectory()` - Créer un répertoire
- `listDirectory()` - Lister le contenu
- `getFileInfo()` - Info sur un fichier

#### Git (`git.ts`)
- `gitInit()` - Initialiser un dépôt
- `gitCommit()` - Faire un commit
- `gitStatus()` - Statut Git
- `gitCreateBranch()` - Créer une branche
- `gitLog()` - Historique
- `gitPush()` - Push (avec approbation)

#### API (`api.ts`)
- `makeApiCall()` - Appels HTTP/REST
- `downloadFile()` - Télécharger un fichier
- `checkUrl()` - Vérifier accessibilité

#### Terminal (`terminal.ts`)
- `executeCommand()` - Exécuter une commande
- `installNpmPackages()` - Installer des packages
- `runNpmScript()` - Lancer un script npm
- `npmInit()` - Initialiser package.json

#### Analysis (`analysis.ts`)
- `detectLanguage()` - Détecter le langage
- `analyzeDependencies()` - Parser les imports
- `suggestProjectStructure()` - Suggérer une structure
- `analyzeCodeQuality()` - Analyser la qualité

### 5. Database (`src/db/database.ts`)

SQLite pour la persistance:

**Tables:**
- **tasks** - Tâches de l'agent
- **projects** - Projets créés
- **action_logs** - Audit de toutes les actions
- **approvals** - File d'attente des approbations 
- **memory** - Mémoire long-terme de l'agent

**Schéma Tasks:**
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,  -- pending, in_progress, completed, failed
  priority TEXT, -- low, medium, high
  created_at TEXT,
  updated_at TEXT,
  metadata TEXT  -- JSON with analysis
)
```

### 6. Workspace Manager (`src/core/workspace.ts`)

Gestion des projets:

**Fonctionnalités:**
- ✅ Création de projets isolés
- ✅ Templates pré-définis (React, Express, etc.)
- ✅ Initialisation Git automatique
- ✅ Structure de dossiers
- ✅ Fichiers de configuration

**Templates disponibles:**
- `web-react` - Application React + Vite
- `api-express` - API Express.js
- `python-app` - Application Python
- `fullstack` - Monorepo Frontend + Backend

### 7. WhatsApp Integration (`src/integrations/whatsapp.ts`)

Interface de contrôle via WhatsApp:

**Events:**
- `ready` - Connexion établie
- `message` - Message reçu
- `stop` - Arrêt demandé

**Méthodes:**
- `sendNotification()` - Envoyer une notification
- `requestApproval()` - Demander une approbation
- `handleIncomingMessage()` - Router les commandes

## Flux d'Exécution

### Scénario: "Créer une API REST avec Express"

```
1. USER → WhatsApp ou CLI: "Créer une API REST avec Express"
   │
2. Agent.analyzeTask()
   └→ LLM: Parse la demande
      └→ TaskAnalysis {
           objective: "Créer une API REST",
           projectType: "api-express",
           steps: [...]
         }
   │
3. Agent.executeTask()
   │
4. WorkspaceManager.createProject("my-api", "api-express")
   ├→ createDirectory("workspace/my-api")
   ├→ gitInit("workspace/my-api")
   └→ applyTemplate(expressTemplate)
      ├→ createDirectory("src/routes")
      ├→ createDirectory("src/controllers")
      ├→ writeFile("package.json", ...)
      ├→ writeFile("src/index.ts", ...)
      └→ ...
   │
5. Loop ReAct:
   │
   ├─ Iteration 1:
   │  ├─ THINK: "Je dois installer les dépendances"
   │  ├─ ACT: installNpmPackages(["express", "cors"])
   │  │  └→ SecurityManager.validatePackageInstall()
   │  │     └→ requiresApproval? → WhatsApp.requestApproval()
   │  │        └→ User approves
   │  │           └→ executeCommand("npm install express cors")
   │  ├─ OBSERVE: "Packages installés avec succès"
   │  └─ REFLECT: "Continuer"
   │
   ├─ Iteration 2:
   │  ├─ THINK: "Je dois créer les routes"
   │  ├─ ACT: writeFile("src/routes/users.ts", code)
   │  ├─ OBSERVE: "Fichier créé"
   │  └─ REFLECT: "Continuer"
   │
   └─ Iteration N:
      ├─ THINK: "Toutes les étapes sont complètes"
      └─ completed: true
   │
6. Agent: Faire un commit Git
   └→ gitCommit("Initial commit: Express API setup")
   │
7. Agent → WhatsApp: "✅ Projet créé avec succès!"
   │
8. Database: tasks.status = "completed"
```

## Patterns Utilisés

### 1. ReAct (Reasoning + Acting)

Inspire les LLMs à raisonner avant d'agir:

```
THOUGHT: "Je dois créer le fichier index.ts"
ACTION: writeFile("index.ts", content)
OBSERVATION: "Fichier créé avec succès: 245 bytes"
REFLECTION: "Continuer avec package.json"
```

### 2. Tool Use Pattern

L'agent n'exécute rien directement - tout passe par des tools:

```typescript
interface Tool {
  name: string;
  execute: (params) => ToolResult;
  validate: (params) => SecurityValidation;
}
```

### 3. Approval Queue Pattern

Actions critiques → queue → attente approbation:

```typescript
if (requiresApproval) {
  approvalId = createApproval(action)
  notify via WhatsApp
  await userResponse
  if (approved) execute()
  else cancel()
}
```

### 4. Singleton Pattern

Un seul instance de chaque service:

```typescript
export const llm = new LLMWrapper();
export const db = new DatabaseManager();
export const whatsapp = new WhatsAppIntegration();
```

## Sécurité

### Défense en Profondeur

1. **Validation des entrées**
   - Tous les paramètres sont validés
   - Types checkés avec TypeScript
   - Sanitisation des chemins

2. **Sandboxing**
   - L'agent ne peut sortir du workspace
   - Whitelist de commandes
   - Blacklist de commandes dangereuses

3. **Approbations**
   - Actions critiques nécessitent approbation
   - Timeout de 5 minutes
   - Audit de qui approuve

4. **Audit Logging**
   - Toutes les actions sont loguées
   - Timestamp + paramètres + résultat
   - Non modifiable (append-only)

5. **Rate Limiting**
   - API calls limitées (60/min, 1000/h)
   - Protection contre abus

## Performance

### Optimisations

1. **Cache LLM**
   - Réponses identiques → cache hit
   - Économie de ~2s et de tokens

2. **Lazy Loading**
   - WhatsApp chargé seulement si activé
   - Tools chargés à la demande

3. **Connection Pooling**
   - Réutilisation connexion Ollama
   - Connection DB unique

4. **Memory Management**
   - Truncate de l'historique conversation
   - Garbage collection explicite
   - Limitation tokens

### Métriques

- **Latence LLM:** ~1-3s (Phi-3 mini sur CPU)
- **RAM utilisée:** ~3-4GB (2GB modèle + 1-2GB runtime)
- **Taille DB:** ~1MB par 100 tâches
- **Cache hit rate:** ~30-40% en usage normal

## Extensibilité

### Ajouter un Nouveau Tool

```typescript
// 1. Créer le tool dans src/tools/
export async function myNewTool(param: string): Promise<ToolResult> {
  // Validation
  const validation = securityManager.validateX(param);
  if (!validation.allowed) {
    return { success: false, error: validation.reason };
  }
  
  // Exécution
  const result = await doSomething(param);
  
  return { success: true, data: result };
}

// 2. Enregistrer dans agent.ts
case 'myNewTool':
  result = await myNewTool(parameters.param);
  break;

// 3. Documenter dans prompts.ts
// Ajouter à la liste des outils disponibles
```

### Ajouter un Nouveau Template

```typescript
// Dans workspace.ts
const templates: Record<string, ProjectTemplate> = {
  'my-template': {
    name: 'My Template',
    description: '...',
    structure: { ... },
    files: { ... },
  },
};
```

### Intégrer une Nouvelle Messagerie

```typescript
// src/integrations/telegram.ts
export class TelegramIntegration extends EventEmitter {
  async initialize() { ... }
  async sendNotification() { ... }
  async requestApproval() { ... }
}
```

## Diagrammes

### Diagramme de Séquence - Approbation

```
User    WhatsApp    Agent    Security    DB    Tool
 │          │         │         │        │      │
 │          │    1. ACT││        │        │      │
 │          │        ─┤│        │        │      │
 │          │         │└──2. validate──→ │      │
 │          │         │         │←──approval──  │
 │          │         │──3. create──────→│      │
 │          │←─4. notify─│      │        │      │
 │←──5. msg──│         │        │        │      │
 │──6. approve→        │        │        │      │
 │          │──7. update────────────────→│      │
 │          │         │        │         │      │
 │          │         │──8. execute──────────→ │
 │          │         │←──9. result──────────┘ │
 │          │←10. notif─│        │        │      │
```

## Points d'Extension Futurs

1. **Multi-Agent System**
   - Agent principal délègue à des sous-agents spécialisés
   - Agent "Frontend", "Backend", "DevOps"

2. **RAG (Retrieval Augmented Generation)**
   - Indexation de la documentation
   - Recherche sémantique dans le code existant

3. **Code Execution Sandbox**
   - Docker containers par projet
   - Isolat ion complète

4. **Web UI**
   - Dashboard pour visualiser les tâches
   - Approbations via interface web
   - Visualisation en temps réel

5. **Plugin System**
   - Tools tiers chargeables dynamiquement
   - Marketplace de plugins

## Conclusion

L'architecture est conçue pour être:
- **Modulaire:** Composants indépendants
- **Sécurisé:** Validation à chaque niveau
- **Extensible:** Facile d'ajouter des fonctionnalités
- **Robuste:** Gestion d'erreurs et récupération
- **Léger:** Optimisé pour 8GB RAM
