// Quantyval AI - 9Router Integration
// Use 9Router as smart routing proxy for LLM calls

import { logger } from '../utils/logger.js';

export class NineRouterIntegration {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:20128/v1';
    this.apiKey = options.apiKey || '9router-api-key';
    this.enabled = options.enabled !== false;
    this.fallbackProviders = [
      { type: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
      { type: '9router', model: 'if/kimi-k2-thinking' },
      { type: 'kilocode', model: 'kilo-auto/free' },
    ];
    this.currentProvider = 0;
  }
  
  // Check if 9Router is available
  async checkHealth() {
    try {
      const { default: fetch } = await import('node-fetch');
      const res = await fetch(`${this.baseUrl.replace('/v1', '')}/health`, { 
        method: 'GET',
        timeout: 3000 
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
  
  // Get available models from 9Router
  async getModels() {
    try {
      const { default: fetch } = await import('node-fetch');
      const res = await fetch(`${this.baseUrl}/models`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      logger.warn(`9Router models fetch failed: ${e.message}`);
      return [];
    }
  }
  
  // Smart completion with auto-fallback
  async complete(prompt, options = {}) {
    if (!this.enabled) {
      throw new Error('9Router integration not enabled');
    }
    
    const provider = this.fallbackProviders[this.currentProvider];
    logger.info(`Using provider: ${provider.type}/${provider.model}`);
    
    try {
      // Try current provider
      const result = await this.callProvider(provider, prompt, options);
      return result;
    } catch (e) {
      logger.warn(`Provider ${provider.type} failed: ${e.message}`);
      
      // Try fallback providers
      for (let i = 0; i < this.fallbackProviders.length; i++) {
        if (i === this.currentProvider) continue;
        
        try {
          this.currentProvider = i;
          const fallback = this.fallbackProviders[i];
          logger.info(`Falling back to: ${fallback.type}/${fallback.model}`);
          return await this.callProvider(fallback, prompt, options);
        } catch (err) {
          logger.warn(`Fallback ${fallback.type} also failed: ${err.message}`);
        }
      }
      
      throw new Error('All providers failed');
    }
  }
  
  // Call provider directly (via 9Router proxy or direct)
  async callProvider(provider, prompt, options) {
    const { default: fetch } = await import('node-fetch');
    
    // Build request based on provider type
    const requestBody = {
      model: provider.model,
      messages: Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    };
    
    // Try via 9Router first
    if (this.enabled) {
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (res.ok) {
          const data = await res.json();
          return data.choices?.[0]?.message?.content || '';
        }
      } catch (e) {
        // 9Router failed, fall through to direct
      }
    }
    
    // Direct provider call would go here (for providers with direct API)
    throw new Error(`Provider ${provider.type} not available`);
  }
  
  // Stream completion
  async *streamComplete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const requestBody = {
      model: this.fallbackProviders[this.currentProvider].model,
      messages: Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }],
      stream: true,
      ...options,
    };
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
  
  // Get quota info (from 9Router dashboard)
  async getQuota() {
    try {
      const { default: fetch } = await import('node-fetch');
      const res = await fetch(`${this.baseUrl.replace('/v1', '')}/quota`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }
}

// Create integration
export function createNineRouterIntegration(options = {}) {
  return new NineRouterIntegration(options);
}

// Quick test
export async function testNineRouter() {
  const integration = new NineRouterIntegration();
  
  console.log('🧪 Testing 9Router...');
  
  // Check health
  const healthy = await integration.checkHealth();
  console.log(`Health: ${healthy ? '✅ OK' : '❌ Not running (start with: 9router)'}`);
  
  // Get models
  if (healthy) {
    const models = await integration.getModels();
    console.log(`Models available: ${models.length}`);
  }
  
  return integration;
}