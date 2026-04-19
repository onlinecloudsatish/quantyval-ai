// Quantyval AI - Default Configuration
// Edit this file or use environment variables

export default {
  // Agent name
  name: 'Quantyval',
  
  // Default LLM Provider - OpenRouter with Claude
  model: {
    // provider: 'openrouter', // Now default! (set in code)
    // model: 'anthropic/claude-3.5-sonnet',
    
    // Or override with environment
    provider: process.env.LLM_PROVIDER || 'kilocode',
    model: process.env.LLM_MODEL || 'kilo-auto/free',
    apiKey: process.env.QUANTYVAL_API_KEY || process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || '',
  },

  // System prompt
  systemPrompt: 'You are Quantyval AI, a helpful agent. Be professional but friendly. Provide runnable code and examples without asking. Do the next obvious step automatically.',

  // Communication settings (from CL4R1T4S best practices)
  noOptInQuestions: true,    // Don't ask, just do
  explainBeforeTool: true,    // Explain before using tools
  readBeforeEdit: true,      // Read file before editing
  maxErrorLoops: 3,          // Max 3 error attempts

  // Auto-detect skills from package.json
  autoDetectSkills: true,

  // Memory settings
  memory: {
    shortTermMax: 100,
    longTermPersistent: true,
  },

  // Tools
  tools: {
    exec: { enabled: true, timeout: 30000 },
    fetch: { enabled: true },
    browser: { enabled: false }, // Requires playwright
  },

  // Channels
  channels: {
    telegram: { enabled: false },
    discord: { enabled: false },
    whatsapp: { enabled: false },
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    apiKey: process.env.QUANTYVAL_API_KEY,
    rateLimit: 100, // per minute
  },

  // Voice (optional)
  voice: {
    tts: { type: 'webspeech' },
    stt: { type: null },
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Available LLM Providers
export const PROVIDER_INFO = {
  openrouter: {
    name: 'OpenRouter',
    description: 'Access 100+ models (Anthropic, OpenAI, Meta, etc.)',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'meta-llama/llama-3.1-70b-instruct'],
    env: 'OPENROUTER_API_KEY',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, o1',
    models: ['gpt-4o', 'gpt-4-turbo', 'o1-preview'],
    env: 'OPENAI_API_KEY',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude ( Sonnet, Opus, Haiku)',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514'],
    env: 'ANTHROPIC_API_KEY',
  },
  kilocode: {
    name: 'KiloCode',
    description: 'Free tier, kilo-auto models',
    models: ['kilo-auto/free', 'kilo-pro/free'],
    env: 'KILO_API_KEY',
  },
  ollama: {
    name: 'Ollama',
    description: 'Local LLM (Llama3, Mistral, etc.)',
    models: ['llama3', 'mistral', 'codellama'],
    env: null, // Local
  },
  groq: {
    name: 'Groq',
    description: 'Fast inference (Llama, Mixtral)',
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    env: 'GROQ_API_KEY',
  },
  nvidia: {
    name: 'NVIDIA NIM',
    description: 'NVIDIA inference endpoints',
    models: ['nvidia/llama-3.1-nemotron-70b-instruct'],
    env: 'NVIDIA_API_KEY',
  },
  azure: {
    name: 'Azure OpenAI',
    description: 'Microsoft Azure OpenAI',
    models: ['gpt-4', 'gpt-35-turbo'],
    env: 'AZURE_OPENAI_API_KEY',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Google Gemini models',
    models: ['gemini-2.0-flash', 'gemini-pro'],
    env: 'GEMINI_API_KEY',
  },
  mistral: {
    name: 'Mistral',
    description: 'Mistral AI models',
    models: ['mistral-large-latest', 'mistral-small'],
    env: 'MISTRAL_API_KEY',
  },
  cohere: {
    name: 'Cohere',
    description: 'Command R models',
    models: ['command-r-plus', 'command-r'],
    env: 'COHERE_API_KEY',
  },
};