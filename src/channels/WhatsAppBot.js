// Quantyval AI - WhatsApp Bot
// WhatsApp Business API integration

import { Agent } from '../core/Agent.js';
import { createProvider } from '../core/LLMProvider.js';
import { Memory } from '../memory/Memory.js';
import { logger } from '../utils/logger.js';

export class WhatsAppBot {
  constructor(config = {}) {
    this.phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    this.apiUrl = `https://graph.facebook.com/v21.0/${this.phoneNumberId}`;
    this.verifyToken = config.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;
    this.agent = null;
    this.client = null;
    this.memory = config.memory ? new Memory() : null;
  }
  
  // Set up the agent
  setAgent(agent) {
    this.agent = agent;
  }
  
  // Build agent from config
  async initAgent(config = {}) {
    const llm = config.llm ? createProvider(config.llm.type, {
      apiKey: config.llm.apiKey || process.env.QUANTYVAL_API_KEY,
      model: config.llm.model,
    }) : null;
    
    this.agent = new Agent({
      name: config.name || 'Quantyval',
      systemPrompt: config.systemPrompt || 'You are Quantyval AI, a helpful assistant.',
      llm,
      memory: this.memory,
    });
    
    logger.info('WhatsApp bot agent initialized');
  }
  
  // Make API request to WhatsApp
  async api(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }
    
    return res.json();
  }
  
  // Send text message
  async sendMessage(to, text) {
    return this.api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
  }
  
  // Send template message
  async sendTemplate(to, templateName, components = []) {
    return this.api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          components,
        },
      }),
    });
  }
  
  // Send interactive buttons
  async sendButtons(to, text, buttons) {
    return this.api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text },
          action: {
            buttons: buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title },
            })),
          },
        },
      }),
    });
  }
  
  // Handle incoming webhook
  async handleWebhook(body) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    
    if (!message) {
      return { success: true }; // Not a message
    }
    
    const from = message.from;
    const text = message.text?.body;
    
    if (!text) return { success: true };
    
    logger.info(`WhatsApp: ${from}: ${text}`);
    
    if (this.agent) {
      try {
        const response = await this.agent.run(text);
        await this.sendMessage(from, response.text);
        logger.info(`WhatsApp: Response sent to ${from}`);
      } catch (err) {
        logger.error(`Agent error: ${err.message}`);
        await this.sendMessage(from, `⚠️ Error: ${err.message}`);
      }
    }
    
    return { success: true };
  }
  
  // Verify webhook (for initial setup)
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }
  
  // Start webhook server
  async startWebhookServer(port = 3000) {
    const http = await import('http');
    
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      
      // Webhook verification (GET)
      if (url.pathname === '/webhook' && req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        
        const challengeResponse = this.verifyWebhook(mode, token, challenge);
        if (challengeResponse) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(challengeResponse);
        } else {
          res.writeHead(403);
          res.end('Verification failed');
        }
        return;
      }
      
      // Webhook events (POST)
      if (url.pathname === '/webhook' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        
        try {
          const webhook = JSON.parse(body);
          await this.handleWebhook(webhook);
          res.writeHead(200);
          res.end('OK');
        } catch (err) {
          logger.error(`Webhook error: ${err.message}`);
          res.writeHead(500);
          res.end('Error');
        }
        return;
      }
      
      // Health check
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', bot: 'WhatsApp' }));
        return;
      }
      
      res.writeHead(404);
      res.end('Not found');
    });
    
    return new Promise(resolve => {
      server.listen(port, () => {
        logger.info(`WhatsApp webhook server on port ${port}`);
        resolve(server);
      });
    });
  }
}

// Quick start
export function createWhatsAppBot(options = {}) {
  return new WhatsAppBot(options);
}

// Example: React Bot with buttons
export async function startWhatsAppBot() {
  const bot = new WhatsAppBot();
  
  await bot.initAgent({
    name: 'WhatsAppBot',
    systemPrompt: 'You are a helpful WhatsApp assistant.',
    llm: {
      type: 'kilocode',
      apiKey: process.env.QUANTYVAL_API_KEY,
      model: 'kilo-auto/free',
    },
  });
  
  await bot.startWebhookServer(3000);
  logger.info('WhatsApp bot started');
}