import { exec } from 'child_process';
import { promisify } from 'util';
import { securityManager } from '../core/security.js';
import type { ToolResult } from './filesystem.js';

const execAsync = promisify(exec);

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * Outil pour exécuter une commande système
 */
export async function executeCommandTool(
  command: string,
  options: CommandOptions = {}
): Promise<ToolResult> {
  try {
    // Valider la commande
    const validation = securityManager.validateCommand(command);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    if (validation.requiresApproval) {
      return {
        success: false,
        error: validation.reason,
        requiresApproval: true,
      };
    }

    // Valider le répertoire de travail si spécifié
    if (options.cwd) {
      const pathValidation = securityManager.validateFilePath(options.cwd);
      if (!pathValidation.allowed) {
        return {
          success: false,
          error: pathValidation.reason,
        };
      }
    }

    const { timeout = 30000, cwd, env } = options;

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 10, // 10MB max buffer
    });

    return {
      success: true,
      data: {
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        cwd: cwd || process.cwd(),
      },
    };
  } catch (error: any) {
    // Distinguer les erreurs de timeout, killed, et autres
    if (error.killed) {
      return {
        success: false,
        error: `Commande interrompue (timeout)`,
        data: {
          command,
          stdout: error.stdout?.trim(),
          stderr: error.stderr?.trim(),
          killed: true,
        },
      };
    }

    return {
      success: false,
      error: `Erreur lors de l'exécution: ${error.message}`,
      data: {
        command,
        stdout: error.stdout?.trim(),
        stderr: error.stderr?.trim(),
        exitCode: error.code,
      },
    };
  }
}

/**
 * Outil pour installer des packages npm
 */
export async function installNpmPackagesTool(
  packages: string[],
  projectPath: string,
  isDev: boolean = false
): Promise<ToolResult> {
  try {
    // Valider les permissions
    const validation = securityManager.validatePackageInstall(packages.join(', '));
    if (validation.requiresApproval) {
      return {
        success: false,
        error: validation.reason,
        requiresApproval: true,
      };
    }

    const flag = isDev ? '--save-dev' : '--save';
    const command = `npm install ${flag} ${packages.join(' ')}`;

    return await executeCommandTool(command, {
      cwd: projectPath,
      timeout: 120000, // 2 minutes pour npm install
    });
  } catch (error: any) {
    return {
      success: false,
      error: `Erreur lors de l'installation des packages: ${error.message}`,
    };
  }
}

/**
 * Outil pour exécuter un script npm
 */
export async function runNpmScriptTool(
  scriptName: string,
  projectPath: string
): Promise<ToolResult> {
  const command = `npm run ${scriptName}`;
  
  return await executeCommandTool(command, {
    cwd: projectPath,
    timeout: 60000,
  });
}

/**
 * Outil pour vérifier si une commande existe
 */
export async function checkCommandExistsTool(
  commandName: string
): Promise<ToolResult> {
  try {
    // Utiliser 'where' sur Windows, 'which' sur Unix
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    const command = `${checkCmd} ${commandName}`;

    const result = await execAsync(command, { timeout: 5000 });
    
    return {
      success: true,
      data: {
        command: commandName,
        exists: true,
        path: result.stdout.trim(),
      },
    };
  } catch (error) {
    return {
      success: true,
      data: {
        command: commandName,
        exists: false,
      },
    };
  }
}

/**
 * Outil pour obtenir la version d'une commande
 */
export async function getCommandVersionTool(
  commandName: string
): Promise<ToolResult> {
  try {
    const command = `${commandName} --version`;
    const result = await execAsync(command, { timeout: 5000 });
    
    return {
      success: true,
      data: {
        command: commandName,
        version: result.stdout.trim(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Impossible d'obtenir la version: ${error.message}`,
    };
  }
}

/**
 * Outil pour créer un projet Node.js avec npm init
 */
export async function npmInitTool(
  projectPath: string,
  packageName?: string
): Promise<ToolResult> {
  try {
    const pathValidation = securityManager.validateFilePath(projectPath);
    if (!pathValidation.allowed) {
      return {
        success: false,
        error: pathValidation.reason,
      };
    }

    // npm init -y pour initialisation automatique
    const result = await executeCommandTool('npm init -y', {
      cwd: projectPath,
    });

    // Optionnellement, modifier le nom du package
    if (packageName && result.success) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      packageJson.name = packageName;
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: `Erreur lors de l'initialisation npm: ${error.message}`,
    };
  }
}
