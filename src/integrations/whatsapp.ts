import whatsappWeb, { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { configLoader } from '../core/config-loader.js';
import { db, type Approval } from '../db/database.js';
import { EventEmitter } from 'events';

export class WhatsAppIntegration extends EventEmitter {
  private client: Client | null = null;
  private isReady: boolean = false;
  private adminNumbers: string[];
  private pendingApprovals: Map<number, (approved: boolean) => void> = new Map();

  constructor() {
    super();
    this.adminNumbers = configLoader.env.whatsappAdminNumbers;
  }

  /**
   * Initialise la connexion WhatsApp
   */
  async initialize(): Promise<void> {
    if (!configLoader.env.whatsappEnabled) {
      console.log('ℹ️  WhatsApp désactivé dans la configuration');
      return;
    }

    console.log('📱 Initialisation de WhatsApp...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: configLoader.env.whatsappSessionPath,
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    // Gérer l'événement QR Code
    this.client.on('qr', (qr) => {
      console.log('\n📱 Scannez ce QR code avec WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    });

    // Gérer la connexion réussie
    this.client.on('ready', () => {
      console.log('✅ WhatsApp connecté et prêt!');
      this.isReady = true;
      this.emit('ready');
      
      // Envoyer un message de bienvenue aux admins
      this.sendNotification(
        '🤖 AutoAgent IA est maintenant en ligne et prêt à travailler!',
        'high'
      );
    });

    // Gérer les messages entrants
    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });

    // Gérer les erreurs
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Échec d\'authentification WhatsApp:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp déconnecté:', reason);
      this.isReady = false;
    });

    // Démarrer le client
    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Gère les messages entrants
   */
  private async handleIncomingMessage(message: Message): Promise<void> {
    const contact = await message.getContact();
    const number = contact.number;
    
    // Vérifier si le numéro est autorisé
    if (!this.isAuthorized(number)) {
      await message.reply('❌ Vous n\'êtes pas autorisé à utiliser ce bot.');
      return;
    }

    const text = message.body.trim().toLowerCase();
    const parts = text.split(' ');
    const command = parts[0];

    try {
      switch (command) {
        case 'status':
          await this.handleStatusCommand(message);
          break;
          
        case 'approuve':
        case 'approve':
          if (parts.length < 2) {
            await message.reply('❌ Usage: approuve <id>');
            return;
          }
          await this.handleApprovalCommand(parseInt(parts[1]), true, number, message);
          break;
          
        case 'refuse':
        case 'reject':
          if (parts.length < 2) {
            await message.reply('❌ Usage: refuse <id>');
            return;
          }
          await this.handleApprovalCommand(parseInt(parts[1]), false, number, message);
          break;
          
        case 'liste':
        case 'list':
          await this.handleListCommand(message);
          break;
          
        case 'stop':
          await this.handleStopCommand(message);
          break;
          
        case 'aide':
        case 'help':
          await this.handleHelpCommand(message);
          break;
          
        default:
          await message.reply(
            '❓ Commande inconnue. Envoyez "aide" pour voir les commandes disponibles.'
          );
      }
    } catch (error) {
      console.error('Erreur lors du traitement du message:', error);
      await message.reply(`❌ Erreur: ${error}`);
    }
  }

  /**
   * Commande status
   */
  private async handleStatusCommand(message: Message): Promise<void> {
    const tasks = db.getAllTasks();
    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const pending = tasks.filter((t) => t.status === 'pending');
    const completed = tasks.filter((t) => t.status === 'completed');
    
    const response = `📊 *Statut de l'Agent*\n\n` +
      `✅ Tâches complétées: ${completed.length}\n` +
      `⏳ En cours: ${inProgress.length}\n` +
      `📋 En attente: ${pending.length}\n\n` +
      `💾 Total: ${tasks.length} tâches`;
    
    await message.reply(response);
  }

  /**
   * Commande d'approbation
   */
  private async handleApprovalCommand(
    approvalId: number,
    approved: boolean,
    respondedBy: string,
    message: Message
  ): Promise<void> {
    const approval = db.getApproval(approvalId);
    
    if (!approval) {
      await message.reply(`❌ Approbation #${approvalId} introuvable`);
      return;
    }
    
    if (approval.status !== 'pending') {
      await message.reply(`❌ Cette approbation a déjà été traitée (${approval.status})`);
      return;
    }
    
    // Mettre à jour dans la base de données
    db.updateApproval(approvalId, approved ? 'approved' : 'rejected', respondedBy);
    
    // Notifier le callback si en attente
    const callback = this.pendingApprovals.get(approvalId);
    if (callback) {
      callback(approved);
      this.pendingApprovals.delete(approvalId);
    }
    
    const status = approved ? '✅ approuvée' : '❌ rejetée';
    await message.reply(`Action #${approvalId} ${status}`);
  }

  /**
   * Commande liste
   */
  private async handleListCommand(message: Message): Promise<void> {
    const approvals = db.getPendingApprovals();
    
    if (approvals.length === 0) {
      await message.reply('✅ Aucune approbation en attente');
      return;
    }
    
    let response = `📋 *Approbations en attente* (${approvals.length}):\n\n`;
    
    approvals.forEach((approval) => {
      response += `#${approval.id}: ${approval.action}\n`;
      response += `📝 ${approval.description}\n`;
      response += `⏰ ${new Date(approval.requestedAt!).toLocaleString()}\n\n`;
    });
    
    response += '\n💡 Répondez avec "approuve <id>" ou "refuse <id>"';
    
    await message.reply(response);
  }

  /**
   * Commande stop
   */
  private async handleStopCommand(message: Message): Promise<void> {
    this.emit('stop');
    await message.reply('⏹️  Arrêt de la tâche en cours demandé...');
  }

  /**
   * Commande aide
   */
  private async handleHelpCommand(message: Message): Promise<void> {
    const help = `🤖 *Commandes AutoAgent IA*\n\n` +
      `📊 *status* - Voir le statut de l'agent\n` +
      `📋 *liste* - Voir les approbations en attente\n` +
      `✅ *approuve <id>* - Approuver une action\n` +
      `❌ *refuse <id>* - Refuser une action\n` +
      `⏹️  *stop* - Arrêter la tâche en cours\n` +
      `❓ *aide* - Afficher cette aide`;
    
    await message.reply(help);
  }

  /**
   * Vérifie si un numéro est autorisé
   */
  private isAuthorized(number: string): boolean {
    return this.adminNumbers.some((adminNumber) => 
      adminNumber.replace(/\D/g, '') === number.replace(/\D/g, '')
    );
  }

  /**
   * Envoie une notification à tous les admins
   */
  async sendNotification(
    messageText: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    if (!this.isReady || !this.client) {
      console.log(`📱 [WhatsApp non disponible] ${messageText}`);
      return;
    }

    const priorityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
    }[priority];

    const formattedMessage = `${priorityEmoji} ${messageText}`;

    for (const number of this.adminNumbers) {
      try {
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        await this.client.sendMessage(chatId, formattedMessage);
      } catch (error) {
        console.error(`Erreur lors de l'envoi à ${number}:`, error);
      }
    }
  }

  /**
   * Demande une approbation et attend la réponse
   */
  async requestApproval(approval: Approval): Promise<boolean> {
    const message = `🔔 *Approbation requise*\n\n` +
      `#${approval.id}: ${approval.action}\n` +
      `📝 ${approval.description}\n\n` +
      `Répondez avec "approuve ${approval.id}" ou "refuse ${approval.id}"`;

    await this.sendNotification(message, 'high');

    // Attendre la réponse (ou timeout après 5 minutes)
    return new Promise((resolve) => {
      this.pendingApprovals.set(approval.id!, resolve);

      // Timeout de 5 minutes
      setTimeout(() => {
        if (this.pendingApprovals.has(approval.id!)) {
          this.pendingApprovals.delete(approval.id!);
          console.log(`⏱️  Timeout pour l'approbation #${approval.id}`);
          resolve(false);
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Arrête le client WhatsApp
   */
  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      console.log('📱 WhatsApp déconnecté');
    }
  }
}

// Instance singleton
export const whatsapp = new WhatsAppIntegration();
export default whatsapp;
