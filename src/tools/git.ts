import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import { existsSync } from 'fs';
import { securityManager } from '../core/security.js';
import type { ToolResult } from './filesystem.js';

/**
 * Outil pour initialiser un dépôt Git
 */
export async function gitInitTool(repoPath: string): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(repoPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const git: SimpleGit = simpleGit(repoPath);
    await git.init();
    
    // Créer un .gitignore de base
    const gitignoreContent = `node_modules/
dist/
.env
*.log
.DS_Store`;
    
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.writeFile(path.join(repoPath, '.gitignore'), gitignoreContent);
    
    return {
      success: true,
      data: {
        path: repoPath,
        initialized: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'initialisation Git: ${error}`,
    };
  }
}

/**
 * Outil pour faire un commit Git
 */
export async function gitCommitTool(
  repoPath: string,
  message: string,
  files?: string[]
): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(repoPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const git: SimpleGit = simpleGit(repoPath);
    
    // Ajouter les fichiers (tous si non spécifiés)
    if (files && files.length > 0) {
      await git.add(files);
    } else {
      await git.add('.');
    }
    
    // Faire le commit
    const result = await git.commit(message);
    
    return {
      success: true,
      data: {
        path: repoPath,
        commit: result.commit,
        summary: result.summary,
        files: files || ['all'],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors du commit Git: ${error}`,
    };
  }
}

/**
 * Outil pour obtenir le statut Git
 */
export async function gitStatusTool(repoPath: string): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(repoPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const git: SimpleGit = simpleGit(repoPath);
    const status: StatusResult = await git.status();
    
    return {
      success: true,
      data: {
        path: repoPath,
        branch: status.current,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        staged: status.staged,
        isClean: status.isClean(),
        ahead: status.ahead,
        behind: status.behind,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la récupération du statut Git: ${error}`,
    };
  }
}

/**
 * Outil pour créer une branche Git
 */
export async function gitCreateBranchTool(
  repoPath: string,
  branchName: string,
  checkout: boolean = true
): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(repoPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const git: SimpleGit = simpleGit(repoPath);
    
    if (checkout) {
      await git.checkoutLocalBranch(branchName);
    } else {
      await git.branch([branchName]);
    }
    
    return {
      success: true,
      data: {
        path: repoPath,
        branch: branchName,
        checkedOut: checkout,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la création de la branche: ${error}`,
    };
  }
}

/**
 * Outil pour obtenir l'historique des commits
 */
export async function gitLogTool(
  repoPath: string,
  maxCount: number = 10
): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(repoPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const git: SimpleGit = simpleGit(repoPath);
    const log = await git.log({ maxCount });
    
    return {
      success: true,
      data: {
        path: repoPath,
        commits: log.all.map((commit) => ({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: commit.date,
        })),
        total: log.total,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la récupération de l'historique: ${error}`,
    };
  }
}

/**
 * Outil pour push vers un remote (nécessite approbation)
 */
export async function gitPushTool(
  repoPath: string,
  remote: string = 'origin',
  branch?: string
): Promise<ToolResult> {
  try {
    // Valider l'action push
    const validation = securityManager.validateGitPush();
    if (validation.requiresApproval) {
      return {
        success: false,
        error: validation.reason,
        requiresApproval: true,
      };
    }

    // Valider le chemin
    const pathValidation = securityManager.validateFilePath(repoPath);
    if (!pathValidation.allowed) {
      return {
        success: false,
        error: pathValidation.reason,
      };
    }

    const git: SimpleGit = simpleGit(repoPath);
    
    if (branch) {
      await git.push(remote, branch);
    } else {
      await git.push();
    }
    
    return {
      success: true,
      data: {
        path: repoPath,
        remote,
        branch: branch || 'current',
        pushed: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors du push Git: ${error}`,
    };
  }
}

/**
 * Outil pour cloner un dépôt
 */
export async function gitCloneTool(
  repoUrl: string,
  targetPath: string
): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(targetPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const git: SimpleGit = simpleGit();
    await git.clone(repoUrl, targetPath);
    
    return {
      success: true,
      data: {
        url: repoUrl,
        path: targetPath,
        cloned: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors du clonage: ${error}`,
    };
  }
}
