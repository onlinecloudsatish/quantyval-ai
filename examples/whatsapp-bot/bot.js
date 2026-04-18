// Quantyval AI - WhatsApp Bot Example
// Run: WHATSAPP_PHONE_NUMBER_ID=xxx WHATSAPP_ACCESS_TOKEN=xxx node examples/whatsapp-bot/bot.js

import { WhatsAppBot } from '../src/channels/WhatsAppBot.js';
import { createProvider } from '../src/core/LLMProvider.js';

async function main() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!phoneNumberId || !accessToken) {
    console.error('Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN');
    console.log('Get from: https://developers.facebook.com/docs/whatsapp');
    process.exit(1);
  }
  
  // Create bot
  const bot = new WhatsAppBot({
    phoneNumberId,
    accessToken,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'my_verify_token',
    memory: true,
  });
  
  // Initialize with LLM
  await bot.initAgent({
    name: 'WhatsAppBot',
    systemPrompt: 'You are Quantyval AI, a helpful WhatsApp assistant. Keep messages short.',
    llm: {
      type: 'kilocode',
      apiKey: process.env.QUANTYVAL_API_KEY,
      model: 'kilo-auto/free',
    },
  });
  
  // Start webhook server
  await bot.startWebhookServer(3002);
  
  console.log('🤖 WhatsApp bot started on port 3002');
  console.log('   Configure webhook URL in Meta Developer Console');
  console.log('   Webhook URL: https://your-domain.com/webhook');
}

main();