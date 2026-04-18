// Quantyval AI - Telegram Bot
// Real Telegram bot integration

import { Agent } from '../core/Agent.js';
import { createProvider } from '../core/LLMProvider.js';
import { Memory } from '../memory/Memory.js';
import { logger } from '../utils/logger.js';

export class TelegramBot {
  constructor(config = {}) {
    this.token = config.token || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = config.chatId;
    this.agent = null;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.webhookUrl = config.webhookUrl;
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
    
    logger.info('Telegram bot agent initialized');
  }
  
  // Make API request to Telegram
  async api(method, params = {}) {
    const url = `${this.apiUrl}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }
    
    return res.json();
  }
  
  // Send message
  async sendMessage(chatId, text, options = {}) {
    return this.api('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || 'Markdown',
      reply_markup: options.replyMarkup,
    });
  }
  
  // Handle incoming updates
  async handleUpdate(update) {
    const message = update.message;
    if (!message || !message.text) return;
    
    const chatId = message.chat.id;
    const text = message.text;
    
    logger.info(`Telegram: ${message.from?.first_name}: ${text}`);
    
    // Skip commands
    if (text.startsWith('/')) {
      if (text === '/start') {
        await this.sendMessage(chatId, '🤖 Hello! I am Quantyval AI. Ask me anything!');
      }
      return;
    }
    
    // Process with agent
    if (this.agent) {
      try {
        const response = await this.agent.run(text);
        await this.sendMessage(chatId, response.text);
        logger.info(`Telegram: Response sent to ${chatId}`);
      } catch (err) {
        logger.error(`Agent error: ${err.message}`);
        await this.sendMessage(chatId, `⚠️ Error: ${err.message}`);
      }
    } else {
      await this.sendMessage(chatId, '⚠️ Bot not configured. Set up the agent first.');
    }
  }
  
  // Set webhook for long-polling alternative
  async setWebhook(url) {
    return this.api('setWebhook', { url });
  }
  
  // Start polling (for development)
  async startPolling(offset = 0) {
    logger.info('Telegram: Starting polling...');
    
    while (true) {
      try {
        const updates = await this.api('getUpdates', {
          offset,
          timeout: 60,
        });
        
        for (const update of updates.result || []) {
          await this.handleUpdate(update);
          offset = update.update_id + 1;
        }
      } catch (err) {
        logger.error(`Polling error: ${err.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  
  // Express middleware for webhook
  middleware() {
    return async (req, res) => {
      try {
        await this.handleUpdate(req.body);
        res.json({ ok: true });
      } catch (err) {
        logger.error(`Webhook error: ${err.message}`);
        res.status(500).json({ error: err.message });
      }
    };
  }
}

// Quick start function
export async function createTelegramBot(options = {}) {
  const bot = new TelegramBot(options);
  await bot.initAgent(options);
  return bot;
}