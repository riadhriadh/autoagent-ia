# Exemple d'Utilisation - AutoAgent IA

Ce guide montre comment utiliser AutoAgent IA pour créer différents types de projets.

## Exemple 1: Créer une API REST avec Express

### Objectif
Créer une API REST complète avec Express.js, incluant routes, controllers et middleware.

### Méthode 1: Via WhatsApp

1. Connectez-vous à WhatsApp (scannez le QR code au démarrage)

2. Envoyez à l'agent:
```
Créer une API REST avec Express pour gérer des utilisateurs (CRUD complet)
```

3. L'agent va:
   - Analyser la demande
   - Créer la structure du projet
   - Demander approbation pour installer les packages
   - Générer le code (routes, controllers, models)
   - Initialiser Git
   - Vous notifier une fois terminé

4. Vous recevrez sur WhatsApp:
```
🔔 Approbation requise

#1: installNpmPackages
📝 {"packages":["express","cors","dotenv"],"path":"./my-api"}

Répondez avec "approuve 1" ou "refuse 1"
```

5. Répondez:
```
approuve 1
```

6. L'agent continue et vous notifie à la fin:
```
✅ Projet créé avec succès!

Projet: user-api
Fichiers créés: 12
Chemin: ./workspace/user-api
```

### Méthode 2: Via CLI

```bash
# Lancer l'agent avec la demande
npm run dev "Créer une API REST avec Express pour gérer des utilisateurs"

# Ou en mode interactif
npm run dev
# Puis suivre les instructions
```

### Résultat Attendu

Structure créée:
```
workspace/user-api/
├── src/
│   ├── controllers/
│   │   └── userController.ts
│   ├── routes/
│   │   └── users.ts
│   ├── models/
│   │   └── User.ts
│   ├── middlewares/
│   │   └── errorHandler.ts
│   ├── config/
│   │   └── database.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

### Tester l'API

```bash
cd workspace/user-api
npm install
npm run dev

# Dans un autre terminal
curl http://localhost:3000/api/users
```

---

## Exemple 2: Application React avec Vite

### Demande

Via WhatsApp ou CLI:
```
Créer une application React moderne avec Vite, incluant une page d'accueil et un système de routing
```

### Processus

1. **Analyse** (5-10s)
   - Type: web-react
   - Technologies: React, Vite, TypeScript, React Router

2. **Création** (20-30s)
   - Structure de dossiers
   - Configuration Vite
   - Composants de base
   - Routing setup

3. **Notifications**
   - Approbation pour `npm install`
   - Notification de complétion

### Résultat

```
workspace/my-react-app/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── About.tsx
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   │   └── index.css
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

### Lancer l'Application

```bash
cd workspace/my-react-app
npm install
npm run dev
# Ouvrir http://localhost:5173
```

---

## Exemple 3: Script Python d'Automatisation

### Demande

```
Créer un script Python pour analyser des fichiers CSV et générer des rapports en PDF
```

### Résultat

```
workspace/csv-analyzer/
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── analyzer.py
│   ├── pdf_generator.py
│   └── utils/
│       └── helpers.py
├── tests/
│   └── test_analyzer.py
├── data/
│   └── sample.csv
├── requirements.txt
├── README.md
└── .gitignore
```

### Exécuter

```bash
cd workspace/csv-analyzer
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

---

## Exemple 4: Full-Stack Application

### Demande

```
Créer une application full-stack avec un backend Express et un frontend React pour un système de blog
```

### Processus

L'agent va créer un monorepo avec:

1. **Backend** (`server/`)
   - API Express
   - Routes pour articles
   - Controllers
   - Modèles

2. **Frontend** (`client/`)
   - Interface React
   - Pages: Liste articles, Détail, Créer
   - Appels API

3. **Shared** (`shared/`)
   - Types TypeScript partagés
   - Utilitaires communs

### Structure

```
workspace/blog-app/
├── client/         # Frontend React
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── server/         # Backend Express
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared/         # Code partagé
│   └── types/
├── package.json    # Root workspace
└── README.md
```

### Lancer

```bash
# Backend
cd workspace/blog-app/server
npm install
npm run dev

# Frontend (nouveau terminal)
cd workspace/blog-app/client
npm install
npm run dev
```

---

## Exemple 5: Appels API et Intégration

### Demande

```
Créer un script qui récupère les données depuis l'API JSONPlaceholder et les sauvegarde en JSON
```

### Code Généré

```typescript
// src/fetchData.ts
import axios from 'axios';
import fs from 'fs/promises';

async function fetchAndSave() {
  const response = await axios.get('https://jsonplaceholder.typicode.com/users');
  await fs.writeFile('users.json', JSON.stringify(response.data, null, 2));
  console.log('✅ Données sauvegardées dans users.json');
}

fetchAndSave();
```

### Notes

- L'agent demandera approbation pour l'appel API si `REQUIRE_APPROVAL_FOR_API=true`
- Validation: URL, rate limiting, taille de réponse

---

## Gestion des Tâches

### Voir les Tâches en Cours

Via CLI:
```bash
npm run cli list-tasks
```

Via WhatsApp:
```
status
```

### Approuver des Actions

Via CLI:
```bash
# Lister les approbations
npm run cli list-approvals

# Approuver
npm run cli approve 1

# Rejeter
npm run cli reject 2
```

Via WhatsApp:
```
liste
approuve 1
refuse 2
```

### Voir l'Historique

```bash
# Derniers 20 logs
npm run cli logs

# Derniers 50 logs
npm run cli logs -n 50

# Logs d'une tâche spécifique
npm run cli logs -t 3
```

---

## Workflows Avancés

### Workflow 1: Développement par le Itération

```
1. "Créer une API REST basique avec Express"
   → Agent crée la structure de base

2. "Ajouter une authentification JWT"
   → Agent ajoute middleware d'auth

3. "Ajouter des tests unitaires avec Jest"
   → Agent configure Jest et crée des tests

4. "Ajouter Docker pour le déploiement"
   → Agent crée Dockerfile et docker-compose.yml
```

### Workflow 2: Migration de Projet

```
1. "Analyser le projet dans ./old-project"
   → Agent scanne et analyse

2. "Migrer vers TypeScript"
   → Agent renomme .js → .ts, ajoute types

3. "Mettre à jour toutes les dépendances"
   → Agent met à jour package.json

4. "Créer des tests pour les fonctions critiques"
   → Agent génère des tests
```

### Workflow 3: Génération de Documentation

```
"Générer une documentation complète pour le projet dans ./my-api incluant API reference, examples et deployment guide"

→ L'agent crée:
  - README.md détaillé
  - docs/API.md (endpoints, params, responses)
  - docs/EXAMPLES.md (cas d'usage)
  - docs/DEPLOYMENT.md (guide déploiement)
```

---

## Bonnes Pratiques

### 1. Soyez Spécifique

❌ **Mauvais:**
```
Créer une app web
```

✅ **Bon:**
```
Créer une application React avec Vite, incluant:
- Page d'accueil avec header et footer
- Page de contact avec formulaire
- Routing avec React Router
- Styling avec Tailwind CSS
```

### 2. Décomposez les Grandes Tâches

❌ **Mauvais:**
```
Créer une plateforme e-commerce complète
```

✅ **Bon:**
```
Étape 1: Créer l'API backend pour les produits
Étape 2: Ajouter le système de panier
Étape 3: Implémenter le paiement Stripe
```

### 3. Utilisez les Templates

Pour démarrer rapidement:
```
"Créer un projet basé sur le template api-express nommé user-service"
```

### 4. Vérifiez les Résultats

Après chaque tâche:
```bash
cd workspace/mon-projet
npm run dev  # ou npm test
```

### 5. Utilisez Git

L'agent initialise Git automatiquement:
```bash
cd workspace/mon-projet
git log  # Voir l'historique
git status
```

---

## Dépannage

### L'agent ne trouve pas les outils

Vérifiez les permissions dans `config/permissions.json`:
```json
{
  "allowedCommands": ["npm", "git", "node"]
}
```

### Approbation timeout

Timeout par défaut: 5 minutes

Pour approuver rapidement:
```bash
# Ouvrir un terminal
watch -n 1 'npm run cli list-approvals'

# Dès qu'une approbation apparaît
npm run cli approve <id>
```

### Projet non créé

Vérifier:
1. Workspace existe: `ls -la workspace/`
2. Permissions d'écriture
3. Logs: `npm run cli logs`

---

## Résumé des Commandes

### Démarrage
```bash
npm run dev                    # Lancer l'agent
npm run dev "ma demande"       # Avec une demande directe
```

### CLI
```bash
npm run cli status             # Statut général
npm run cli list-tasks         # Lister les tâches
npm run cli list-projects      # Lister les projets
npm run cli list-approvals     # Approbations en attente
npm run cli approve <id>       # Approuver
npm run cli reject <id>        # Rejeter
npm run cli logs              # Voir les logs
npm run cli config            # Voir la config
npm run cli check-model       # Vérifier le LLM
```

### WhatsApp
```
status                         # Statut
liste                          # Approbations
approuve <id>                  # Approuver
refuse <id>                    # Rejeter
stop                           # Arrêter
aide                           # Aide
```

---

## Prochaines Étapes

Maintenant que vous savez utiliser l'agent:

1. **Explorez** les différents types de projets
2. **Personnalisez** les templates dans `src/core/workspace.ts`
3. **Ajoutez** vos propres outils dans `src/tools/`
4. **Partagez** vos use cases!

Pour aller plus loin:
- [Guide de Configuration](CONFIGURATION.md)
- [Architecture](ARCHITECTURE.md)
- [Setup WhatsApp](WHATSAPP_SETUP.md)
