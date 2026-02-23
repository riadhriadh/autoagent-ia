import { llm } from './llm.js';
import { SYSTEM_PROMPT, TASK_ANALYSIS_PROMPT, formatPrompt, ERROR_ANALYSIS_PROMPT } from './prompts.js';
import { db, type Task, type Approval } from '../db/database.js';
import * as filesystem from '../tools/filesystem.js';
import * as git from '../tools/git.js';
import * as api from '../tools/api.js';
import * as terminal from '../tools/terminal.js';
import * as analysis from '../tools/analysis.js';
import { configLoader } from './config-loader.js';
import { join } from 'path';

export interface AgentResponse {
  thought?: string;
  action?: {
    tool: string;
    parameters: Record<string, any>;
  };
  completed?: boolean;
  summary?: string;
  filesCreated?: string[];
  nextSteps?: string[];
  needsApproval?: boolean;
  criticalityLevel?: 'low' | 'medium' | 'high';
}

export interface TaskAnalysis {
  objective: string;
  projectType: string;
  technologies: string[];
  constraints: string[];
  steps: Array<{
    id: number;
    description: string;
    tool: string;
    estimatedComplexity: string;
    dependencies: number[];
    criticalityLevel: string;
  }>;
  estimatedFiles: string[];
  risks: string[];
}

export class AutonomousAgent {
  private currentTaskId?: number;
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  private maxIterations: number = 50;
  private currentIteration: number = 0;
  private workspacePath: string;
  private onApprovalNeeded?: (approval: Approval) => Promise<boolean>;

  constructor(onApprovalNeeded?: (approval: Approval) => Promise<boolean>) {
    this.workspacePath = configLoader.env.workspacePath;
    this.onApprovalNeeded = onApprovalNeeded;
    
    // Initialiser la conversation avec le prompt système
    this.conversationHistory.push({
      role: 'system',
      content: SYSTEM_PROMPT,
    });
  }

  /**
   * Analyse une demande utilisateur et crée un plan d'exécution
   */
  async analyzeTask(userRequest: string): Promise<TaskAnalysis> {
    const prompt = formatPrompt(TASK_ANALYSIS_PROMPT, { userRequest });
    
    try {
      const analysis = await llm.generateJSON<TaskAnalysis>(prompt, {
        temperature: 0.3, // Plus déterministe pour l'analyse
      });

      return analysis;
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse de la tâche: ${error}`);
    }
  }

  /**
   * Exécute une tâche de manière autonome en utilisant la boucle ReAct
   */
  async executeTask(userRequest: string, projectName?: string): Promise<void> {
    this.currentIteration = 0;
    
    // Analyser la tâche
    console.log('🔍 Analyse de la tâche...');
    const analysis = await this.analyzeTask(userRequest);
    
    // Créer la tâche dans la base de données
    const taskId = db.createTask({
      title: analysis.objective,
      description: userRequest,
      status: 'in_progress',
      priority: 'medium',
      metadata: JSON.stringify(analysis),
    });
    
    this.currentTaskId = taskId;
    console.log(`📝 Tâche #${taskId} créée: ${analysis.objective}`);
    
    // Créer le projet si nécessaire
    let productPath = this.workspacePath;
    if (projectName) {
      projectPath = join(this.workspacePath, projectName);
      
      const projectId = db.createProject({
        name: projectName,
        type: analysis.projectType,
        path: projectPath,
        status: 'active',
      });
      
      db.updateTask(taskId, { projectId });
      console.log(`📁 Projet créé: ${projectName}`);
    }
    
    // Ajouter la demande à l'historique
    this.conversationHistory.push({
      role: 'user',
      content: `Tâche: ${userRequest}\n\nAnalyse:\n${JSON.stringify(analysis, null, 2)}`,
    });
    
    // Boucle ReAct
    console.log('🤖 Démarrage de l'exécution autonome...\n');
    
    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      console.log(`\n--- Itération ${this.currentIteration}/${this.maxIterations} ---`);
      
      try {
        // Obtenir la prochaine action de l'agent
        const response = await this.getNextAction();
        
        // Vérifier si la tâche est terminée
        if (response.completed) {
          console.log('\n✅ Tâche terminée !');
          console.log(`📋 Résumé: ${response.summary}`);
          
          if (response.filesCreated && response.filesCreated.length > 0) {
            console.log(`📄 Fichiers créés: ${response.filesCreated.join(', ')}`);
          }
          
          db.updateTask(taskId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });
          
          break;
        }
        
        // Exécuter l'action
        if (response.action) {
          console.log(`💭 Pensée: ${response.thought}`);
          console.log(`🔧 Action: ${response.action.tool}(${JSON.stringify(response.action.parameters)})`);
          
          const result = await this.executeAction(response.action.tool, response.action.parameters, response.needsApproval);
          
          // Ajouter le résultat à l'historique
          this.conversationHistory.push({
            role: 'assistant',
            content: `Action: ${response.action.tool}\nRésultat: ${JSON.stringify(result)}`,
          });
          
          console.log(`📊 Résultat: ${result.success ? '✓ Succès' : '✗ Échec'}`);
          if (result.error) {
            console.log(`❌ Erreur: ${result.error}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors de l'itération: ${error}`);
        
        // Tenter de récupérer de l'erreur
        const recovery = await this.handleError(error);
        if (!recovery) {
          db.updateTask(taskId, { status: 'failed' });
          throw error;
        }
      }
    }
    
    if (this.currentIteration >= this.maxIterations) {
      console.log('\n⚠️  Nombre maximum d\'itérations atteint');
      db.updateTask(taskId, { status: 'failed' });
    }
  }

  /**
   * Obtient la prochaine action à effectuer de l'agent
   */
  private async getNextAction(): Promise<AgentResponse> {
    const response = await llm.chat(this.conversationHistory, {
      temperature: 0.7,
    });
    
    try {
      // Tenter de parser la réponse comme JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Si pas de JSON, retourner une réponse par défaut
      return {
        thought: response.content,
        completed: false,
      };
    } catch (error) {
      console.warn('⚠️  Impossible de parser la réponse JSON, tentative de récupération...');
      return {
        thought: response.content,
        completed: response.content.toLowerCase().includes('terminé') || 
                   response.content.toLowerCase().includes('completed'),
      };
    }
  }

  /**
   * Exécute une action spécifique
   */
  private async executeAction(
    tool: string,
    parameters: Record<string, any>,
    needsApproval?: boolean
  ): Promise<any> {
    // Demander approbation si nécessaire
    if (needsApproval && this.onApprovalNeeded && this.currentTaskId) {
      const approvalId = db.createApproval({
        taskId: this.currentTaskId,
        action: tool,
        description: JSON.stringify(parameters),
        status: 'pending',
      });
      
      const approval = db.getApproval(approvalId);
      if (approval) {
        console.log('⏳ Approbation requise...');
        const approved = await this.onApprovalNeeded(approval);
        
        if (!approved) {
          return { success: false, error: 'Action rejetée par l\'utilisateur' };
        }
      }
    }
    
    let result: any;
    
    // Router vers le bon outil
    switch (tool) {
      // Filesystem
      case 'readFile':
        result = await filesystem.readFileTool(parameters.path);
        break;
      case 'writeFile':
        result = await filesystem.writeFileTool(parameters.path, parameters.content);
        break;
      case 'deleteFile':
        result = await filesystem.deleteFileTool(parameters.path);
        break;
      case 'createDirectory':
        result = await filesystem.createDirectoryTool(parameters.path);
        break;
      case 'listDirectory':
        result = await filesystem.listDirectoryTool(parameters.path);
        break;
        
      // Git
      case 'gitInit':
        result = await git.gitInitTool(parameters.path);
        break;
      case 'gitCommit':
        result = await git.gitCommitTool(parameters.path, parameters.message, parameters.files);
        break;
      case 'gitStatus':
        result = await git.gitStatusTool(parameters.path);
        break;
      case 'gitCreateBranch':
        result = await git.gitCreateBranchTool(parameters.path, parameters.branch, parameters.checkout);
        break;
        
      // API
      case 'makeApiCall':
        result = await api.makeApiCallTool(parameters.url, parameters.options);
        break;
        
      // Terminal
      case 'executeCommand':
        result = await terminal.executeCommandTool(parameters.command, parameters.options);
        break;
      case 'installNpmPackages':
        result = await terminal.installNpmPackagesTool(parameters.packages, parameters.path, parameters.isDev);
        break;
      case 'npmInit':
        result = await terminal.npmInitTool(parameters.path, parameters.name);
        break;
        
      // Analysis
      case 'detectLanguage':
        result = analysis.detectLanguageTool(parameters.filename, parameters.content);
        break;
      case 'analyzeDependencies':
        result = analysis.analyzeDependenciesTool(parameters.content, parameters.language);
        break;
      case 'suggestProjectStructure':
        result = analysis.suggestProjectStructureTool(parameters.projectType);
        break;
        
      default:
        result = { success: false, error: `Outil inconnu: ${tool}` };
    }
    
    // Logger l'action
    if (this.currentTaskId) {
      db.logAction({
        taskId: this.currentTaskId,
        tool,
        action: tool,
        parameters: JSON.stringify(parameters),
        result: JSON.stringify(result),
        approved: !needsApproval,
      });
    }
    
    return result;
  }

  /**
   * Gère les erreurs et tente de récupérer
   */
  private async handleError(error: any): Promise<boolean> {
    console.log('🔄 Tentative de récupération de l\'erreur...');
    
    const errorPrompt = formatPrompt(ERROR_ANALYSIS_PROMPT, {
      tool: 'unknown',
      parameters: '{}',
      error: error.toString(),
    });
    
    try {
      const analysis = await llm.generateJSON(errorPrompt);
      console.log(`💡 Solution suggérée: ${analysis.solution}`);
      
      return !analysis.needsHumanIntervention;
    } catch (recoveryError) {
      return false;
    }
  }

  /**
   * Réinitialise l'agent pour une nouvelle tâche
   */
  reset(): void {
    this.currentTaskId = undefined;
    this.currentIteration = 0;
    this.conversationHistory = [{
      role: 'system',
      content: SYSTEM_PROMPT,
    }];
  }
}
