import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/database.js';
import { AutonomousAgent } from './core/agent.js';
import { llm } from './core/llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types pour la session
declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
  }
}

interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Serveur web pour l'interface utilisateur de l'agent IA
 */
export class WebServer {
  private app: express.Application;
  private port: number;
  private agent: AutonomousAgent | null = null;
  private credentials: AuthCredentials;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.WEB_PORT || '3000', 10);
    
    // Charger les credentials depuis .env
    this.credentials = {
      username: process.env.WEB_USERNAME || 'admin',
      password: process.env.WEB_PASSWORD || 'admin123',
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure les middlewares
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.WEB_CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Parse JSON
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Session
    this.app.use(session({
      secret: process.env.WEB_SESSION_SECRET || 'autoagent-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
      },
    }));

    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  /**
   * Middleware d'authentification
   */
  private requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (req.session.authenticated) {
      next();
    } else {
      res.status(401).json({ error: 'Non authentifié' });
    }
  }

  /**
   * Configure les routes
   */
  private setupRoutes(): void {
    // Page de login
    this.app.get('/', (req, res) => {
      if (req.session.authenticated) {
        res.sendFile(path.join(__dirname, '../public/dashboard.html'));
      } else {
        res.sendFile(path.join(__dirname, '../public/login.html'));
      }
    });

    // API - Login
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username et password requis' });
        }

        // Vérifier les credentials
        if (username === this.credentials.username && password === this.credentials.password) {
          req.session.authenticated = true;
          req.session.username = username;
          res.json({ success: true, message: 'Authentifié avec succès' });
        } else {
          res.status(401).json({ error: 'Identifiants incorrects' });
        }
      } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Logout
    this.app.post('/api/auth/logout', (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        } else {
          res.json({ success: true });
        }
      });
    });

    // API - Vérifier session
    this.app.get('/api/auth/check', (req, res) => {
      res.json({
        authenticated: req.session.authenticated || false,
        username: req.session.username,
      });
    });

    // API - Statut de l'agent
    this.app.get('/api/status', this.requireAuth.bind(this), (req, res) => {
      try {
        const tasks = this.db.getAllTasks();_req, res) => {
      try {
        const tasks = db.getAllTasks();
        const projects = db.getAllProjects();
        const providerInfo = llm.getProviderInfo();

        res.json({
          tasks: {
            total: tasks.length,
            pending: tasks.filter((t: any) => t.status === 'pending').length,
            inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
            completed: tasks.filter((t: any) => t.status === 'completed').length,
            failed: tasks.filter((t: any)
            total: projects.length,
          },
          llm: providerInfo,
          uptime: process.uptime(),
        });
      } catch (error) {
        console.error('Erreur status:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Liste des tâches
    this.app.get('/api/tasks', this.requireAuth.bind(this), (req, res) => {
      try {
        const status = req.query.status as string | undefined;
        const tasks = status 
          ? db.getTasksByStatus(status)
          : db.getAllTasks();
        
        res.json({ tasks });
      } catch (error) {
        console.error('Erreur tasks:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Détails d'une tâche
    this.app.get('/api/tasks/:id', this.requireAuth.bind(this), (req, res) => {
      try {
        const taskId = parseInt(req.params.id, 10);
        const task = db.getTask(taskId);
        
        if (!task) {
          return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        const logs = db.getTaskLogs(taskId);
        res.json({ task, logs });
      } catch (error) {
        console.error('Erreur task details:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Créer une tâche
    this.app.post('/api/tasks', this.requireAuth.bind(this), async (req, res) => {
      try {
        const { title, description, priority } = req.body;

        if (!title || !description) {
          return res.status(400).json({ error: 'Title et description requis' });
        }

        const taskId = db.createTask({
          title,
          description,
          status: 'pending',
          priority: priority || 'normal',
          metadata: JSON.stringify({
            createdBy: req.session.username,
            createdVia: 'web',
          }),
        });

        // Exécuter la tâche automatiquement si l'agent est disponible
        if (this.agent) {
          this.executeTaskAsync(taskId, description);
        }

        res.json({ 
          success: true, 
          taskId,
          message: 'Tâche créée avec succès' 
        });
      } catch (error) {
        console.error('Erreur create task:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Liste des projets
    this.app.get('/api/projects', this.requireAuth.bind(this), (_req, res) => {
      try {
        const projects = db.getAllProjects();
        res.json({ projects });
      } catch (error) {
        console.error('Erreur projects:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Approbations en attente
    this.app.get('/api/approvals', this.requireAuth.bind(this), (_req, res) => {
      try {
        const approvals = db.getPendingApprovals();
        res.json({ approvals });
      } catch (error) {
        console.error('Erreur approvals:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Approuver une action
    this.app.post('/api/approvals/:id/approve', this.requireAuth.bind(this), (req, res) => {
      try {
        const approvalId = parseInt(req.params.id, 10);
        db.updateApprovalStatus(approvalId, 'approved', req.session.username);
        res.json({ success: true, message: 'Action approuvée' });
      } catch (error) {
        console.error('Erreur approve:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Refuser une action
    this.app.post('/api/approvals/:id/reject', this.requireAuth.bind(this), (req, res) => {
      try {
        const approvalId = parseInt(req.params.id, 10);
        db.updateApprovalStatus(approvalId, 'rejected', req.session.username);
        res.json({ success: true, message: 'Action refusée' });
      } catch (error) {
        console.error('Erreur reject:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // API - Logs
    this.app.get('/api/logs', this.requireAuth.bind(this), (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string || '100', 10);
        const logs = db.getAllActionLogs(limit);
        res.json({ logs });
      } catch (error) {
        console.error('Erreur logs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // 404
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Route non trouvée' });
    });
  }

  /**
   * Exécute une tâche en arrière-plan
   */
  private async executeTaskAsync(taskId: number, description: string): Promise<void> {
    try {
      if (!this.agent) {
        console.error('Agent non initialisé');
        return;
      }

      db.updateTask(taskId, { status: 'in_progress' });
      
      await this.agent.executeTask(description);
      
      db.updateTask(taskId, { 
        status: 'completed',
        metadata: JSON.stringify({ completedVia: 'web' }),
      });
    } catch (error) {
      console.error('Erreur execution task:', error);
      db.updateTask(taskId, { 
        status: 'failed',
        metadata: JSON.stringify({ error: String(error) }),
      });
    }
  }

  /**
   * Configure l'agent
   */
  setAgent(agent: AutonomousAgent): void {
    this.agent = agent;
  }

  /**
   * Démarre le serveur
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`\n🌐 Interface Web disponible sur:`);
        console.log(`   http://localhost:${this.port}`);
        console.log(`\n🔐 Credentials:`);
        console.log(`   Username: ${this.credentials.username}`);
        console.log(`   Password: ${this.credentials.password}`);
        console.log(`\n💡 Conseil: Changez ces valeurs dans .env pour plus de sécurité!\n`);
        resolve();
      });
    });
  }
}

// Point d'entrée si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new WebServer();
  
  // Initialiser l'agent
  const agent = new AutonomousAgent();
  server.setAgent(agent);
  
  server.start().catch(console.error);
}

export default WebServer;
