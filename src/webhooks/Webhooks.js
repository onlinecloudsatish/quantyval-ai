// Quantyval AI - Webhooks System
// HTTP callbacks on events

import { createServer } from 'http';
import { logger } from '../utils/logger.js';

export class WebhookManager {
  constructor(config = {}) {
    this.webhooks = new Map();
    this.events = ['message', 'complete', 'error', 'task_start', 'task_end'];
  }
  
  // Register a webhook
  register(name, url, events = null) {
    const eventList = events || this.events;
    
    this.webhooks.set(name, {
      url,
      events: eventList,
      createdAt: Date.now(),
      callCount: 0,
      lastCall: null,
    });
    
    logger.info(`Webhook registered: ${name} -> ${url}`);
    return this;
  }
  
  // Unregister webhook
  unregister(name) {
    if (this.webhooks.delete(name)) {
      logger.info(`Webhook unregistered: ${name}`);
      return true;
    }
    return false;
  }
  
  // Trigger webhook(s)
  async trigger(event, data) {
    if (!this.events.includes(event)) {
      logger.warn(`Unknown event: ${event}`);
      return;
    }
    
    const triggered = [];
    
    for (const [name, hook] of this.webhooks) {
      if (hook.events.includes(event)) {
        try {
          await this.callWebhook(hook.url, { event, data, timestamp: Date.now() });
          hook.callCount++;
          hook.lastCall = Date.now();
          triggered.push(name);
        } catch (e) {
          logger.error(`Webhook ${name} failed: ${e.message}`);
        }
      }
    }
    
    return triggered;
  }
  
  // Call webhook URL
  async callWebhook(url, payload) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return res.json().catch(() => ());
  }
  
  // Get webhook status
  getStatus() {
    const hooks = {};
    for (const [name, hook] of this.webhooks) {
      hooks[name] = {
        url: hook.url,
        events: hook.events,
        calls: hook.callCount,
        lastCall: hook.lastCall,
      };
    }
    return hooks;
  }
}

// HTTP webhook server
export class WebhookServer {
  constructor(port = 3030) {
    this.port = port;
    this.manager = new WebhookManager();
  }
  
  // Start server
  start() {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${this.port}`);
      
      // POST /webhooks - Register
      if (url.pathname === '/webhooks' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { name, url, events } = JSON.parse(body);
            this.manager.register(name, url, events);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      
      // DELETE /webhooks/:name - Unregister
      if (url.pathname.startsWith('/webhooks/') && req.method === 'DELETE') {
        const name = url.pathname.split('/')[2];
        this.manager.unregister(name);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }
      
      // GET /webhooks - List
      if (url.pathname === '/webhooks' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.manager.getStatus()));
        return;
      }
      
      // POST /trigger - Manual trigger
      if (url.pathname === '/trigger' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const { event, data } = JSON.parse(body);
          const triggered = await this.manager.trigger(event, data);
          res.writeHead(200);
          res.end(JSON.stringify({ triggered }));
        });
        return;
      }
      
      res.writeHead(404);
      res.end('Not found');
    });
    
    server.listen(this.port, () => {
      logger.info(`Webhook server on port ${this.port}`);
    });
    
    return server;
  }
}

// Create webhook manager
export function createWebhookManager(config = {}) {
  return new WebhookManager(config);
}