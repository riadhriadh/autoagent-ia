import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { configLoader } from '../core/config-loader.js';

export interface Task {
  id?: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
  projectId?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  priority: 'low' | 'medium' | 'high';
  metadata?: string; // JSON
}

export interface Project {
  id?: number;
  name: string;
  type: string;
  path: string;
  status: 'active' | 'completed' | 'archived';
  createdAt?: string;
  metadata?: string; // JSON
}

export interface ActionLog {
  id?: number;
  taskId?: number;
  tool: string;
  action: string;
  parameters: string; // JSON
  result: string; // JSON
  approved: boolean;
  approvedBy?: string;
  timestamp?: string;
}

export interface Approval {
  id?: number;
  taskId: number;
  action: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
  respondedAt?: string;
  respondedBy?: string;
}

export class Database Manager {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || configLoader.env.dbPath;
    
    // Créer le répertoire si nécessaire
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(path);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Table des tâches
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        project_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        priority TEXT DEFAULT 'medium',
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // Table des projets
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // Table des logs d'actions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        tool TEXT NOT NULL,
        action TEXT NOT NULL,
        parameters TEXT,
        result TEXT,
        approved INTEGER DEFAULT 0,
        approved_by TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `);

    // Table des approbations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
        responded_at TEXT,
        responded_by TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `);

    // Table de la mémoire (pour l'agent)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        category TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index pour les recherches fréquentes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
      CREATE INDEX IF NOT EXISTS idx_action_logs_task ON action_logs(task_id);
    `);
  }

  // === TASKS ===

  createTask(task: Task): number {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (title, description, status, project_id, priority, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      task.title,
      task.description,
      task.status,
      task.projectId,
      task.priority,
      task.metadata ? JSON.stringify(task.metadata) : null
    );
    
    return result.lastInsertRowid as number;
  }

  getTask(id: number): Task | undefined {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id) as Task | undefined;
  }

  updateTask(id: number, updates: Partial<Task>): void {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values, id);
  }

  getAllTasks(status?: string): Task[] {
    const stmt = status
      ? this.db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
      : this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    
    return (status ? stmt.all(status) : stmt.all()) as Task[];
  }

  // === PROJECTS ===

  createProject(project: Project): number {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, type, path, status, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      project.name,
      project.type,
      project.path,
      project.status || 'active',
      project.metadata ? JSON.stringify(project.metadata) : null
    );
    
    return result.lastInsertRowid as number;
  }

  getProject(id: number): Project | undefined {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as Project | undefined;
  }

  getAllProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    return stmt.all() as Project[];
  }

  // === ACTION LOGS ===

  logAction(log: ActionLog): number {
    const stmt = this.db.prepare(`
      INSERT INTO action_logs (task_id, tool, action, parameters, result, approved, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      log.taskId,
      log.tool,
      log.action,
      log.parameters,
      log.result,
      log.approved ? 1 : 0,
      log.approvedBy
    );
    
    return result.lastInsertRowid as number;
  }

  getActionLogs(taskId?: number, limit: number = 100): ActionLog[] {
    const stmt = taskId
      ? this.db.prepare('SELECT * FROM action_logs WHERE task_id = ? ORDER BY timestamp DESC LIMIT ?')
      : this.db.prepare('SELECT * FROM action_logs ORDER BY timestamp DESC LIMIT ?');
    
    return (taskId ? stmt.all(taskId, limit) : stmt.all(limit)) as ActionLog[];
  }

  // === APPROVALS ===

  createApproval(approval: Approval): number {
    const stmt = this.db.prepare(`
      INSERT INTO approvals (task_id, action, description, status)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      approval.taskId,
      approval.action,
      approval.description,
      approval.status || 'pending'
    );
    
    return result.lastInsertRowid as number;
  }

  updateApproval(id: number, status: 'approved' | 'rejected', respondedBy: string): void {
    const stmt = this.db.prepare(`
      UPDATE approvals 
      SET status = ?, responded_at = CURRENT_TIMESTAMP, responded_by = ?
      WHERE id = ?
    `);
    
    stmt.run(status, respondedBy, id);
  }

  getPendingApprovals(): Approval[] {
    const stmt = this.db.prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY requested_at ASC");
    return stmt.all() as Approval[];
  }

  getApproval(id: number): Approval | undefined {
    const stmt = this.db.prepare('SELECT * FROM approvals WHERE id = ?');
    return stmt.get(id) as Approval | undefined;
  }

  // === MEMORY ===

  setMemory(key: string, value: any, category?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory (key, value, category, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(key, JSON.stringify(value), category);
  }

  getMemory(key: string): any {
    const stmt = this.db.prepare('SELECT value FROM memory WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result ? JSON.parse(result.value) : undefined;
  }

  deleteMemory(key: string): void {
    const stmt = this.db.prepare('DELETE FROM memory WHERE key = ?');
    stmt.run(key);
  }

  // === UTILITIES ===

  close(): void {
    this.db.close();
  }

  clearAllData(): void {
    this.db.exec('DELETE FROM tasks');
    this.db.exec('DELETE FROM projects');
    this.db.exec('DELETE FROM action_logs');
    this.db.exec('DELETE FROM approvals');
    this.db.exec('DELETE FROM memory');
  }
}

// Instance singleton
export const db = new DatabaseManager();
export default db;
