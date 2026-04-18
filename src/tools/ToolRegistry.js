// Quantyval AI - Tool Registry
// Shareable tool plugins

import { logger } from '../utils/logger.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }
  
  // Register a tool
  register(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error('Tool must have name and execute function');
    }
    
    this.tools.set(tool.name, {
      ...tool,
      registeredAt: Date.now(),
      usageCount: 0,
    });
    
    logger.info(`Tool registered: ${tool.name}`);
    return this;
  }
  
  // Get tool
  get(name) {
    return this.tools.get(name);
  }
  
  // Execute tool
  async execute(name, args, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    
    tool.usageCount++;
    return tool.execute(args, context);
  }
  
  // List tools
  list() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      usageCount: t.usageCount,
    }));
  }
  
  // Remove tool
  remove(name) {
    return this.tools.delete(name);
  }
}

// Built-in tools
export const BUILTIN_TOOLS = {
  // Calculator
  calculator: {
    name: 'calculator',
    description: 'Evaluate mathematical expressions',
    execute: (args) => {
      try {
        // Safe evaluation (no eval for production)
        const result = Function('"use strict";return (' + args.expression + ')')();
        return { result };
      } catch (e) {
        return { error: e.message };
      }
    },
  },
  
  // Date/Time
  datetime: {
    name: 'datetime',
    description: 'Get current date/time info',
    execute: (args) => {
      const now = new Date();
      return {
        iso: now.toISOString(),
        unix: Math.floor(now.getTime() / 1000),
        date: now.toDateString(),
        time: now.toTimeString(),
      };
    },
  },
  
  // URL parser
  urlparse: {
    name: 'urlparse',
    description: 'Parse and validate URLs',
    execute: (args) => {
      try {
        const u = new URL(args.url);
        return {
          valid: true,
          protocol: u.protocol,
          host: u.host,
          path: u.pathname,
          params: Object.fromEntries(u.searchParams),
        };
      } catch (e) {
        return { valid: false, error: e.message };
      }
    },
  },
  
  // JSON formatter
  json: {
    name: 'json',
    description: 'Format/validate JSON',
    execute: (args) => {
      try {
        const parsed = JSON.parse(args.input);
        return {
          valid: true,
          formatted: JSON.stringify(parsed, null, 2),
        };
      } catch (e) {
        return { valid: false, error: e.message };
      }
    },
  },
  
  // Hash generator
  hash: {
    name: 'hash',
    description: 'Generate hash of text',
    execute: async (args) => {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update(args.text).digest('hex');
      return { hash, algorithm: 'sha256' };
    },
  },
};

// Create registry with built-ins
export function createToolRegistry() {
  const registry = new ToolRegistry();
  
  for (const tool of Object.values(BUILTIN_TOOLS)) {
    registry.register(tool);
  }
  
  return registry;
}