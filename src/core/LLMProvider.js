// Quantyval AI - LLM Providers
// All major LLM providers integrated

import { logger } from '../utils/logger.js';

export class LLMProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
  }

  async complete(prompt, options = {}) {
    throw new Error('complete() must be implemented');
  }

  async *stream(prompt, options = {}) {
    throw new Error('stream() must be implemented');
  }

  buildHeaders(extra = {}) {
    return {
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  buildBody(prompt, options = {}) {
    return {
      model: this.model,
      messages: Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature || this.temperature,
      ...options,
    };
  }
}

// ============ OPENAI ============

export class OpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      model: config.model || 'gpt-4o',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'Authorization': `Bearer ${this.apiKey}` });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`OpenAI Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ ANTHROPIC ============

export class AnthropicProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
      model: config.model || 'claude-sonnet-4-20250514',
    });
  }

  buildHeaders() {
    return super.buildHeaders({
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Anthropic Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  async *stream(prompt, options = {}) {
    // Anthropic streaming - simplified
    const text = await this.complete(prompt, options);
    for (const chunk of text.split('')) {
      yield chunk;
    }
  }
}

// ============ OPENROUTER (Default) ============

export class OpenRouterProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
      model: config.model || 'anthropic/claude-3.5-sonnet',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://quantyval.ai',
      'X-Title': 'Quantyval AI',
    });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`OpenRouter Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ KILOCODE ============

export class KiloCodeProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.kilo.ai/api/gateway',
      model: config.model || 'kilo-auto/free',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'Authorization': `Bearer ${this.apiKey}` });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      throw new Error(`KiloCode Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || data.response || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      yield line.toString();
    }
  }
}

// ============ OLLAMA ============

export class OllamaProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'http://localhost:11434/api',
      model: config.model || 'llama3',
    });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        prompt: Array.isArray(prompt) ? prompt[prompt.length - 1]?.content : prompt,
        stream: false,
        options: {
          temperature: options.temperature || this.temperature,
          num_predict: options.maxTokens || this.maxTokens,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.response || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        prompt: Array.isArray(prompt) ? prompt[prompt.length - 1]?.content : prompt,
        stream: true,
      }),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text) {
        try {
          const data = JSON.parse(text);
          if (data.response) yield data.response;
        } catch {}
      }
    }
  }
}

// ============ GROQ ============

export class GroqProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      model: config.model || 'llama-3.1-70b-versatile',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'Authorization': `Bearer ${this.apiKey}` });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Groq Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ NVIDIA NIM ============

export class NvidiaNIMProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://integrate.api.nvidia.com/v1',
      model: config.model || 'nvidia/llama-3.1-nemotron-70b-instruct',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'Authorization': `Bearer ${this.apiKey}` });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Nvidia Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ AZURE OPENAI ============

export class AzureOpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || `https://${config.resourceName || 'your-resource'}.openai.azure.com/openai/deployments/${config.deploymentName || 'gpt-4'}/`,
      model: config.model || 'gpt-4',
      apiVersion: config.apiVersion || '2024-02-15',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'api-key': this.apiKey });
  }

  getUrl(path) {
    return `${this.baseUrl}${path}?api-version=${this.apiVersion}`;
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(this.getUrl('chat/completions'), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      throw new Error(`Azure Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(this.getUrl('chat/completions'), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ GOOGLE GEMINI ============

export class GeminiProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      model: config.model || 'gemini-2.0-flash',
    });
  }

  buildHeaders() {
    return super.buildHeaders();
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const contents = Array.isArray(prompt) ? prompt.map(m => ({
      role: m.role === 'system' ? 'model' : m.role,
      parts: [{ text: m.content }],
    })) : [{ parts: [{ text: prompt }] }];

    const res = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature || this.temperature,
          maxOutputTokens: options.maxTokens || this.maxTokens,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async *stream(prompt, options = {}) {
    // Gemini streaming - simplified
    const text = await this.complete(prompt, options);
    for (const chunk of text.split('')) {
      yield chunk;
    }
  }
}

// ============ META LLAMA (via any API) ============

// Uses OpenRouter or other providers - just an alias

// ============ MISTRAL ============

export class MistralProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.mistral.ai/v1',
      model: config.model || 'mistral-large-latest',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'Authorization': `Bearer ${this.apiKey}` });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      throw new Error(`Mistral Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ COHERE ============

export class CohereProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.cohere.ai/v1',
      model: config.model || 'command-r-plus',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 'Authorization': `Bearer ${this.apiKey}` });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const text = Array.isArray(prompt) 
      ? prompt.map(m => m.content).join('\n') 
      : prompt;

    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        prompt: text,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
      }),
    });

    if (!res.ok) {
      throw new Error(`Cohere Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.text || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const text = Array.isArray(prompt) 
      ? prompt.map(m => m.content).join('\n') 
      : prompt;

    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        prompt: text,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        stream: true,
      }),
    });

    for await (const line of res.body) {
      const data = JSON.parse(line.toString());
      if (data.text) yield data.text;
    }
  }
}

// ============ 9ROUTER ============

export class NineRouterProvider extends LLMProvider {
  constructor(config = {}) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'http://localhost:20128/v1',
      model: config.model || 'if/kimi-k2-thinking',
    });
  }

  buildHeaders() {
    return super.buildHeaders({ 
      'Authorization': `Bearer ${this.apiKey || '9router-api-key'}`,
    });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(prompt, options)),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`9Router Error: ${res.status} - ${err.slice(0,200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const body = { ...this.buildBody(prompt, options), stream: true };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text.startsWith('data: ') && !text.includes('[DONE]')) {
        const chunk = JSON.parse(text.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// ============ PROVIDER FACTORY ============

const PROVIDERS = {
  openai: { class: OpenAIProvider, defaultModel: 'gpt-4o' },
  anthropic: { class: AnthropicProvider, defaultModel: 'claude-sonnet-4-20250514' },
  openrouter: { class: OpenRouterProvider, defaultModel: 'anthropic/claude-3.5-sonnet' },
  kilocode: { class: KiloCodeProvider, defaultModel: 'kilo-auto/free' },
  ollama: { class: OllamaProvider, defaultModel: 'llama3' },
  groq: { class: GroqProvider, defaultModel: 'llama-3.1-70b-versatile' },
  nvidia: { class: NvidiaNIMProvider, defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  azure: { class: AzureOpenAIProvider, defaultModel: 'gpt-4' },
  gemini: { class: GeminiProvider, defaultModel: 'gemini-2.0-flash' },
  mistral: { class: MistralProvider, defaultModel: 'mistral-large-latest' },
  cohere: { class: CohereProvider, defaultModel: 'command-r-plus' },
  '9router': { class: NineRouterProvider, defaultModel: 'if/kimi-k2-thinking' },
};

export function createProvider(type, config = {}) {
  const provider = PROVIDERS[type?.toLowerCase()];
  if (!provider) {
    throw new Error(`Unknown provider: ${type}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  
  // Set default model if not provided
  if (!config.model) {
    config.model = provider.defaultModel;
  }
  
  return new provider.class(config);
}

// Get available providers
export function getProviders() {
  return Object.keys(PROVIDERS);
}

// Get default config
export function getDefaultProvider() {
  return { type: 'openrouter', model: 'anthropic/claude-3.5-sonnet' };
}