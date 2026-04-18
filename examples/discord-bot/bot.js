// Quantyval AI - Discord Bot Example
// Run: DISCORD_BOT_TOKEN=xxx node examples/discord-bot/bot.js

import { DiscordBot, discordCommands } from '../src/channels/DiscordBot.js';
import { createProvider } from '../src/core/LLMProvider.js';

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('Set DISCORD_BOT_TOKEN environment variable');
    console.log('Get token from: https://discord.com/developers/applications');
    process.exit(1);
  }
  
  // Create bot
  const bot = new DiscordBot({ token, memory: true });
  
  // Initialize with LLM
  await bot.initAgent({
    name: 'QuantyvalBot',
    systemPrompt: 'You are Quantyval AI, a helpful and friendly assistant.',
    llm: {
      type: 'kilocode',
      apiKey: process.env.QUANTYVAL_API_KEY,
      model: 'kilo-auto/free',
    },
  });
  
  // Register commands
  console.log('📝 Registering slash commands...');
  for (const [name, cmd] of Object.entries(discordCommands)) {
    bot.commands.set(name, cmd);
    try {
      await bot.registerCommand(cmd);
      console.log(`  ✅ /${name}`);
    } catch (e) {
      console.log(`  ⚠️ /${name}: ${e.message}`);
    }
  }
  
  // Start interaction server (for slash commands)
  await bot.startInteractionServer(3001);
  
  console.log('🤖 Discord bot started on port 3001');
  console.log('   Add bot to server with OAuth2 URL');
}

main();