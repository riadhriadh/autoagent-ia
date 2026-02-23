import { Ollama } from 'ollama';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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

export type LLMProvider = 'ollama' | 'openai' | 'claude' | 'azure';

/**
 * Interface pour les providers LLM
 */
interface ILLMProvider {
  generate(prompt: string, options: LLMOptions): Promise<LLMResponse>;
  chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options: LLMOptions): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
}

/**
 * Provider pour Ollama (LLM local)
 */
class OllamaProvider implements ILLMProvider {
  private ollama: Ollama;
  private modelName: string;

  constructor(baseUrl: string, modelName: string) {
    this.ollama = new Ollama({ host: baseUrl });
    this.modelName = modelName;
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 2048, systemPrompt } = options;

    const response = await this.ollama.generate({
      model: this.modelName,
      prompt,
      system: systemPrompt,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    });

    return {
      content: response.response,
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 2048 } = options;

    const response = await this.ollama.chat({
      model: this.modelName,
      messages,
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
  }

  async isAvailable(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      return models.models.some((model) => model.name.includes(this.modelName));
    } catch {
      return false;
    }
  }
}

/**
 * Provider pour OpenAI (GPT-3.5, GPT-4, etc.)
 */
class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string, baseUrl?: string) {
    this.client = new OpenAI({ 
      apiKey,
      baseURL: baseUrl,
    });
    this.modelName = modelName;
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 2048, systemPrompt } = options;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 2048 } = options;

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Provider pour Claude (Anthropic)
 */
class ClaudeProvider implements ILLMProvider {
  private client: Anthropic;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.client = new Anthropic({ apiKey });
    this.modelName = modelName;
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 2048, systemPrompt } = options;

    // Formatter le prompt pour Claude (ancienne API)
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\n${Anthropic.HUMAN_PROMPT} ${prompt}${Anthropic.AI_PROMPT}`
      : `${Anthropic.HUMAN_PROMPT} ${prompt}${Anthropic.AI_PROMPT}`;

    const response = await this.client.completions.create({
      model: this.modelName,
      max_tokens_to_sample: maxTokens,
      temperature,
      prompt: fullPrompt,
    });

    return {
      content: response.completion.trim(),
      usage: {
        promptTokens: 0, // Non fourni par l'API Completions
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 2048 } = options;

    // Construire le prompt au format Claude
    let prompt = '';
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += `${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        prompt += `${Anthropic.HUMAN_PROMPT} ${msg.content}`;
      } else if (msg.role === 'assistant') {
        prompt += `${Anthropic.AI_PROMPT} ${msg.content}`;
      }
    }
    prompt += Anthropic.AI_PROMPT;

    const response = await this.client.completions.create({
      model: this.modelName,
      max_tokens_to_sample: maxTokens,
      temperature,
      prompt,
    });

    return {
      content: response.completion.trim(),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Tester avec un prompt simple
      await this.client.completions.create({
        model: this.modelName,
        max_tokens_to_sample: 10,
        prompt: `${Anthropic.HUMAN_PROMPT} test${Anthropic.AI_PROMPT}`,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Wrapper principal qui gère tous les providers LLM
 */
export class LLMWrapper {
  private provider: ILLMProvider;
  private providerType: LLMProvider;
  private modelName: string;
  private cache: Map<string, LLMResponse>;
  private cacheEnabled: boolean;

  constructor() {
    this.providerType = (process.env.LLM_PROVIDER as LLMProvider) || 'ollama';
    this.modelName = this.getModelName();
    this.provider = this.createProvider();
    this.cache = new Map();
    this.cacheEnabled = configLoader.agentConfig.enableLLMCache;
  }

  private getModelName(): string {
    switch (this.providerType) {
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      case 'claude':
        return process.env.CLAUDE_MODEL || 'claude-2.1';
      case 'azure':
        return process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
      case 'ollama':
      default:
        return configLoader.env.ollamaModel;
    }
  }

  private createProvider(): ILLMProvider {
    switch (this.providerType) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY non définie');
        }
        return new OpenAIProvider(
          process.env.OPENAI_API_KEY,
          this.modelName,
          process.env.OPENAI_BASE_URL
        );

      case 'claude':
        if (!process.env.CLAUDE_API_KEY) {
          throw new Error('CLAUDE_API_KEY non définie');
        }
        return new ClaudeProvider(
          process.env.CLAUDE_API_KEY,
          this.modelName
        );

      case 'azure':
        if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
          throw new Error('AZURE_OPENAI_API_KEY et AZURE_OPENAI_ENDPOINT requis');
        }
        return new OpenAIProvider(
          process.env.AZURE_OPENAI_API_KEY,
          this.modelName,
          process.env.AZURE_OPENAI_ENDPOINT
        );

      case 'ollama':
      default:
        return new OllamaProvider(
          configLoader.env.ollamaBaseUrl,
          this.modelName
        );
    }
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
      const llmResponse = await this.provider.generate(prompt, {
        temperature,
        maxTokens,
        systemPrompt,
      });

      // Mettre en cache si activé
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, llmResponse);
        
        // Limiter la taille du cache à 100 entrées
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) {
            this.cache.delete(firstKey);
          }
        }
      }

      return llmResponse;
    } catch (error) {
      throw new Error(`Erreur lors de la génération LLM (${this.providerType}): ${error}`);
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
      return await this.provider.chat(messages, {
        temperature,
        maxTokens,
      });
    } catch (error) {
      throw new Error(`Erreur lors du chat LLM (${this.providerType}): ${error}`);
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
      return await this.provider.isAvailable();
    } catch (error) {
      return false;
    }
  }

  /**
   * Liste les modèles disponibles (pour Ollama uniquement)
   */
  async listModels(): Promise<string[]> {
    if (this.providerType !== 'ollama') {
      throw new Error('listModels() est disponible uniquement pour Ollama');
    }
    
    try {
      const ollamaProvider = this.provider as OllamaProvider;
      const ollama = (ollamaProvider as any).ollama;
      const models = await ollama.list();
      return models.models.map((model: any) => model.name);
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
    return `${this.providerType}_${this.modelName}_${prompt}_${options.temperature}_${options.maxTokens}_${options.systemPrompt}`;
  }

  /**
   * Change le provider et le modèle
   */
  setProvider(provider: LLMProvider, modelName: string): void {
    this.providerType = provider;
    this.modelName = modelName;
    this.provider = this.createProvider();
    this.clearCache();
  }

  /**
   * Obtient des informations sur le provider actuel
   */
  getProviderInfo() {
    return {
      provider: this.providerType,
      model: this.modelName,
      cacheSize: this.cache.size,
      cacheEnabled: this.cacheEnabled,
    };
  }
}

// Exporter une instance singleton
export const llm = new LLMWrapper();
export default llm;
