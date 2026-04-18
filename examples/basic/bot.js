// Quantyval AI - Basic Example
// Minimal agent setup

import { Agent } from '../src/core/Agent.js';
import { createProvider } from '../src/core/LLMProvider.js';

async function main() {
  // Create LLM provider
  const llm = createProvider('kilocode', {
    apiKey: process.env.QUANTYVAL_API_KEY,
    model: 'kilo-auto/free',
  });
  
  // Create agent
  const agent = new Agent({
    name: 'HelloBot',
    systemPrompt: 'You are a friendly assistant. Keep responses short and cheerful.',
    llm: { type: 'kilocode', apiKey: process.env.QUANTYVAL_API_KEY },
  });
  
  // Run
  const response = await agent.run('Hello! What can you do?');
  console.log('🤖:', response.text);
}

main();