import { AutonomousAgent } from './core/agent.js';
import { whatsapp } from './integrations/whatsapp.js';
import { llm } from './core/llm.js';
import { configLoader } from './core/config-loader.js';
import { db } from './db/database.js';
import type { Approval } from './db/database.js';

console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║      🤖 AutoAgent IA - Agent IA Autonome Local       ║
║                                                       ║
║      Version 1.0.0                                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);

async function main() {
  try {
    // Vérifier que le modèle LLM est disponible
    console.log('🔍 Vérification du modèle LLM...');
    const modelAvailable = await llm.isModelAvailable();
    
    if (!modelAvailable) {
      console.error(`\n❌ Le modèle ${configLoader.env.ollamaModel} n'est pas disponible!`);
      console.log('\nModèles disponibles:');
      const models = await llm.listModels();
      models.forEach((model) => console.log(`  - ${model}`));
      console.log(`\n💡 Téléchargez le modèle avec: ollama pull ${configLoader.env.ollamaModel}`);
      process.exit(1);
    }
    
    console.log(`✅ Modèle LLM prêt: ${configLoader.env.ollamaModel}\n`);

    // Initialiser WhatsApp si activé
    if (configLoader.env.whatsappEnabled) {
      console.log('📱 Initialisation de WhatsApp...');
      await whatsapp.initialize();
      
      // Attendre que WhatsApp soit prêt
      await new Promise<void>((resolve) => {
        if (whatsapp['isReady']) {
          resolve();
        } else {
          whatsapp.once('ready', () => resolve());
        }
      });
    } else {
      console.log('ℹ️  WhatsApp désactivé\n');
    }

    // Créer l'agent avec callback pour les approbations
    const handleApproval = async (approval: Approval): Promise<boolean> => {
      if (configLoader.env.whatsappEnabled) {
        // Demander via WhatsApp
        return await whatsapp.requestApproval(approval);
      } else {
        // En mode CLI, demander confirmation dans la console
        console.log(`\n⚠️  Approbation requise:`);
        console.log(`Action: ${approval.action}`);
        console.log(`Description: ${approval.description}`);
        console.log('\nUtilisez le CLI pour approuver ou rejeter:');
        console.log(`  npm run cli approve ${approval.id}`);
        console.log(`  npm run cli reject ${approval.id}`);
        
        // Attendre l'approbation dans la DB
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const updated = db.getApproval(approval.id!);
            if (updated && updated.status !== 'pending') {
              clearInterval(checkInterval);
              resolve(updated.status === 'approved');
            }
          }, 1000);
          
          // Timeout après 5 minutes
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(false);
          }, 5 * 60 * 1000);
        });
      }
    };

    const agent = new AutonomousAgent(handleApproval);

    // Gestion du stop via WhatsApp
    whatsapp.on('stop', () => {
      console.log('\n⏹️  Arrêt demandé via WhatsApp');
      process.exit(0);
    });

    // Exemple d'utilisation: demander à l'utilisateur ou utiliser un argument
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('📝 Mode interactif - Entrez votre demande:\n');
      console.log('Exemples:');
      console.log('  - "Créer une API REST avec Express pour gérer des utilisateurs"');
      console.log('  - "Créer une application React avec une page d\'accueil"');
      console.log('  - "Créer un script Python pour analyser des fichiers CSV"\n');
      
      // En production, vous pourriez utiliser readline pour l'interaction
      // Pour l'instant, afficher les informations et rester en écoute
      console.log('💡 L\'agent est prêt à recevoir des tâches via WhatsApp ou le CLI\n');
      
      // Garder le processus actif
      process.stdin.resume();
      
    } else {
      // Si des arguments sont fournis, les utiliser comme demande
      const request = args.join(' ');
      const projectName = `project-${Date.now()}`;
      
      console.log(`🎯 Demande: ${request}\n`);
      
      await agent.executeTask(request, projectName);
      
      console.log('\n✨ Exécution terminée!\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('\n\n👋 Arrêt de l\'agent...');
  await whatsapp.destroy();
  db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await whatsapp.destroy();
  db.close();
  process.exit(0);
});

// Lancer l'application
main().catch((error) => {
  console.error('Erreur lors du démarrage:', error);
  process.exit(1);
});
