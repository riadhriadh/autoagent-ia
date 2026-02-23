import { config } from 'dotenv';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config();

// Schéma de validation pour les permissions
const PermissionsSchema = z.object({
  allowedPaths: z.array(z.string()),
  deniedPaths: z.array(z.string()),
  allowedCommands: z.array(z.string()),
  deniedCommands: z.array(z.string()),
  maxFileSizeMB: z.number().positive(),
  allowedExtensions: z.array(z.string()),
  criticalActions: z.object({
    delete: z.boolean(),
    execute: z.boolean(),
    apiCall: z.boolean(),
    gitPush: z.boolean(),
    installPackage: z.boolean(),
  }),
  apiRateLimits: z.object({
    maxRequestsPerMinute: z.number(),
    maxRequestsPerHour: z.number(),
  }),
});

// Schéma de validation pour la configuration de l'agent
const AgentConfigSchema = z.object({
  workspacePath: z.string(),
  modelName: z.string(),
  maxRetries: z.number().int().positive(),
  maxConcurrentTasks: z.number().int().positive(),
  taskTimeout: z.number().positive(),
  enableLLMCache: z.boolean(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
});

// Types exportés
export type Permissions = z.infer<typeof PermissionsSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Classe pour gérer la configuration
class ConfigLoader {
  private static instance: ConfigLoader;
  
  public permissions: Permissions;
  public agentConfig: AgentConfig;
  public env: {
    ollamaBaseUrl: string;
    ollamaModel: string;
    llmTemperature: number;
    llmMaxTokens: number;
    workspacePath: string;
    whatsappEnabled: boolean;
    whatsappSessionPath: string;
    whatsappAdminNumbers: string[];
    dbPath: string;
    logLevel: string;
    logPath: string;
    enableCommandExecution: boolean;
    enableApiCalls: boolean;
    requireApprovalForDelete: boolean;
    requireApprovalForExec: boolean;
    requireApprovalForApi: boolean;
  };

  private constructor() {
    // Charger les permissions
    const permissionsPath = join(__dirname, '../../config/permissions.json');
    const permissionsData = JSON.parse(readFileSync(permissionsPath, 'utf-8'));
    this.permissions = PermissionsSchema.parse(permissionsData);

    // Charger la configuration de l'agent
    const agentConfigPath = join(__dirname, '../../config/agent.config.json');
    const agentConfigData = JSON.parse(readFileSync(agentConfigPath, 'utf-8'));
    this.agentConfig = AgentConfigSchema.parse(agentConfigData);

    // Charger les variables d'environnement
    this.env = {
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'phi3:mini',
      llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
      workspacePath: process.env.WORKSPACE_PATH || './workspace',
      whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
      whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-session',
      whatsappAdminNumbers: (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').filter(Boolean),
      dbPath: process.env.DB_PATH || './data/agent.db',
      logLevel: process.env.LOG_LEVEL || 'info',
      logPath: process.env.LOG_PATH || './logs/agent.log',
      enableCommandExecution: process.env.ENABLE_COMMAND_EXECUTION !== 'false',
      enableApiCalls: process.env.ENABLE_API_CALLS !== 'false',
      requireApprovalForDelete: process.env.REQUIRE_APPROVAL_FOR_DELETE === 'true',
      requireApprovalForExec: process.env.REQUIRE_APPROVAL_FOR_EXEC === 'true',
      requireApprovalForApi: process.env.REQUIRE_APPROVAL_FOR_API === 'true',
    };
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public reload(): void {
    ConfigLoader.instance = new ConfigLoader();
  }
}

// Exporter une instance singleton
export const configLoader = ConfigLoader.getInstance();
export default configLoader;
