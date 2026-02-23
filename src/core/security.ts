import { configLoader, type Permissions } from './config-loader.js';
import { resolve, normalize, relative } from 'path';
import { existsSync } from 'fs';

export interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export class SecurityManager {
  private permissions: Permissions;

  constructor() {
    this.permissions = configLoader.permissions;
  }

  /**
   * Valide si un chemin de fichier est autorisé
   */
  validateFilePath(filePath: string): SecurityValidationResult {
    const normalizedPath = normalize(filePath);
    const absolutePath = resolve(normalizedPath);

    // Vérifier les chemins interdits
    for (const deniedPath of this.permissions.deniedPaths) {
      const normalizedDenied = normalize(deniedPath);
      if (absolutePath.startsWith(resolve(normalizedDenied))) {
        return {
          allowed: false,
          reason: `Accès refusé: le chemin ${filePath} est dans une zone interdite (${deniedPath})`,
        };
      }
    }

    // Vérifier les chemins autorisés
    const workspacePath = resolve(configLoader.env.workspacePath);
    let isInAllowedPath = false;

    for (const allowedPath of this.permissions.allowedPaths) {
      const normalizedAllowed = normalize(allowedPath);
      const resolvedAllowed = resolve(normalizedAllowed);
      
      if (absolutePath.startsWith(resolvedAllowed)) {
        isInAllowedPath = true;
        break;
      }
    }

    if (!isInAllowedPath) {
      return {
        allowed: false,
        reason: `Accès refusé: le chemin ${filePath} n'est pas dans un répertoire autorisé`,
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si une extension de fichier est autorisée
   */
  validateFileExtension(filename: string): SecurityValidationResult {
    const ext = filename.substring(filename.lastIndexOf('.'));
    
    if (!this.permissions.allowedExtensions.includes(ext)) {
      return {
        allowed: false,
        reason: `Extension de fichier non autorisée: ${ext}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si une taille de fichier est autorisée
   */
  validateFileSize(sizeInBytes: number): SecurityValidationResult {
    const maxSize = this.permissions.maxFileSizeMB * 1024 * 1024;
    
    if (sizeInBytes > maxSize) {
      return {
        allowed: false,
        reason: `Fichier trop volumineux: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB (max: ${this.permissions.maxFileSizeMB}MB)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si une commande est autorisée
   */
  validateCommand(command: string): SecurityValidationResult {
    const commandName = command.trim().split(' ')[0];

    // Vérifier les commandes interdites (patterns)
    for (const deniedCmd of this.permissions.deniedCommands) {
      if (command.includes(deniedCmd) || commandName === deniedCmd) {
        return {
          allowed: false,
          reason: `Commande interdite: ${deniedCmd}`,
        };
      }
    }

    // Vérifier si la commande est dans la whitelist
    const isAllowed = this.permissions.allowedCommands.some(
      (allowedCmd) => commandName === allowedCmd || commandName.startsWith(allowedCmd)
    );

    if (!isAllowed && configLoader.env.enableCommandExecution) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Commande non autorisée: ${commandName}. Approbation requise.`,
      };
    }

    if (!configLoader.env.enableCommandExecution) {
      return {
        allowed: false,
        reason: 'Exécution de commandes désactivée dans la configuration',
      };
    }

    // Vérifier si l'exécution nécessite une approbation
    if (configLoader.env.requireApprovalForExec) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'Exécution de commande nécessite une approbation',
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si une action de suppression est autorisée
   */
  validateDeleteAction(filePath: string): SecurityValidationResult {
    const pathValidation = this.validateFilePath(filePath);
    if (!pathValidation.allowed) {
      return pathValidation;
    }

    if (
      this.permissions.criticalActions.delete ||
      configLoader.env.requireApprovalForDelete
    ) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'Suppression de fichier nécessite une approbation',
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si un appel API est autorisé
   */
  validateApiCall(url: string): SecurityValidationResult {
    if (!configLoader.env.enableApiCalls) {
      return {
        allowed: false,
        reason: 'Appels API désactivés dans la configuration',
      };
    }

    if (
      this.permissions.criticalActions.apiCall ||
      configLoader.env.requireApprovalForApi
    ) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'Appel API nécessite une approbation',
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si une action git push est autorisée
   */
  validateGitPush(): SecurityValidationResult {
    if (this.permissions.criticalActions.gitPush) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'Git push nécessite une approbation',
      };
    }

    return { allowed: true };
  }

  /**
   * Valide si l'installation de package est autorisée
   */
  validatePackageInstall(packageName: string): SecurityValidationResult {
    if (this.permissions.criticalActions.installPackage) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Installation du package "${packageName}" nécessite une approbation`,
      };
    }

    return { allowed: true };
  }
}

// Exporter une instance singleton
export const securityManager = new SecurityManager();
export default securityManager;
