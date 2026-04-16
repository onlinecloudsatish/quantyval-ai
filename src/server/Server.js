// Quantyval AI - HTTP Server
// Run agent as API server

import { Agent } from '../core/Agent.js';
import { createProvider } from '../core/LLMProvider.js';

export class Server {
  constructor(config = {}) {
    this.port = config.port || 3000;
    this.host = config.host || '0.0.0.0';
    this.agent = null;
    this.app = null;
  }

  setAgent(agent) {
    this.agent = agent;
  }

  async start() {
    const http = await import('http');
    
    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Parse URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const path = url.pathname;

      // Routes
      if (path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', agent: this.agent?.name }));
        return;
      }

      if (path === '/api/run' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req.body) {
          body += chunk;
        }
        
        const { input, context } = JSON.parse(body || '{}');
        const response = await this.agent.run(input, context);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
      }

      if (path === '/api/stream' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req.body) {
          body += chunk;
        }
        
        const { input } = JSON.parse(body || '{}');
        
        res.writeHead(200, { 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        });
        
        await this.agent.reasonStream(input, (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        });
        
        res.end('data: [DONE]\n\n');
        return;
      }

      // 404
      res.writeHead(404);
      res.end('Not Found');
    });

    return new Promise((resolve) => {
      server.listen(this.port, this.host, () => {
        console.log(`🚀 Quantyval Server running at http://${this.host}:${this.port}`);
        resolve(server);
      });
    });
  }
}

// CLI starter
export async function startServer(options = {}) {
  const config = options.config || {};
  
  // Create agent with LLM
  const llmConfig = config.llm || {};
  const agent = new Agent({
    name: config.name || 'Quantyval',
    systemPrompt: config.systemPrompt,
    llm: llmConfig.apiKey ? {
      type: llmConfig.provider || 'kilocode',
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
    } : null,
  });

  // Start server
  const server = new Server(config.server || {});
  server.setAgent(agent);
  
  return server.start();
}