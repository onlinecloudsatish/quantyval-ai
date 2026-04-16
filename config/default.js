// Quantyval AI - Configuration
// Edit this file to customize your agent

export default {
  // Agent name
  name: 'Quantyval',
  
  // Model configuration
  model: {
    provider: 'kilocode', // openai, anthropic, openrouter
    model: 'kilo-auto/free',
    apiKey: process.env.QUANTYVAL_API_KEY || '',
  },

  // Tool configuration
  tools: {
    exec: { enabled: true, timeout: 30000 },
    browser: { enabled: false },
    fetch: { enabled: true },
  },

  // Memory
  memory: {
    shortTermMax: 100,
    longTermPersistent: true,
  },

  // Channels
  channels: {
    telegram: { enabled: false, botToken: '' },
    discord: { enabled: false, botToken: '' },
  },

  // Deployment
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
};