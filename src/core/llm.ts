import { Ollama } from 'ollama';
import { configLoader } from './config-loader.js';

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Wrapper pour Ollama qui gère la communication avec le LLM local
 */
export class LLMWrapper {
  private ollama: Ollama;
  private modelName: string;
  private cache: Map<string, LLMResponse>;
  private cacheEnabled: boolean;

  constructor() {
    this.ollama = new Ollama({
      host: configLoader.env.ollamaBaseUrl,
    });
    this.modelName = configLoader.env.ollamaModel;
    this.cache = new Map();
    this.cacheEnabled = configLoader.agentConfig.enableLLMCache;
  }

  /**
   * Génère une réponse du LLM
   */
  async generate(
    prompt: string,
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const {
      temperature = configLoader.env.llmTemperature,
      maxTokens = configLoader.env.llmMaxTokens,
      systemPrompt,
    } = options;

    // Vérifier le cache
    const cacheKey = this.getCacheKey(prompt, options);
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await this.ollama.generate({
        model: this.modelName,
        prompt: prompt,
        system: systemPrompt,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      });

      const llmResponse: LLMResponse = {
        content: response.response,
        usage: {
          promptTokens: response.prompt_eval_count || 0,
          completionTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
        },
      };

      // Mettre en cache si activé
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, llmResponse);
        
        // Limiter la taille du cache à 100 entrées
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      return llmResponse;
    } catch (error) {
      throw new Error(`Erreur lors de la génération LLM: ${error}`);
    }
  }

  /**
   * Génère une réponse en mode chat (avec historique)
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const {
      temperature = configLoader.env.llmTemperature,
      maxTokens = configLoader.env.llmMaxTokens,
    } = options;

    try {
      const response = await this.ollama.chat({
        model: this.modelName,
        messages: messages,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      });

      return {
        content: response.message.content,
        usage: {
          promptTokens: response.prompt_eval_count || 0,
          completionTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
        },
      };
    } catch (error) {
      throw new Error(`Erreur lors du chat LLM: ${error}`);
    }
  }

  /**
   * Parse une réponse JSON du LLM
   */
  async generateJSON<T = any>(
    prompt: string,
    options: LLMOptions = {}
  ): Promise<T> {
    const response = await this.generate(prompt, options);
    
    try {
      // Extraire le JSON de la réponse (parfois le LLM ajoute du texte autour)
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }
      
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      throw new Error(`Erreur lors du parsing JSON: ${error}\nRéponse: ${response.content}`);
    }
  }

  /**
   * Vérifie si le modèle est disponible
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      return models.models.some((model) => model.name.includes(this.modelName));
    } catch (error) {
      return false;
    }
  }

  /**
   * Liste les modèles disponibles
   */
  async listModels(): Promise<string[]> {
    try {
      const models = await this.ollama.list();
      return models.models.map((model) => model.name);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des modèles: ${error}`);
    }
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Génère une clé de cache unique
   */
  private getCacheKey(prompt: string, options: LLMOptions): string {
    return `${prompt}_${options.temperature}_${options.maxTokens}_${options.systemPrompt}`;
  }

  /**
   * Change le modèle utilisé
   */
  setModel(modelName: string): void {
    this.modelName = modelName;
    this.clearCache(); // Vider le cache lors du changement de modèle
  }

  /**
   * Obtient des statistiques sur l'utilisation
   */
  getStats() {
    return {
      modelName: this.modelName,
      cacheSize: this.cache.size,
      cacheEnabled: this.cacheEnabled,
    };
  }
}

// Exporter une instance singleton
export const llm = new LLMWrapper();
export default llm;
