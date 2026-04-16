// Quantyval AI - Secure HTTP Server
// With auth, rate limiting, input validation

export class SecureServer {
  constructor(config = {}) {
    this.port = config.port || 3000;
    this.host = config.host || '0.0.0.0';
    this.agent = null;
    this.apiKey = config.apiKey || process.env.QUANTYVAL_API_KEY;
    this.rateLimit = config.rateLimit || 100; // requests per minute
    this.rateWindow = 60000; // 1 minute
    this.requestCounts = new Map();
  }

  setAgent(agent) {
    this.agent = agent;
  }

  // Validate JSON safely
  validateJSON(body) {
    try {
      return JSON.parse(body || '{}');
    } catch {
      throw new Error('Invalid JSON');
    }
  }

  // Rate limiting
  checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - this.rateWindow;
    
    const record = this.requestCounts.get(ip) || [];
    const recent = record.filter(t => t > windowStart);
    
    if (recent.length >= this.rateLimit) {
      throw new Error('Rate limit exceeded');
    }
    
    recent.push(now);
    this.requestCounts.set(ip, recent);
    return true;
  }

  // Authenticate
  authenticate(req) {
    if (!this.apiKey) return true; // No API key configured
    
    const provided = req.headers['x-api-key'];
    if (!provided || provided !== this.apiKey) {
      throw new Error('Unauthorized');
    }
    return true;
  }

  // Sanitize input
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input');
    }
    // Length limit
    if (input.length > 1e6) throw new Error('Input too large');
    // Remove null bytes
    return input.replace(/\0/g, '');
  }

  // CORS with allowlist
  getCorsOrigin(origin) {
    const allowed = [
      'https://quantyval.ai',
      'https://www.quantyval.ai',
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    // If no allowlist, block
    if (!allowed.length) return 'null';
    return allowed.includes(origin) ? origin : allowed[0];
  }

  async start() {
    const http = await import('http');
    
    const server = http.createServer(async (req, res) => {
      try {
        // Get client IP for rate limiting
        const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'];
        
        // Check rate limit
        this.checkRateLimit(ip);
        
        // Sanitize CORS
        const origin = req.headers.origin;
        const corsOrigin = this.getCorsOrigin(origin);
        res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
        res.setHeader('Access-Control-Max-Age', '3600');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Parse URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname;

        // Health (no auth)
        if (path === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', agent: this.agent?.name }));
          return;
        }

        // Authenticate for API routes
        if (path.startsWith('/api/')) {
          this.authenticate(req);
        }

        // Routes
        if (path === '/api/run' && req.method === 'POST') {
          let body = '';
          for await (const chunk of req.body) {
            body += chunk;
          }
          
          const data = this.validateJSON(body);
          const input = this.sanitizeInput(data.input || '');
          
          const response = await this.agent.run(input, { 
            context: data.context,
            ip, // Audit log
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
          return;
        }

        if (path === '/api/stream' && req.method === 'POST') {
          let body = '';
          for await (const chunk of req.body) {
            body += chunk;
          }
          
          const data = this.validateJSON(body);
          const input = this.sanitizeInput(data.input || '');
          
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
        
      } catch (err) {
        res.writeHead(err.message === 'Unauthorized' ? 401 : 400, { 
          'Content-Type': 'application/json' 
        });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    return new Promise((resolve) => {
      server.listen(this.port, this.host, () => {
        console.log(`🔒 Quantyval Secure Server running at http://${this.host}:${this.port}`);
        resolve(server);
      });
    });
  }
}

// CLI starter
export async function startSecureServer(options = {}) {
  const { Agent } = await import('./core/Agent.js');
  const { createProvider } = await import('./core/LLMProvider.js');
  
  const config = options.config || {};
  
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

  const server = new SecureServer({
    ...config.server,
    apiKey: config.apiKey || process.env.QUANTYVAL_API_KEY,
  });
  server.setAgent(agent);
  
  return server.start();
}