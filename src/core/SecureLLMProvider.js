// Quantyval AI - Secure LLM Providers
// With input validation, output sanitization

export class SecureLLMProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.maxInputTokens = config.maxInputTokens || 100000;
    this.maxOutputTokens = config.maxOutputTokens || 4096;
  }

  // Validate and sanitize input
  sanitizeInput(input) {
    if (!input) return '';
    
    // Convert to string
    let sanitized = Array.isArray(input) 
      ? JSON.stringify(input) 
      : String(input);
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove prompt injection patterns
    const injection = [
      /ignore\s+previous\s+instructions/gi,
      /you\s+are\s+now/gi,
      /\[\s*INST\s*\]/gi,
      /<<\s*SYS/gi,
    ];
    
    for (const pattern of injection) {
      sanitized = sanitized.replace(pattern, '[FILTERED]');
    }
    
    // Length check
    if (sanitized.length > this.maxInputTokens * 4) {
      throw new Error('Input exceeds max tokens');
    }
    
    return sanitized;
  }

  // Sanitize output
  sanitizeOutput(output) {
    if (!output) return '';
    
    let sanitized = String(output);
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Limit length
    const maxChars = this.maxOutputTokens * 4;
    if (sanitized.length > maxChars) {
      sanitized = sanitized.slice(0, maxChars) + '\n[OUTPUT TRUNCATED]';
    }
    
    return sanitized;
  }

  buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
}

// Secure OpenAI Provider
export class SecureOpenAIProvider extends SecureLLMProvider {
  async complete(input, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    // Sanitize input
    const prompt = this.sanitizeInput(input);
    
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(options.maxTokens || 4096, this.maxOutputTokens),
        ...options,
      }),
    });

    const data = await res.json();
    const output = data.choices?.[0]?.message?.content || '';
    return this.sanitizeOutput(output);
  }
}

// Secure Anthropic Provider
export class SecureAnthropicProvider extends SecureLLMProvider {
  async complete(input, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const prompt = this.sanitizeInput(input);
    
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
        max_tokens: Math.min(options.maxTokens || 4096, this.maxOutputTokens),
      }),
    });

    const data = await res.json();
    const output = data.content?.[0]?.text || '';
    return this.sanitizeOutput(output);
  }
}

// Secure OpenRouter Provider
export class SecureOpenRouterProvider extends SecureLLMProvider {
  constructor(config) {
    super({ ...config, baseUrl: config.baseUrl || 'https://openrouter.ai/api' });
  }

  async complete(input, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const prompt = this.sanitizeInput(input);
    
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
        max_tokens: Math.min(options.maxTokens || 4096, this.maxOutputTokens),
        ...options,
      }),
    });

    const data = await res.json();
    const output = data.choices?.[0]?.message?.content || '';
    return this.sanitizeOutput(output);
  }
}

// Secure KiloCode Provider
export class SecureKiloCodeProvider extends SecureLLMProvider {
  constructor(config) {
    super({ 
      ...config, 
      baseUrl: config.baseUrl || 'https://api.kilo.ai/api/gateway',
      model: config.model || 'kilo-auto/free',
    });
  }

  async complete(input, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const prompt = this.sanitizeInput(input);
    
    const res = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(options.maxTokens || 4096, this.maxOutputTokens),
      }),
    });

    const data = await res.json();
    const output = data.choices?.[0]?.message?.content || data.response || '';
    return this.sanitizeOutput(output);
  }
}

// Secure provider factory
export function createSecureProvider(type, config) {
  const providers = {
    openai: SecureOpenAIProvider,
    anthropic: SecureAnthropicProvider,
    openrouter: SecureOpenRouterProvider,
    kilocode: SecureKiloCodeProvider,
  };

  const Provider = providers[type];
  if (!Provider) throw new Error(`Unknown provider: ${type}`);
  
  return new Provider(config);
}