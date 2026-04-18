// Quantyval AI - Telegram Bot Example
// Run: TELEGRAM_BOT_TOKEN=xxx node examples/telegram-bot.js

import { TelegramBot } from '../src/channels/TelegramBot.js';
import { createProvider } from '../src/core/LLMProvider.js';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('Set TELEGRAM_BOT_TOKEN environment variable');
    process.exit(1);
  }
  
  // Create bot
  const bot = new TelegramBot({
    token,
    memory: true,
  });
  
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
  
  console.log('🤖 Telegram bot started...');
  
  // Start polling
  await bot.startPolling();
}

main();