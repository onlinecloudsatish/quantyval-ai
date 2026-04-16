// Quantyval AI - LLM Providers
// OpenAI, Anthropic, OpenRouter, KiloCode, and more

export class LLMProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  async complete(prompt, options = {}) {
    throw new Error('complete() must be implemented');
  }

  async stream(prompt, onChunk, options = {}) {
    throw new Error('stream() must be implemented');
  }

  buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
}

// OpenAI Provider
export class OpenAIProvider extends LLMProvider {
  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        ...options,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        ...options,
      }),
    });

    for await (const line of res.body) {
      if (line.startsWith('data: ')) {
        const chunk = line.slice(6);
        if (chunk !== '[DONE]') {
          const data = JSON.parse(chunk);
          const text = data.choices?.[0]?.delta?.content;
          if (text) yield text;
        }
      }
    }
  }
}

// Anthropic Provider
export class AnthropicProvider extends LLMProvider {
  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(),
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 4096,
      }),
    });

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  async *stream(prompt, options = {}) {
    // Anthropic streaming - TODO
    yield* this.complete(prompt, options);
  }
}

// OpenRouter Provider
export class OpenRouterProvider extends LLMProvider {
  constructor(config) {
    super({ ...config, baseUrl: 'https://openrouter.ai/api' });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(),
        'HTTP-Referer': 'https://quantyval.ai',
        'X-Title': 'Quantyval AI',
      },
      body: JSON.stringify({
        model: this.model || 'openai/gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        ...options,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// KiloCode Provider (your current provider)
export class KiloCodeProvider extends LLMProvider {
  constructor(config) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.kilo.ai/api/gateway',
      model: config.model || 'kilo-auto/free',
    });
  }

  async complete(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        ...options,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || data.response || '';
  }

  async *stream(prompt, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        ...options,
      }),
    });

    for await (const line of res.body) {
      const text = line.toString();
      if (text) yield text;
    }
  }
}

// Provider factory
export function createProvider(type, config) {
  const providers = {
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    openrouter: OpenRouterProvider,
    kilocode: KiloCodeProvider,
  };

  const Provider = providers[type];
  if (!Provider) throw new Error(`Unknown provider: ${type}`);
  
  return new Provider(config);
}