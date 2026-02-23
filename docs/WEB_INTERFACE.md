# 🌐 Interface Web - AutoAgent IA

Interface web pour gérer et communiquer avec l'agent IA via votre navigateur.

## 🎯 Fonctionnalités

- ✅ **Authentification sécurisée** - Login/mot de passe configurables
- ✅ **Dashboard en temps réel** - Statistiques et monitoring
- ✅ **Création de tâches** - Interface intuitive pour soumettre des tâches
- ✅ **Suivi des tâches** - Voir l'état de toutes vos tâches
- ✅ **Gestion des approbations** - Approuver/refuser les actions critiques
- ✅ **Auto-refresh** - Mise à jour automatique toutes les 10 secondes

## 🚀 Démarrage Rapide

### 1. Configuration

Éditez le fichier `.env` :

```env
# Interface Web
WEB_ENABLED=true
WEB_PORT=3000
WEB_USERNAME=admin
WEB_PASSWORD=VotreMotDePasseSecurise123
WEB_SESSION_SECRET=votre-secret-session-min-32-caracteres
WEB_CORS_ORIGIN=*
```

**⚠️ IMPORTANT: Sécurité**
- Changez `WEB_USERNAME` et `WEB_PASSWORD` par défaut
- Utilisez un `WEB_SESSION_SECRET` aléatoire et long (min 32 caractères)
- En production, remplacez `WEB_CORS_ORIGIN=*` par votre domaine

### 2. Installation des dépendances

```bash
npm install
```

### 3. Lancer le serveur web

```bash
# Lancer uniquement l'interface web
npm run web

# Ou lancer l'agent complet (avec WhatsApp + Web)
npm run dev
```

### 4. Accéder à l'interface

Ouvrez votre navigateur :

```
http://localhost:3000
```

Connectez-vous avec les identifiants configurés dans `.env`

## 📱 Utilisation

### Dashboard Principal

Le dashboard affiche :

1. **Statistiques** (4 cartes)
   - Nombre total de tâches
   - Tâches en cours
   - Tâches complétées
   - Provider LLM actuel

2. **Trois onglets principaux**

#### 🆕 Nouvelle Tâche

Créez une nouvelle tâche pour l'agent :

1. **Titre** : Nom court de la tâche
2. **Description** : Instructions détaillées pour l'agent
3. **Priorité** : Basse, Normale, Haute, Urgente

**Exemple:**

```
Titre: Créer une API REST pour gestion d'utilisateurs
Description: 
Créer une API Express.js avec les endpoints suivants:
- POST /users (créer utilisateur)
- GET /users (lister tous)
- GET /users/:id (détails)
- PUT /users/:id (modifier)
- DELETE /users/:id (supprimer)

Utilise TypeScript, validation avec Zod, et documentation Swagger.
Priorité: Haute
```

#### 📋 Mes Tâches

Visualisez toutes vos tâches avec leur statut :

- 🟡 **Pending** : En attente
- 🔵 **In Progress** : En cours d'exécution
- 🟢 **Completed** : Terminée avec succès
- 🔴 **Failed** : Échouée

#### ✅ Approbations

Gérez les actions nécessitant une approbation :

- Installation de packages npm
- Exécution de commandes système
- Suppression de fichiers
- Push Git vers remote

Action disponibles :
- **Approuver** ✅ : Permettre l'action
- **Refuser** ❌ : Bloquer l'action

## 🔒 Sécurité

### Bonnes Pratiques

#### 1. **Credentials Forts**

```env
# ❌ Mauvais
WEB_USERNAME=admin
WEB_PASSWORD=admin123

# ✅ Bon
WEB_USERNAME=votre_nom_utilisateur
WEB_PASSWORD=M0tDePa$$eC0mpl3x3!2024
```

#### 2. **Secret de Session Sécurisé**

Générer un secret aléatoire :

```bash
# Linux/Mac
openssl rand -base64 32

# Ou avec Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Exemple résultat :
```env
WEB_SESSION_SECRET=Kx9mP2nQ5rT8wA1zC3vB6nM9pL5qW2eR4tY7uI0oP3a=
```

#### 3. **HTTPS en Production**

En production, utilisez HTTPS avec un reverse proxy (Nginx, Caddy) :

**Nginx:**
```nginx
server {
    listen 443 ssl;
    server_name votre-domaine.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. **CORS Restreint**

En production, limitez l'accès :

```env
# Développement
WEB_CORS_ORIGIN=*

# Production
WEB_CORS_ORIGIN=https://votre-domaine.com
```

#### 5. **Firewall**

Si l'interface web est publique, sécurisez avec un firewall :

```bash
# Autoriser uniquement votre IP
sudo ufw allow from VOTRE_IP to any port 3000

# Ou limiter le taux de connexions
sudo ufw limit 3000/tcp
```

### Hash du Mot de Passe (Avancé)

Pour plus de sécurité, vous pouvez hasher le mot de passe :

```javascript
// scripts/hash-password.js
import bcrypt from 'bcrypt';

const password = 'VotreMotDePasse';
const hash = await bcrypt.hash(password, 10);
console.log('Hash:', hash);
```

Puis dans `.env` :
```env
WEB_PASSWORD_HASH=$2b$10$...
```

Et modifier `web-server.ts` pour comparer avec `bcrypt.compare()`.

## 🔌 API Endpoints

L'interface web expose une API REST :

### Authentification

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

```http
POST /api/auth/logout
```

```http
GET /api/auth/check
```

### Statut

```http
GET /api/status
```

Retourne :
```json
{
  "tasks": {
    "total": 10,
    "pending": 2,
    "inProgress": 1,
    "completed": 6,
    "failed": 1
  },
  "projects": { "total": 3 },
  "llm": {
    "provider": "openai",
    "model": "gpt-4-turbo-preview"
  },
  "uptime": 3600
}
```

### Tâches

```http
GET /api/tasks
GET /api/tasks?status=pending
GET /api/tasks/:id
```

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Créer une API",
  "description": "Instructions détaillées...",
  "priority": "high"
}
```

### Approbations

```http
GET /api/approvals
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
```

### Projets

```http
GET /api/projects
```

### Logs

```http
GET /api/logs?limit=100
```

## 🎨 Personnalisation

### Modifier l'Interface

Les fichiers HTML sont dans `public/` :

- `public/login.html` - Page de connexion
- `public/dashboard.html` - Dashboard principal

Vous pouvez modifier les styles CSS directement dans les fichiers.

### Ajouter des Routes

Dans `src/web-server.ts` :

```typescript
// Nouvelle route personnalisée
this.app.get('/api/custom', this.requireAuth.bind(this), (req, res) => {
  res.json({ message: 'Ma route personnalisée' });
});
```

## 🐛 Troubleshooting

### Port déjà utilisé

**Erreur:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Changer le port dans .env
WEB_PORT=3001

# Ou tuer le processus utilisant le port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Session expirée rapidement

Augmenter la durée de session dans `src/web-server.ts` :

```typescript
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours au lieu de 24h
}
```

### CORS bloqué

Si vous accédez depuis un autre domaine :

```env
WEB_CORS_ORIGIN=https://autre-domaine.com
```

### Interface ne charge pas

1. Vérifier que le dossier `public/` existe
2. Vérifier les logs de l'agent
3. Tester l'API directement :
   ```bash
   curl http://localhost:3000/api/status
   ```

## 🚀 Déploiement en Production

### 1. Variables d'environnement

```env
NODE_ENV=production
WEB_PORT=3000
WEB_USERNAME=admin_production
WEB_PASSWORD=MotDePasseTresSecurise2024!
WEB_SESSION_SECRET=secret-64-caracteres-minimum-genere-aleatoirement-xyz
WEB_CORS_ORIGIN=https://votre-domaine.com
```

### 2. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Process Manager (PM2)

```bash
# Installer PM2
npm install -g pm2

# Lancer l'application
pm2 start npm --name "autoagent-web" -- run web

# Auto-démarrage
pm2 startup
pm2 save
```

### 4. Monitoring

```bash
# Voir les logs
pm2 logs autoagent-web

# Statut
pm2 status

# Redémarrer
pm2 restart autoagent-web
```

## 📊 Comparaison WhatsApp vs Web

| Critère | WhatsApp | Interface Web |
|---------|----------|---------------|
| **Accessibilité** | Mobile uniquement | Ordinateur + Mobile |
| **Notifications** | Temps réel | Rafraîchissement 10s |
| **Approbations** | Via message | Boutons visuels |
| **Création tâches** | Texte libre | Formulaire structuré |
| **Visualisation** | Texte uniquement | Dashboard graphique |
| **Logs** | Non | Oui |
| **Multi-utilisateurs** | Non (1 admin) | Possible (à implémenter) |

## 💡 Conseils

1. **Utilisez les deux** : WhatsApp pour les notifications mobiles, Web pour la gestion desktop
2. **Sécurisez** : Changez les credentials par défaut dès le premier lancement
3. **HTTPS** : Obligatoire en production
4. **Monitoring** : Surveillez les logs pour détecter les tentatives d'accès non autorisées
5. **Backup** : Sauvegardez régulièrement la base de données SQLite

## 🔗 Ressources

- [Express.js Documentation](https://expressjs.com/)
- [Express Session](https://github.com/expressjs/session)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [Let's Encrypt (SSL gratuit)](https://letsencrypt.org/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
