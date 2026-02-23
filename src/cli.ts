#!/usr/bin/env node
import { Command } from 'commander';
import { db } from './db/database.js';
import { llm } from './core/llm.js';
import { workspaceManager } from './core/workspace.js';
import { configLoader } from './core/config-loader.js';

const program = new Command();

program
  .name('autoagent')
  .description('CLI pour AutoAgent IA - Agent IA autonome local')
  .version('1.0.0');

// Commande: status
program
  .command('status')
  .description('Afficher le statut de l\'agent et des tâches')
  .action(() => {
    console.log('\n📊 Statut de l\'Agent IA\n');
    
    // Vérifier le LLM
    llm.isModelAvailable().then((available) => {
      console.log(`🧠 Modèle LLM: ${configLoader.env.ollamaModel} ${available ? '✅' : '❌ (non disponible)'}`);
    });

    // Tâches
    const tasks = db.getAllTasks();
    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const pending = tasks.filter((t) => t.status === 'pending');
    const completed = tasks.filter((t) => t.status === 'completed');
    const failed = tasks.filter((t) => t.status === 'failed');

    console.log(`\n📋 Tâches:`);
    console.log(`  ✅ Complétées: ${completed.length}`);
    console.log(`  ⏳ En cours: ${inProgress.length}`);
    console.log(`  📝 En attente: ${pending.length}`);
    console.log(`  ❌ Échouées: ${failed.length}`);
    console.log(`  📊 Total: ${tasks.length}`);

    // Projets
    const projects = workspaceManager.listProjects();
    console.log(`\n📁 Projets: ${projects.length}`);
    
    // Approbations
    const approvals = db.getPendingApprovals();
    if (approvals.length > 0) {
      console.log(`\n⚠️  ${approvals.length} approbation(s) en attente`);
    }

    console.log();
  });

// Commande: list-tasks
program
  .command('list-tasks')
  .description('Lister toutes les tâches')
  .option('-s, --status <status>', 'Filtrer par statut')
  .action((options) => {
    const tasks = options.status ? db.getAllTasks(options.status) : db.getAllTasks();

    if (tasks.length === 0) {
      console.log('Aucune tâche trouvée.');
      return;
    }

    console.log(`\n📋 Tâches (${tasks.length}):\n`);
    tasks.forEach((task) => {
      const statusEmoji = {
        pending: '📝',
        in_progress: '⏳',
        completed: '✅',
        failed: '❌',
        waiting_approval: '⏸️',
        cancelled: '🚫',
      }[task.status] || '❓';

      console.log(`${statusEmoji} #${task.id}: ${task.title}`);
      console.log(`   Statut: ${task.status} | Priorité: ${task.priority}`);
      console.log(`   Créée: ${new Date(task.createdAt!).toLocaleString()}`);
      console.log();
    });
  });

// Commande: list-projects
program
  .command('list-projects')
  .description('Lister tous les projets')
  .action(() => {
    const projects = workspaceManager.listProjects();

    if (projects.length === 0) {
      console.log('Aucun projet trouvé.');
      return;
    }

    console.log(`\n📁 Projets (${projects.length}):\n`);
    projects.forEach((project) => {
      console.log(`📦 ${project.name}`);
      console.log(`   Type: ${project.type}`);
      console.log(`   Chemin: ${project.path}`);
      console.log(`   Statut: ${project.status}`);
      console.log(`   Créé: ${new Date(project.createdAt!).toLocaleString()}`);
      console.log();
    });
  });

// Commande: approve
program
  .command('approve <id>')
  .description('Approuver une action en attente')
  .action((id) => {
    const approvalId = parseInt(id);
    const approval = db.getApproval(approvalId);

    if (!approval) {
      console.log(`❌ Approbation #${approvalId} introuvable`);
      return;
    }

    if (approval.status !== 'pending') {
      console.log(`❌ Cette approbation a déjà été traitée (${approval.status})`);
      return;
    }

    db.updateApproval(approvalId, 'approved', 'cli-user');
    console.log(`✅ Action #${approvalId} approuvée`);
  });

// Commande: reject
program
  .command('reject <id>')
  .description('Rejeter une action en attente')
  .action((id) => {
    const approvalId = parseInt(id);
    const approval = db.getApproval(approvalId);

    if (!approval) {
      console.log(`❌ Approbation #${approvalId} introuvable`);
      return;
    }

    if (approval.status !== 'pending') {
      console.log(`❌ Cette approbation a déjà été traitée (${approval.status})`);
      return;
    }

    db.updateApproval(approvalId, 'rejected', 'cli-user');
    console.log(`❌ Action #${approvalId} rejetée`);
  });

// Commande: list-approvals
program
  .command('list-approvals')
  .description('Lister les approbations en attente')
  .action(() => {
    const approvals = db.getPendingApprovals();

    if (approvals.length === 0) {
      console.log('✅ Aucune approbation en attente');
      return;
    }

    console.log(`\n⏳ Approbations en attente (${approvals.length}):\n`);
    approvals.forEach((approval) => {
      console.log(`#${approval.id}: ${approval.action}`);
      console.log(`   Description: ${approval.description}`);
      console.log(`   Demandée: ${new Date(approval.requestedAt!).toLocaleString()}`);
      console.log(`   🔧 approuve ${approval.id} ou refuse ${approval.id}`);
      console.log();
    });
  });

// Commande: config
program
  .command('config')
  .description('Afficher la configuration actuelle')
  .action(() => {
    console.log('\n⚙️  Configuration:\n');
    console.log(`Modèle LLM: ${configLoader.env.ollamaModel}`);
    console.log(`URL Ollama: ${configLoader.env.ollamaBaseUrl}`);
    console.log(`Workspace: ${configLoader.env.workspacePath}`);
    console.log(`WhatsApp: ${configLoader.env.whatsappEnabled ? 'Activé' : 'Désactivé'}`);
    console.log(`Base de données: ${configLoader.env.dbPath}`);
    console.log();
  });

// Commande: logs
program
  .command('logs')
  .description('Afficher les derniers logs d\'actions')
  .option('-n, --number <number>', 'Nombre de logs à afficher', '20')
  .option('-t, --task <taskId>', 'Filtrer par ID de tâche')
  .action((options) => {
    const limit = parseInt(options.number);
    const taskId = options.task ? parseInt(options.task) : undefined;
    const logs = db.getActionLogs(taskId, limit);

    if (logs.length === 0) {
      console.log('Aucun log trouvé.');
      return;
    }

    console.log(`\n📜 Logs d\'actions (${logs.length}):\n`);
    logs.forEach((log) => {
      console.log(`[${log.timestamp}] ${log.tool} - ${log.action}`);
      console.log(`   Tâche: #${log.taskId || 'N/A'}`);
      console.log(`   Approuvé: ${log.approved ? '✅' : '❌'}`);
      console.log();
    });
  });

// Commande: clear
program
  .command('clear-data')
  .description('Effacer toutes les données (ATTENTION: irreversible)')
  .option('--confirm', 'Confirmer la suppression')
  .action((options) => {
    if (!options.confirm) {
      console.log('⚠️  Cette commande va supprimer TOUTES les données.');
      console.log('Utilisez --confirm pour confirmer.');
      return;
    }

    db.clearAllData();
    console.log('✅ Toutes les données ont été effacées');
  });

// C ommande: check-model
program
  .command('check-model')
  .description('Vérifier la disponibilité du modèle LLM')
  .action(async () => {
    console.log(`\n🔍 Vérification du modèle ${configLoader.env.ollamaModel}...\n`);
    
    try {
      const available = await llm.isModelAvailable();
      
      if (available) {
        console.log('✅ Modèle disponible!');
        
        // Afficher les stats
        const stats = llm.getStats();
        console.log(`\nStatistiques:`);
        console.log(`  Modèle: ${stats.modelName}`);
        console.log(`  Cache: ${stats.cacheEnabled ? 'Activé' : 'Désactivé'}`);
        console.log(`  Entrées en cache: ${stats.cacheSize}`);
      } else {
        console.log('❌ Modèle non disponible');
        console.log('\nModèles disponibles:');
        const models = await llm.listModels();
        models.forEach((model) => console.log(`  - ${model}`));
        console.log(`\n💡 Téléchargez le modèle avec: ollama pull ${configLoader.env.ollamaModel}`);
      }
    } catch (error) {
      console.error(`❌ Erreur: ${error}`);
      console.log('\n💡 Assurez-vous qu\'Ollama est en cours d\'exécution');
    }
    
    console.log();
  });

program.parse();
