// Quantyval AI - Discord Bot
// Real Discord bot integration with slash commands

import { Agent } from '../core/Agent.js';
import { createProvider } from '../core/LLMProvider.js';
import { Memory } from '../memory/Memory.js';
import { logger } from '../utils/logger.js';

export class DiscordBot {
  constructor(config = {}) {
    this.token = config.token || process.env.DISCORD_BOT_TOKEN;
    this.client = null;
    this.agent = null;
    this.api = 'https://discord.com/api/v10';
    this.commands = new Map();
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
    
    logger.info('Discord bot agent initialized');
  }
  
  // Make API request to Discord
  async api(endpoint, options = {}) {
    const url = `${this.api}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bot ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Discord API error: ${JSON.stringify(error)}`);
    }
    
    return res.json();
  }
  
  // Send message to channel
  async sendMessage(channelId, content, options = {}) {
    return this.api(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        ...options,
      }),
    });
  }
  
  // Reply to message
  async reply(message, content) {
    return this.sendMessage(message.channel_id, content, {
      message_reference: { message_id: message.id },
    });
  }
  
  // Register slash command
  async registerCommand(command) {
    const commands = await this.api('/applications/@me/commands');
    
    // Check if command exists
    const existing = commands.find(c => c.name === command.name);
    if (existing) {
      logger.info(`Command ${command.name} already registered`);
      return existing;
    }
    
    return this.api('/applications/@me/commands', {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }
  
  // Handle interaction (slash commands, buttons, etc.)
  async handleInteraction(interaction) {
    const { type, data, member, channel_id, message } = interaction;
    
    // Slash command
    if (type === 2) { // APPLICATION_COMMAND
      const command = this.commands.get(data.name);
      if (command?.handler) {
        await command.handler(interaction);
      }
    }
    
    // Button click
    if (type === 3) { // MESSAGE_COMPONENT
      const customId = data.custom_id;
      logger.info(`Button clicked: ${customId}`);
    }
  }
  
  // Handle message
  async handleMessage(message) {
    if (message.author.bot) return;
    if (!message.content) return;
    
    const channelId = message.channel_id;
    const content = message.content;
    
    logger.info(`Discord: ${message.author.username}: ${content}`);
    
    // Skip mentions or check if mentioned
    const mention = `<@${this.client?.user?.id}>`;
    if (!content.includes(mention) && !content.startsWith('!')) {
      return; // Not mentioned and not prefix command
    }
    
    // Remove mention/prefix
    const input = content.replace(mention, '').replace(/^!\w+\s*/, '').trim();
    
    if (this.agent) {
      try {
        const response = await this.agent.run(input);
        await this.reply(message, response.text);
        logger.info(`Discord: Response sent to ${message.author.username}`);
      } catch (err) {
        logger.error(`Agent error: ${err.message}`);
        await this.reply(message, `⚠️ Error: ${err.message}`);
      }
    }
  }
  
  // Create HTTP interaction endpoint (for webhooks)
  async handleWebhook(req) {
    const interaction = req.body;
    
    // Acknowledge ping
    if (interaction.type === 1) {
      return { type: 1 };
    }
    
    // Handle other interactions
    return this.handleInteraction(interaction);
  }
  
  // Connect to Discord Gateway
  async connect() {
    logger.info('Discord: Connecting to Gateway...');
    
    // For now, implement HTTP polling interaction endpoint
    // Full gateway implementation would require ws library
    logger.info('Discord: Bot ready (HTTP mode)');
  }
  
  // Start HTTP server for interactions
  async startInteractionServer(port = 3000) {
    const http = await import('http');
    
    const server = http.createServer(async (req, res) => {
      if (req.url === '/interactions' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        
        const interaction = JSON.parse(body);
        const response = await this.handleWebhook({ body: interaction });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    return new Promise(resolve => {
      server.listen(port, () => {
        logger.info(`Discord interaction server on port ${port}`);
        resolve(server);
      });
    });
  }
}

// Quick start function
export function createDiscordBot(options = {}) {
  return new DiscordBot(options);
}

// Common slash commands
export const discordCommands = {
  chat: {
    name: 'chat',
    description: 'Chat with Quantyval AI',
    options: [
      {
        name: 'message',
        type: 3, // STRING
        description: 'Your message',
        required: true,
      },
    ],
    handler: async (interaction, bot) => {
      const message = interaction.data.options[0].value;
      // Respond with defer first for slow responses
      await bot.api(`/interactions/${interaction.id}/${interaction.token}/callback`, {
        method: 'POST',
        body: JSON.stringify({ type: 5 }), // DEFERRED_CHANNEL_MESSAGE
      });
      
      const response = await bot.agent.run(message);
      await bot.api(`/webhooks/${interaction.application_id}/${interaction.token}`, {
        method: 'POST',
        body: JSON.stringify({ content: response.text }),
      });
    },
  },
  
  ping: {
    name: 'ping',
    description: 'Check bot status',
    handler: async (interaction, bot) => {
      await bot.api(`/interactions/${interaction.id}/${interaction.token}/callback`, {
        method: 'POST',
        body: JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: { content: '🏓 Pong!' },
        }),
      });
    },
  },
};