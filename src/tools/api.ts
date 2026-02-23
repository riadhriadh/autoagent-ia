import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { securityManager } from '../core/security.js';
import type { ToolResult } from './filesystem.js';

export interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// Rate limiter simple
class RateLimiter {
  private requests: number[] = [];
  private readonly maxPerMinute: number;
  private readonly maxPerHour: number;

  constructor(maxPerMinute: number, maxPerHour: number) {
    this.maxPerMinute = maxPerMinute;
    this.maxPerHour = maxPerHour;
  }

  canMakeRequest(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Nettoyer les anciennes requêtes
    this.requests = this.requests.filter((time) => time > oneHourAgo);

    const requestsLastMinute = this.requests.filter((time) => time > oneMinuteAgo).length;
    const requestsLastHour = this.requests.length;

    if (requestsLastMinute >= this.maxPerMinute) {
      return {
        allowed: false,
        reason: `Limite de ${this.maxPerMinute} requêtes/minute atteinte`,
      };
    }

    if (requestsLastHour >= this.maxPerHour) {
      return {
        allowed: false,
        reason: `Limite de ${this.maxPerHour} requêtes/heure atteinte`,
      };
    }

    return { allowed: true };
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

// Instance du rate limiter
const rateLimiter = new RateLimiter(60, 1000);

/**
 * Outil pour faire un appel API HTTP
 */
export async function makeApiCallTool(
  url: string,
  options: ApiCallOptions = {}
): Promise<ToolResult> {
  try {
    // Valider l'appel API
    const validation = securityManager.validateApiCall(url);
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

    // Vérifier le rate limiting
    const rateLimitCheck = rateLimiter.canMakeRequest();
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.reason,
      };
    }

    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
    } = options;

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'User-Agent': 'AutoAgent-IA/1.0',
        ...headers,
      },
      timeout,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = body;
      
      // Ajouter Content-Type si non spécifié
      if (!headers['Content-Type']) {
        config.headers!['Content-Type'] = 'application/json';
      }
    }

    // Enregistrer la requête pour le rate limiting
    rateLimiter.recordRequest();

    const response: AxiosResponse = await axios(config);
    
    return {
      success: true,
      data: {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Erreur lors de l'appel API: ${error.message}`,
      data: {
        url,
        method: options.method || 'GET',
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: error.response?.data,
      },
    };
  }
}

/**
 * Outil pour télécharger un fichier depuis une URL
 */
export async function downloadFileTool(
  url: string,
  destinationPath: string
): Promise<ToolResult> {
  try {
    // Valider l'appel API
    const apiValidation = securityManager.validateApiCall(url);
    if (!apiValidation.allowed) {
      return {
        success: false,
        error: apiValidation.reason,
      };
    }

    // Valider le chemin de destination
    const pathValidation = securityManager.validateFilePath(destinationPath);
    if (!pathValidation.allowed) {
      return {
        success: false,
        error: pathValidation.reason,
      };
    }

    // Vérifier le rate limiting
    const rateLimitCheck = rateLimiter.canMakeRequest();
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.reason,
      };
    }

    rateLimiter.recordRequest();

    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      timeout: 60000, // 1 minute pour les téléchargements
    });

    // Valider la taille
    const sizeValidation = securityManager.validateFileSize(response.data.length);
    if (!sizeValidation.allowed) {
      return {
        success: false,
        error: sizeValidation.reason,
      };
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Créer le répertoire parent si nécessaire
    const dir = path.dirname(destinationPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(destinationPath, response.data);
    
    return {
      success: true,
      data: {
        url,
        path: destinationPath,
        size: response.data.length,
        contentType: response.headers['content-type'],
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Erreur lors du téléchargement: ${error.message}`,
    };
  }
}

/**
 * Outil pour vérifier si une URL est accessible
 */
export async function checkUrlTool(url: string): Promise<ToolResult> {
  try {
    const response = await axios.head(url, { timeout: 10000 });
    
    return {
      success: true,
      data: {
        url,
        accessible: true,
        status: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `URL non accessible: ${error.message}`,
      data: {
        url,
        accessible: false,
        status: error.response?.status,
      },
    };
  }
}
