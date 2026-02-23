import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { configLoader } from '../core/config-loader.js';
import { db, type Project } from '../db/database.js';
import { gitInitTool } from '../tools/git.js';
import { createDirectoryTool, writeFileTool } from '../tools/filesystem.js';

export interface ProjectTemplate {
  name: string;
  description: string;
  structure: Record<string, any>;
  files: Record<string, string>;
}

export class WorkspaceManager {
  private workspacePath: string;

  constructor() {
    this.workspacePath = configLoader.env.workspacePath;
    this.ensureWorkspaceExists();
  }

  /**
   * S'assure que le workspace existe
   */
  private ensureWorkspaceExists(): void {
    if (!existsSync(this.workspacePath)) {
      mkdirSync(this.workspacePath, { recursive: true });
      console.log(`📁 Workspace créé: ${this.workspacePath}`);
    }
  }

  /**
   * Crée un nouveau projet dans le workspace
   */
  async createProject(
    name: string,
    projectType: string,
    template?: ProjectTemplate
  ): Promise<{ projectId: number; path: string }> {
    const projectPath = join(this.workspacePath, name);

    // Vérifier si le projet existe déjà
    if (existsSync(projectPath)) {
      throw new Error(`Le projet "${name}" existe déjà`);
    }

    // Créer le répertoire du projet
    await createDirectoryTool(projectPath);

    // Initialiser Git
    await gitInitTool(projectPath);

    // Appliquer le template si spécifié
    if (template) {
      await this.applyTemplate(projectPath, template);
    }

    // Enregistrer dans la base de données
    const projectId = db.createProject({
      name,
      type: projectType,
      path: projectPath,
      status: 'active',
    });

    console.log(`✅ Projet "${name}" créé avec succès`);

    return { projectId, path: projectPath };
  }

  /**
   * Applique un template à un projet
   */
  private async applyTemplate(
    projectPath: string,
    template: ProjectTemplate
  ): Promise<void> {
    // Créer la structure de répertoires
    await this.createStructure(projectPath, template.structure);

    // Créer les fichiers
    for (const [filepath, content] of Object.entries(template.files)) {
      const fullPath = join(projectPath, filepath);
      await writeFileTool(fullPath, content);
    }
  }

  /**
   * Crée une structure de répertoires récursivement
   */
  private async createStructure(
    basePath: string,
    structure: Record<string, any>
  ): Promise<void> {
    for (const [key, value] of Object.entries(structure)) {
      const path = join(basePath, key);
      
      if (typeof value === 'object') {
        // C'est un répertoire avec sous-structure
        await createDirectoryTool(path);
        await this.createStructure(path, value);
      } else {
        // C'est une description (ignorer)
        await createDirectoryTool(path);
      }
    }
  }

  /**
   * Obtient le template pour un type de projet
   */
  getTemplate(projectType: string): ProjectTemplate | null {
    const templates: Record<string, ProjectTemplate> = {
      'web-react': {
        name: 'React Application',
        description: 'Application React moderne avec Vite et TypeScript',
        structure: {
          'src': {
            'components': {},
            'pages': {},
            'hooks': {},
            'utils': {},
            'styles': {},
          },
          'public': {},
        },
        files: {
          'package.json': JSON.stringify({
            name: 'react-app',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'tsc && vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
            },
            devDependencies: {
              '@types/react': '^18.2.0',
              '@types/react-dom': '^18.2.0',
              '@vitejs/plugin-react': '^4.0.0',
              typescript: '^5.0.0',
              vite: '^5.0.0',
            },
          }, null, 2),
          'tsconfig.json': JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              module: 'ESNext',
              lib: ['ES2020', 'DOM', 'DOM.Iterable'],
              jsx: 'react-jsx',
              strict: true,
              moduleResolution: 'node',
              esModuleInterop: true,
            },
          }, null, 2),
          'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
          'index.html': `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
          'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
          'src/App.tsx': `import React from 'react'

function App() {
  return (
    <div className="app">
      <h1>Welcome to React App</h1>
      <p>Start building your application!</p>
    </div>
  )
}

export default App`,
          'src/styles/index.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}`,
          'README.md': `# React Application

## Installation

\`\`\`bash
npm install
\`\`\`

## Développement

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\``,
        },
      },
      
      'api-express': {
        name: 'Express API',
        description: 'API REST avec Express.js et TypeScript',
        structure: {
          'src': {
            'routes': {},
            'controllers': {},
            'models': {},
            'middlewares': {},
            'utils': {},
            'config': {},
          },
        },
        files: {
          'package.json': JSON.stringify({
            name: 'express-api',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'tsx watch src/index.ts',
              build: 'tsc',
              start: 'node dist/index.js',
            },
            dependencies: {
              express: '^4.18.0',
              cors: '^2.8.5',
              dotenv: '^16.0.0',
            },
            devDependencies: {
              '@types/express': '^4.17.0',
              '@types/cors': '^2.8.0',
              '@types/node': '^20.0.0',
              typescript: '^5.0.0',
              tsx: '^4.0.0',
            },
          }, null, 2),
          'src/index.ts': `import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API is running!' })
})

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`)
})`,
          '.env.example': `PORT=3000
NODE_ENV=development`,
          'README.md': `# Express API

## Installation

\`\`\`bash
npm install
cp .env.example .env
\`\`\`

## Développement

\`\`\`bash
npm run dev
\`\`\``,
        },
      },
    };

    return templates[projectType] || null;
  }

  /**
   * Liste tous les projets du workspace
   */
  listProjects(): Project[] {
    return db.getAllProjects();
  }

  /**
   * Obtient le chemin complet d'un projet
   */
  getProjectPath(projectName: string): string {
    return join(this.workspacePath, projectName);
  }
}

// Instance singleton
export const workspaceManager = new WorkspaceManager();
export default workspaceManager;
