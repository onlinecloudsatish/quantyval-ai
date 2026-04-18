// Quantyval AI - File Watcher System
// Auto-run tasks on file changes

import { watch } from 'fs';
import { createUnifiedAgent } from '../unified.js';
import { logger } from '../utils/logger.js';

export class FileWatcher {
  constructor(config = {}) {
    this.watchers = new Map();
    this.actions = new Map();
    this.debounceMs = config.debounce || 500;
    this.agent = null;
  }
  
  // Set agent for actions
  setAgent(agent) {
    this.agent = agent;
  }
  
  // Watch directory/file
  watch(path, options = {}) {
    const id = Date.now().toString();
    
    const watcher = watch(path, { recursive: true }, async (eventType, filename) => {
      if (!filename) return;
      
      // Debounce
      clearTimeout(this._debounce);
      this._debounce = setTimeout(async () => {
        logger.info(`File ${eventType}: ${filename}`);
        
        // Get actions for this file pattern
        const actions = this.getMatchingActions(filename);
        
        for (const action of actions) {
          try {
            if (action.type === 'agent') {
              if (this.agent) {
                const result = await this.agent.complete(
                  `File ${filename} was ${eventType}. ${action.prompt}`
                );
                logger.info(`Action completed: ${action.name}`);
              }
            } else if (action.type === 'exec') {
              const { execSync } = await import('child_process');
              execSync(action.command, { stdio: 'inherit' });
            }
          } catch (e) {
            logger.error(`Action ${action.name} failed: ${e.message}`);
          }
        }
      }, this.debounceMs);
    });
    
    this.watchers.set(id, { watcher, path, options });
    logger.info(`Watching: ${path}`);
    
    return id;
  }
  
  // Stop watching
  unwatch(id) {
    const w = this.watchers.get(id);
    if (w) {
      w.watcher.close();
      this.watchers.delete(id);
      return true;
    }
    return false;
  }
  
  // Stop all
  unwatchAll() {
    for (const [id, w] of this.watchers) {
      w.watcher.close();
    }
    this.watchers.clear();
    logger.info('All watchers stopped');
  }
  
  // Add action
  addAction(action) {
    this.actions.set(action.name, action);
  }
  
  // Get matching actions
  getMatchingActions(filename) {
    const matches = [];
    for (const action of this.actions.values()) {
      if (action.match && action.match.test(filename)) {
        matches.push(action);
      }
    }
    return matches;
  }
}

// Predefined watchers
export const PRESET_WATCHERS = {
  javascript: {
    match: /\.m?js$/,
    prompt: 'Analyze this JavaScript file and suggest improvements if needed.',
  },
  python: {
    match: /\.py$/,
    prompt: 'Review this Python code for bugs and best practices.',
  },
  typescript: {
    match: /\.ts$/,
    prompt: 'Check this TypeScript file for type errors and improvements.',
  },
  config: {
    match: /\.(json|yaml|yml|toml)$/,
    prompt: 'Validate this configuration file.',
  },
};

// Create watcher
export function createFileWatcher(config = {}) {
  return new FileWatcher(config);
}