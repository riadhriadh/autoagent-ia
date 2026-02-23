import { extname } from 'path';
import type { ToolResult } from './filesystem.js';

/**
 * Détecte le langage de programmation d'un fichier
 */
export function detectLanguageTool(filename: string, content?: string): ToolResult {
  const ext = extname(filename).toLowerCase();
  
  const languageMap: Record<string, string> = {
    '.js': 'JavaScript',
    '.mjs': 'JavaScript (Module)',
    '.cjs': 'JavaScript (CommonJS)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.jsx': 'JavaScript React',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.json': 'JSON',
    '.xml': 'XML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.md': 'Markdown',
    '.sh': 'Shell',
    '.bash': 'Bash',
    '.sql': 'SQL',
  };

  const language = languageMap[ext] || 'Unknown';
  
  return {
    success: true,
    data: {
      filename,
      extension: ext,
      language,
    },
  };
}

/**
 * Analyse le code pour détecter les dépendances
 */
export function analyzeDependenciesTool(content: string, language: string): ToolResult {
  const dependencies: string[] = [];
  
  try {
    if (language === 'JavaScript' || language === 'TypeScript') {
      // Rechercher les imports ES6
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
      
      // Rechercher les require CommonJS
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
    } else if (language === 'Python') {
      // Rechercher les imports Python
      const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        if (match[1]) {
          dependencies.push(match[1]);
        } else {
          const imports = match[2].split(',').map((s) => s.trim().split(' ')[0]);
          dependencies.push(...imports);
        }
      }
    }
    
    // Filtrer les imports relatifs et dupli cats
    const externalDeps = [...new Set(
      dependencies.filter((dep) => !dep.startsWith('.') && !dep.startsWith('/'))
    )];
    
    return {
      success: true,
      data: {
        language,
        dependencies: externalDeps,
        count: externalDeps.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Erreur lors de l'analyse des dépendances: ${error.message}`,
    };
  }
}

/**
 * Suggère une structure de projet basée sur le type
 */
export function suggestProjectStructureTool(projectType: string): ToolResult {
  const structures: Record<string, any> = {
    'web-react': {
      description: 'Application React moderne avec Vite',
      structure: {
        'src/': {
          'components/': 'Composants React',
          'pages/': 'Pages de l\'application',
          'hooks/': 'Custom hooks',
          'utils/': 'Utilitaires',
          'styles/': 'Fichiers CSS/SCSS',
          'App.tsx': 'Composant principal',
          'main.tsx': 'Point d\'entrée',
        },
        'public/': 'Assets statiques',
        'index.html': 'HTML principal',
        'package.json': 'Dépendances npm',
        'vite.config.ts': 'Configuration Vite',
        'tsconfig.json': 'Configuration TypeScript',
      },
      dependencies: ['react', 'react-dom'],
      devDependencies: ['@vitejs/plugin-react', 'vite', 'typescript'],
    },
    'api-express': {
      description: 'API REST avec Express.js',
      structure: {
        'src/': {
          'routes/': 'Routes API',
          'controllers/': 'Contrôleurs',
          'models/': 'Modèles de données',
          'middlewares/': 'Middlewares Express',
          'utils/': 'Utilitaires',
          'config/': 'Configuration',
          'index.ts': 'Point d\'entrée',
        },
        'tests/': 'Tests',
        'package.json': 'Dépendances npm',
        'tsconfig.json': 'Configuration TypeScript',
        '.env.example': 'Variables d\'environnement',
      },
      dependencies: ['express', 'cors', 'dotenv'],
      devDependencies: ['@types/express', '@types/cors', 'typescript', 'ts-node', 'nodemon'],
    },
    'python-app': {
      description: 'Application Python',
      structure: {
        'src/': {
          '__init__.py': 'Package principal',
          'main.py': 'Point d\'entrée',
          'utils/': 'Utilitaires',
        },
        'tests/': 'Tests unitaires',
        'requirements.txt': 'Dépendances Python',
        'README.md': 'Documentation',
        '.gitignore': 'Fichiers à ignorer',
      },
      dependencies: [],
      devDependencies: [],
    },
    'fullstack': {
      description: 'Application Full-stack (Frontend + Backend)',
      structure: {
        'client/': 'Application frontend React',
        'server/': 'API backend Express',
        'shared/': 'Code partagé (types, utils)',
        'package.json': 'Workspace configuration',
        'README.md': 'Documentation',
      },
      dependencies: [],
      devDependencies: [],
    },
  };

  const structure = structures[projectType];
  
  if (!structure) {
    return {
      success: false,
      error: `Type de projet inconnu: ${projectType}. Types supportés: ${Object.keys(structures).join(', ')}`,
    };
  }

  return {
    success: true,
    data: {
      projectType,
      ...structure,
    },
  };
}

/**
 * Analyse du code pour détecter les problèmes potentiels
 */
export function analyzeCodeQualityTool(content: string, language: string): ToolResult {
  const issues: Array<{ severity: string; type: string; description: string }> = [];
  
  try {
    if (language === 'JavaScript' || language === 'TypeScript') {
      // Vérifier console.log (mauvaise pratique en production)
      if (content.includes('console.log')) {
        issues.push({
          severity: 'low',
          type: 'style',
          description: 'Utilisation de console.log détectée (à retirer en production)',
        });
      }
      
      // Vérifier var (déprécié)
      if (/\bvar\s+/.test(content)) {
        issues.push({
          severity: 'medium',
          type: 'style',
          description: 'Utilisation de "var" détectée (préférer let/const)',
        });
      }
      
      // Vérifier les fonctions trop longues (>50 lignes)
      const functionRegex = /function\s+\w+\s*\([^)]*\)\s*{/g;
      const lines = content.split('\n');
      if (lines.length > 50) {
        issues.push({
          severity: 'low',
          type: 'style',
          description: 'Fichier très long (>50 lignes), considérer de le découper',
        });
      }
    }
    
    // Vérifier les TODOs/FIXMEs
    if (/TODO|FIXME|XXX/.test(content)) {
      issues.push({
        severity: 'low',
        type: 'other',
        description: 'Commentaires TODO/FIXME détectés',
      });
    }
    
    return {
      success: true,
      data: {
        language,
        issuesCount: issues.length,
        issues,
        quality: issues.length === 0 ? 'excellent' : issues.length < 3 ? 'good' : 'fair',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Erreur lors de l'analyse: ${error.message}`,
    };
  }
}
