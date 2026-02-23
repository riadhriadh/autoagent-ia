# Configuration WhatsApp pour AutoAgent IA

Ce guide vous aide à configurer WhatsApp pour recevoir des notifications et contrôler votre agent.

## Prérequis

- Un compte WhatsApp (personnel ou business)
- Un téléphone avec WhatsApp installé
- Node.js installé sur votre machine

## Option 1: WhatsApp Web.js (Recommandé pour débuter)

Cette méthode utilise WhatsApp Web et ne nécessite pas de compte Business.

### Installation

Déjà inclus dans le projet! Aucune installation supplémentaire.

### Configuration

1. **Activer WhatsApp dans `.env`:**

```env
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./whatsapp-session
WHATSAPP_ADMIN_NUMBERS=+33612345678
```

2. **Configurer les numéros autorisés:**

Format international obligatoire:
```env
WHATSAPP_ADMIN_NUMBERS=+33612345678,+33687654321
```

- France: +33...
- Belgique: +32...
- Suisse: +41...

3. **Lancer l'agent:**

```bash
npm run dev
```

4. **Scanner le QR Code:**

Un QR code s'affichera dans le terminal. Scannez-le avec WhatsApp:

- Ouvrez WhatsApp sur votre téléphone
- Menu → Appareils connectés
- Connecter un appareil
- Scannez le QR code affiché

5. **Confirmation:**

Une fois connecté, vous recevrez un message:
```
🤖 AutoAgent IA est maintenant en ligne et prêt à travailler!
```

### Persistence de la Session

La session est sauvegardée dans `./whatsapp-session/`. Vous ne devrez scanner le QR code qu'une seule fois.

## Option 2: WhatsApp Business Cloud API (Production)

Pour une solution plus robuste et officielle.

### Inscription

1. Créez un compte Meta for Developers: https://developers.facebook.com/
2. Créez une application Business
3. Ajoutez le produit WhatsApp
4. Configurez un numéro de téléphone

### Configuration

1. **Obtenir les credentials:**
- Phone Number ID
- WhatsApp Business Account ID
- Access Token

2. **Modifier le code:**

Créez un nouveau fichier `src/integrations/whatsapp-cloud.ts` (à développer) ou utilisez une bibliothèque comme `heyoo`:

```bash
npm install heyoo
```

3. **Configuration dans `.env`:**

```env
WHATSAPP_API_TYPE=cloud
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### Avantages Cloud API

- ✅ Officiel et supporté par Meta
- ✅ Plus stable
- ✅ Meilleure scalabilité
- ✅ Webhooks pour messages entrants
- ❌ Configuration plus complexe
- ❌ Nécessite un compte Business

## Commandes WhatsApp

Une fois connecté, envoyez ces commandes à l'agent:

### `status`
Affiche le statut de l'agent et des tâches en cours.

**Exemple:**
```
status
```

**Réponse:**
```
📊 Statut de l'Agent

✅ Tâches complétées: 5
⏳ En cours: 1
📋 En attente: 2

💾 Total: 8 tâches
```

### `liste` ou `list`
Liste les approbations en attente.

**Exemple:**
```
liste
```

**Réponse:**
```
📋 Approbations en attente (2):

#1: deleteFile
📝 {"path":"./old-file.js"}
⏰ 23/02/2026 à 14:30

#2: executeCommand
📝 {"command":"npm install axios"}
⏰ 23/02/2026 à 14:32

💡 Répondez avec "approuve <id>" ou "refuse <id>"
```

### `approuve <id>` ou `approve <id>`
Approuve une action en attente.

**Exemple:**
```
approuve 1
```

**Réponse:**
```
Action #1 ✅ approuvée
```

### `refuse <id>` ou `reject <id>`
Refuse une action en attente.

**Exemple:**
```
refuse 2
```

**Réponse:**
```
Action #2 ❌ rejetée
```

### `stop`
Arrête la tâche en cours.

**Exemple:**
```
stop
```

**Réponse:**
```
⏹️ Arrêt de la tâche en cours demandé...
```

### `aide` ou `help`
Affiche l'aide.

**Exemple:**
```
aide
```

## Notifications Automatiques

L'agent envoie automatiquement des notifications pour:

### 1. Démarrage
```
🤖 AutoAgent IA est maintenant en ligne et prêt à travailler!
```

### 2. Approbations Requises
```
🔔 Approbation requise

#3: installNpmPackages
📝 {"packages":["express","cors"],"path":"./my-api"}

Répondez avec "approuve 3" ou "refuse 3"
```

### 3. Tâches Terminées
```
✅ Tâche #5 terminée avec succès!

Projet: my-react-app
Fichiers créés: 12
```

### 4. Erreurs
```
🚨 Erreur lors de l'exécution

Tâche: #7
Erreur: Module 'axios' not found
```

## Configuration Avancée

### Personnaliser les Messages

Modifiez `src/integrations/whatsapp.ts`:

```typescript
// Changer le message de bienvenue
this.sendNotification(
  '👋 Votre message personnalisé!',
  'high'
);
```

### Ajouter des Commandes

Ajoutez dans `handleIncomingMessage()`:

```typescript
case 'stats':
  await this.handleStatsCommand(message);
  break;
```

### Filtrage par Numéro

Seuls les numéros dans `WHATSAPP_ADMIN_NUMBERS` peuvent contrôler l'agent.

Pour autoriser plusieurs utilisateurs:

```env
WHATSAPP_ADMIN_NUMBERS=+33612345678,+33687654321,+33611223344
```

### Groupes WhatsApp

Pour utiliser dans un groupe:

1. Créez un groupe WhatsApp
2. Ajoutez votre numéro (connecté à l'agent)
3. L'agent répondra dans le groupe

**Attention:** Tous les membres verront les messages!

## Dépannage

### QR Code n'apparaît pas

1. Vérifiez `WHATSAPP_ENABLED=true` dans `.env`
2. Supprimez `./whatsapp-session/` et relancez
3. Vérifiez les logs pour des erreurs

### Session expirée

```bash
rm -rf ./whatsapp-session
npm run dev
# Scanner à nouveau le QR code
```

### Messages non reçus

1. Vérifiez que votre numéro est dans `WHATSAPP_ADMIN_NUMBERS`
2. Format international: `+33...` pas `0033...` ni `33...`
3. Vérifiez la connexion WhatsApp: envoyez `status`

### "Vous n'êtes pas autorisé"

Votre numéro n'est pas dans la liste des admins. Ajoutez-le:

```env
WHATSAPP_ADMIN_NUMBERS=+33612345678,+VOTRE_NUMERO
```

### Agent ne répond pas

1. Vérifiez que l'agent est démarré: `npm run dev`
2. Vérifiez les logs dans le terminal
3. Essayez `npm run cli status` pour voir l'état

## Sécurité

### Bonnes Pratiques

1. **Limitez les admins:** Seuls les numéros de confiance
2. **Activez les approbations:** Pour les actions critiques
3. **Surveillez les logs:** Vérifiez régulièrement `logs/agent.log`
4. **Sauvegardez la session:** `./whatsapp-session/` contient vos credentials

### Risques

- ⚠️ WhatsApp Web.js utilise une méthode non officielle
- ⚠️ Risque de ban si utilisé de manière abusive
- ⚠️ Ne partagez jamais vos QR codes ou sessions

### Recommandations

- ✅ Utilisez un numéro dédié (pas votre personnel)
- ✅ Pour production: utilisez Cloud API
- ✅ Activez l'authentification à deux facteurs sur WhatsApp

## Alternatives

Si WhatsApp ne convient pas:

### Telegram
- API officielle et gratuite
- Bots faciles à créer
- Bibliothèque: `node-telegram-bot-api`

### Discord
- Webhooks simples
- Parfait pour les équipes
- Bibliothèque: `discord.js`

### Slack
- Idéal pour les entreprises
- Webhooks et bots
- Bibliothèque: `@slack/bolt`

### Email
- Simple et universel
- Utiliser `nodemailer`
- Moins interactif

## Support

Pour plus d'aide:

1. Consultez les logs: `logs/agent.log`
2. Vérifiez la configuration: `npm run cli config`
3. Testez sans WhatsApp: `WHATSAPP_ENABLED=false npm run dev`

## Exemple Complet

```env
# .env
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./whatsapp-session
WHATSAPP_ADMIN_NUMBERS=+33612345678

REQUIRE_APPROVAL_FOR_DELETE=true
REQUIRE_APPROVAL_FOR_EXEC=true
```

```bash
# 1. Installation
npm install

# 2. Configuration
cp .env.example .env
# Éditez .env avec votre numéro

# 3. Lancement
npm run dev

# 4. Scanner le QR code avec WhatsApp

# 5. Tester
# Envoyez "status" à l'agent sur WhatsApp
```

Vous devriez recevoir une réponse avec le statut!
