// Quantyval AI - Universal Agent Framework
// Export all modules

// Core
export { Agent, ReActAgent } from './core/Agent.js';
export { ToolRunner } from './core/ToolRunner.js';
export * as LLM from './core/LLMProvider.js';

// Unified (all-in-one with vyasa + 9Router-style routing)
export { UnifiedAgent, createUnifiedAgent, quickStart, runCLI } from './unified.js';

// Memory
export { Memory } from './memory/Memory.js';

// Channels
export { Channel, TelegramChannel, DiscordChannel, WebSocketChannel } from './channels/Channel.js';

// Voice
export * as Voice from './voice/Voice.js';

// Multi-Agent
export * as MultiAgent from './multiagent/Orchestrator.js';

// Core (secure versions)
export * as SecureTools from './core/SecureToolRunner.js';
export * as SecureLLM from './core/SecureLLMProvider.js';

// Server (secure version)
export { SecureServer, startSecureServer } from './server/SecureServer.js';

// Also export non-secure Server for compatibility
export { Server, startServer } from './server/Server.js';

// Get config function
export const getConfig = () => import('../config/default.js').then(m => m.default);

// Create agent helper
export const createAgent = (options = {}) => import('./core/Agent.js').then(({ Agent }) => {
  return getConfig().then(config => {
    return new Agent({
      name: options.name || config?.name || 'Quantyval',
      systemPrompt: options.systemPrompt,
      llm: options.llm || (config?.model?.apiKey ? {
        type: config.model.provider,
        apiKey: config.model.apiKey,
        model: config.model.model,
      } : null),
    });
  });
});

// Config object (lazy loaded proxy)
export const config = {
  async then(resolve) {
    const cfg = await getConfig();
    resolve(cfg);
  }
};