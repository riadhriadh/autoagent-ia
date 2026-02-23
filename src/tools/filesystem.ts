import { readFile, writeFile, unlink, mkdir, readdir, stat } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { securityManager } from '../core/security.js';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresApproval?: boolean;
}

/**
 * Outil pour lire un fichier
 */
export async function readFileTool(filePath: string): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(filePath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
        requiresApproval: validation.requiresApproval,
      };
    }

    // Vérifier que le fichier existe
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `Le fichier n'existe pas: ${filePath}`,
      };
    }

    const content = await readFile(filePath, 'utf-8');
    
    return {
      success: true,
      data: {
        content,
        path: filePath,
        size: Buffer.byteLength(content, 'utf-8'),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la lecture du fichier: ${error}`,
    };
  }
}

/**
 * Outil pour écrire dans un fichier
 */
export async function writeFileTool(
  filePath: string,
  content: string
): Promise<ToolResult> {
  try {
    // Valider le chemin
    const pathValidation = securityManager.validateFilePath(filePath);
    if (!pathValidation.allowed) {
      return {
        success: false,
        error: pathValidation.reason,
        requiresApproval: pathValidation.requiresApproval,
      };
    }

    // Valider l'extension
    const extValidation = securityManager.validateFileExtension(filePath);
    if (!extValidation.allowed) {
      return {
        success: false,
        error: extValidation.reason,
      };
    }

    // Valider la taille
    const sizeValidation = securityManager.validateFileSize(
      Buffer.byteLength(content, 'utf-8')
    );
    if (!sizeValidation.allowed) {
      return {
        success: false,
        error: sizeValidation.reason,
      };
    }

    // Créer le répertoire parent si nécessaire
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(filePath, content, 'utf-8');
    
    return {
      success: true,
      data: {
        path: filePath,
        size: Buffer.byteLength(content, 'utf-8'),
        created: !existsSync(filePath),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'écriture du fichier: ${error}`,
    };
  }
}

/**
 * Outil pour supprimer un fichier
 */
export async function deleteFileTool(filePath: string): Promise<ToolResult> {
  try {
    // Valider l'action de suppression
    const validation = securityManager.validateDeleteAction(filePath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    if (validation.requiresApproval) {
      return {
        success: false,
        error: 'Cette action nécessite une approbation',
        requiresApproval: true,
      };
    }

    // Vérifier que le fichier existe
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `Le fichier n'existe pas: ${filePath}`,
      };
    }

    await unlink(filePath);
    
    return {
      success: true,
      data: {
        path: filePath,
        deleted: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la suppression du fichier: ${error}`,
    };
  }
}

/**
 * Outil pour créer un répertoire
 */
export async function createDirectoryTool(dirPath: string): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(dirPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
        requiresApproval: validation.requiresApproval,
      };
    }

    await mkdir(dirPath, { recursive: true });
    
    return {
      success: true,
      data: {
        path: dirPath,
        created: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la création du répertoire: ${error}`,
    };
  }
}

/**
 * Outil pour lister le contenu d'un répertoire
 */
export async function listDirectoryTool(dirPath: string): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(dirPath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
        requiresApproval: validation.requiresApproval,
      };
    }

    // Vérifier que le répertoire existe
    if (!existsSync(dirPath)) {
      return {
        success: false,
        error: `Le répertoire n'existe pas: ${dirPath}`,
      };
    }

    const entries = await readdir(dirPath);
    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        return {
          name: entry,
          path: fullPath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );
    
    return {
      success: true,
      data: {
        path: dirPath,
        items,
        count: items.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la liste du répertoire: ${error}`,
    };
  }
}

/**
 * Outil pour obtenir des informations sur un fichier
 */
export async function getFileInfoTool(filePath: string): Promise<ToolResult> {
  try {
    // Valider le chemin
    const validation = securityManager.validateFilePath(filePath);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `Le fichier n'existe pas: ${filePath}`,
      };
    }

    const stats = statSync(filePath);
    
    return {
      success: true,
      data: {
        path: filePath,
        size: stats.size,
        type: stats.isDirectory() ? 'directory' : 'file',
        extension: extname(filePath),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la récupération des informations: ${error}`,
    };
  }
}
