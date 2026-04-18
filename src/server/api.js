// Quantyval AI - REST API Server
// Full REST API for Quantyval agent

import { createUnifiedAgent } from '../unified.js';
import { logger } from '../utils/logger.js';
import http from 'http';
import { parse } from 'url';
import { parse as parseQuery } from 'querystring';

export class QuantyvalServer {
  constructor(config = {}) {
    this.port = config.port || 3000;
    this.host = config.host || '0.0.0.0';
    this.agent = null;
    this.apiKey = config.apiKey || process.env.QUANTYVAL_API_KEY;
  }
  
  setAgent(agent) {
    this.agent = agent;
  }
  
  // Parse request body
  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }
  
  // Send JSON response
  sendJSON(res, status, data) {
    res.writeHead(status, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(JSON.stringify(data));
  }
  
  // Handle request
  async handle(req, res) {
    const url = parse(req.url, true);
    const path = url.pathname;
    const method = req.method;
    
    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }
    
    // Auth check (except /health)
    if (path !== '/health' && path !== '/') {
      const auth = req.headers.authorization;
      if (this.apiKey && auth !== `Bearer ${this.apiKey}`) {
        this.sendJSON(res, 401, { error: 'Unauthorized' });
        return;
      }
    }
    
    try {
      // Routes
      if (path === '/' || path === '/health') {
        this.sendJSON(res, 200, { 
          status: 'ok', 
          name: 'Quantyval AI',
          version: '1.0.0',
          agent: this.agent?.name || 'Not initialized'
        });
        return;
      }
      
      // POST /api/complete - Send message and get response
      if (path === '/api/complete' && method === 'POST') {
        const body = await this.parseBody(req);
        
        if (!body.message) {
          this.sendJSON(res, 400, { error: 'Missing required field: message' });
          return;
        }
        
        if (!this.agent) {
          this.sendJSON(res, 500, { error: 'Agent not initialized' });
          return;
        }
        
        const response = await this.agent.complete(body.message, {
          maxTokens: body.maxTokens,
          temperature: body.temperature,
        });
        
        this.sendJSON(res, 200, {
          message: body.message,
          response: response.text,
          provider: response.provider,
          model: response.model,
        });
        return;
      }
      
      // POST /api/stream - Streaming response
      if (path === '/api/stream' && method === 'POST') {
        const body = await this.parseBody(req);
        
        if (!body.message) {
          this.sendJSON(res, 400, { error: 'Missing required field: message' });
          return;
        }
        
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        
        // Stream would need agent support - for now send error
        this.sendJSON(res, 501, { error: 'Streaming not yet implemented' });
        return;
      }
      
      // GET /api/status - Agent status
      if (path === '/api/status' && method === 'GET') {
        if (!this.agent) {
          this.sendJSON(res, 500, { error: 'Agent not initialized' });
          return;
        }
        
        this.sendJSON(res, 200, this.agent.getStatus());
        return;
      }
      
      // GET /api/providers - List providers
      if (path === '/api/providers' && method === 'GET') {
        const { getProviders } = await import('../core/LLMProvider.js');
        const { PROVIDER_INFO } = await import('../config/default.js');
        
        const providers = getProviders().map(p => ({
          name: p,
          ...PROVIDER_INFO[p]
        }));
        
        this.sendJSON(res, 200, { providers });
        return;
      }
      
      // POST /api/model - Switch model
      if (path === '/api/model' && method === 'POST') {
        const body = await this.parseBody(req);
        
        if (!body.provider || !body.model) {
          this.sendJSON(res, 400, { error: 'Missing required fields: provider, model' });
          return;
        }
        
        if (this.agent) {
          this.agent.setLLM(body.provider, this.agent.config.apiKey, body.model);
          this.sendJSON(res, 200, { 
            success: true, 
            provider: body.provider, 
            model: body.model 
          });
        } else {
          this.sendJSON(res, 500, { error: 'Agent not initialized' });
        }
        return;
      }
      
      // POST /api/skills - List or add skills
      if (path === '/api/skills' && method === 'GET') {
        if (!this.agent) {
          this.sendJSON(res, 500, { error: 'Agent not initialized' });
          return;
        }
        
        this.sendJSON(res, 200, { skills: this.agent.listSkills() });
        return;
      }
      
      // 404
      this.sendJSON(res, 404, { error: 'Not found' });
      
    } catch (err) {
      logger.error(`Request error: ${err.message}`);
      this.sendJSON(res, 500, { error: err.message });
    }
  }
  
  // Start server
  async start() {
    const server = http.createServer((req, res) => this.handle(req, res));
    
    return new Promise((resolve) => {
      server.listen(this.port, this.host, () => {
        logger.info(`🚀 Quantyval API Server: http://${this.host}:${this.port}`);
        logger.info(`   Health:   GET /health`);
        logger.info(`   Complete: POST /api/complete`);
        logger.info(`   Status:   GET /api/status`);
        logger.info(`   Providers: GET /api/providers`);
        resolve(server);
      });
    });
  }
}

// CLI to start server
export async function startServer(config = {}) {
  const server = new QuantyvalServer({
    port: config.port || process.env.PORT || 3000,
    apiKey: config.apiKey || process.env.QUANTYVAL_API_KEY,
  });
  
  const agent = createUnifiedAgent({
    name: 'Quantyval',
    apiKey: config.apiKey || process.env.QUANTYVAL_API_KEY,
    provider: config.provider || 'openrouter',
    model: config.model,
    vyasaSkillsPath: config.vyasaSkillsPath,
  });
  
  server.setAgent(agent);
  await server.start();
  
  return { server, agent };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer({
    port: process.env.PORT || 3000,
    apiKey: process.env.QUANTYVAL_API_KEY,
    provider: process.env.LLM_PROVIDER || 'openrouter',
    model: process.env.LLM_MODEL,
  });
}