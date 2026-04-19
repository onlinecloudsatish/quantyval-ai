#!/usr/bin/env node
// Quantyval AI CLI
// Usage: quantyval <command> [options]

import { parseArgs } from 'util';
import { Agent } from './src/core/Agent.js';
import { startServer, SecureServer } from './src/server/SecureServer.js';
import { createProvider } from './src/core/LLMProvider.js';
import { Memory } from './src/memory/Memory.js';
import { createVoiceProvider } from './src/voice/Voice.js';

const COMMANDS = {
  run: 'Run agent interactively',
  serve: 'Start HTTP server',
  init: 'Initialize new agent config',
  chat: 'Start chat mode',
  voice: 'Start voice mode',
  models: 'List available models',
  help: 'Show this help',
};

// Available models from config
const PROVIDERS = [
  { id: 'kilocode', name: 'KiloCode', models: ['kilo-auto/free', 'kilo-pro/free'] },
  { id: 'openrouter', name: 'OpenRouter (Free)', models: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/devstral-2512:free',
    'nvidia/nemotron-3-super-qlora-助手-多语言模型的免费使用:free',
    'qwen/qwen-3-next-80b:free',
    'deepseek/deepseek-r1:free',
    'google/gemma-3-27b-instruct:free',
    'openai/gpt-oss-120b:free',
    'nousresearch/hermes-3-405b:free',
    'xiaomi/mimo-v2-flash:free',
    'stepfun-ai/step-3.5-flash:free',
    'cognitivecomputations/dolphin-mistral-24b:free',
    'google/gemma-3-12b-instruct:free',
    'google/gemma-3-4b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'o1-preview'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514'] },
  { id: 'groq', name: 'Groq', models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'] },
  { id: 'ollama', name: 'Ollama (local)', models: ['llama3', 'mistral', 'codellama'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.0-flash-exp', 'gemini-pro'] },
  { id: 'mistral', name: 'Mistral', models: ['mistral-large-latest', 'mistral-small-3.1'] },
  { id: 'nvidia', name: 'NVIDIA', models: ['nvidia/llama-3.1-nemotron-70b-instruct'] },
  { id: 'cohere', name: 'Cohere', models: ['command-r-plus', 'command-r'] },
];

async function listModels() {
  log('\n📋 Available Models', 'green');
  log('='.repeat(35), 'dim');
  for (const p of PROVIDERS) {
    log(`\n${p.name} (${p.id}):`, 'blue');
    for (const m of p.models) {
      log(`  • ${p.id}:${m}`, 'dim');
    }
  }
  log('\nUsage: --model provider:model', 'green');
  log('Example: quantyval run --model openrouter:anthropic/claude-3.5-sonnet\n', 'dim');
}

const OPTIONS = {
  help: { type: 'boolean' },
  model: { type: 'string' },
  system: { type: 'string' },
  memory: { type: 'boolean' },
  voice: { type: 'boolean' },
  stream: { type: 'boolean' },
  port: { type: 'string' },
};

// Color output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg) {
  console.error(`${colors.red}Error: ${msg}${colors.reset}`);
}

// Interactive run mode
async function runAgent(options) {
  log('\n🤖 Quantyval AI Runner', 'green');
  log('='.repeat(30), 'dim');
  
  // Create LLM
  let llm = null;
  if (options.model) {
    const [provider, model] = options.model.split(':');
    llm = createProvider(provider, {
      apiKey: process.env.QUANTYVAL_API_KEY,
      model,
    });
  }
  
  // Create agent
  const agent = new Agent({
    name: 'Quantyval',
    systemPrompt: options.system || 'You are Quantyval AI, a helpful coding assistant.',
    llm: llm ? { type: options.model?.split(':')[0] || 'kilocode', apiKey: process.env.QUANTYVAL_API_KEY, model: options.model?.split(':')[1] } : null,
    memory: options.memory ? new Memory() : null,
  });
  
  // Chat loop
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  log('\n💬 Chat mode (Ctrl+C to exit)\n', 'blue');
  
  rl.question('You: ', async (input) => {
    const response = await agent.run(input);
    console.log(`\n🤖 ${response.text}\n`);
    rl.close();
  });
}

// HTTP Server mode
async function serveAgent(options) {
  log('\n🚀 Starting Quantyval Server...', 'green');
  
  const agent = new Agent({
    name: 'Quantyval',
    systemPrompt: options.system || 'You are Quantyval AI, a helpful assistant.',
    llm: options.model ? {
      type: options.model?.split(':')[0] || 'kilocode',
      apiKey: process.env.QUANTYVAL_API_KEY,
      model: options.model?.split(':')[1],
    } : null,
    memory: options.memory ? new Memory() : null,
  });
  
  const server = new SecureServer({
    port: parseInt(options.port || '3000'),
    apiKey: process.env.QUANTYVAL_API_KEY,
  });
  
  server.setAgent(agent);
  await server.start();
}

// Init new project
async function initProject() {
  log('\n📦 Initializing Quantyval project...', 'green');
  
  const fs = await import('fs');
  
  // Create config
  const config = {
    name: 'my-agent',
    model: { provider: 'kilocode', model: 'kilo-auto/free' },
    server: { port: 3000 },
    memory: true,
  };
  
  fs.writeFileSync('./quantyval.config.json', JSON.stringify(config, null, 2));
  log('✅ Created quantyval.config.json', 'green');
}

// Voice mode
async function runVoice(options) {
  log('\n🎤 Quantyval Voice Mode', 'green');
  
  const agent = new Agent({
    name: 'Quantyval',
    llm: options.model ? {
      type: options.model.split(':')[0],
      apiKey: process.env.QUANTYVAL_API_KEY,
      model: options.model.split(':')[1],
    } : null,
  });
  
  const voice = createVoiceProvider('webspeech', {});
  
  log('🎙️ Speak now (Ctrl+C to exit)', 'blue');
  
  // Note: Browser-based voice requires Web Speech API
  log('Voice input requires browser environment', 'yellow');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (!args.length || args[0] === 'help') {
    log('\n🤖 Quantyval AI CLI', 'green');
    log('='.repeat(30), 'dim');
    log('\nUsage:', 'bright');
    log('  quantyval <command> [options]', 'dim');
    log('\nCommands:', 'bright');
    for (const [cmd, desc] of Object.entries(COMMANDS)) {
      log(`  ${cmd.padEnd(10)} ${desc}`, 'dim');
    }
    log('\nOptions:', 'bright');
    log('  --model <provider:model>  LLM to use (default: kilocode:kilo-auto/free)', 'dim');
    log('  --system <prompt>     System prompt', 'dim');
    log('  --memory            Enable memory', 'dim');
    log('  --port <number>      Server port (default: 3000)', 'dim');
    log('\nExamples:', 'bright');
    log('  quantyval run --model openai:gpt-4', 'dim');
    log('  quantyval serve --port 8080', 'dim');
    log('  quantyval init', 'dim');
    console.log('');
    process.exit(0);
  }
  
  const command = args[0];
  const options = {};
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const [key, value] = args[i].slice(2).split('=');
      options[key] = value || args[++i];
    }
  }
  
  try {
    switch (command) {
      case 'run':
        await runAgent(options);
        break;
      case 'serve':
        await serveAgent(options);
        break;
      case 'init':
        await initProject();
        break;
      case 'voice':
        await runVoice(options);
        break;
      case 'chat':
        options.mode = 'chat';
        await runAgent(options);
        break;
      case 'models':
        await listModels();
        break;
      default:
        error(`Unknown command: ${command}`);
        console.log('Run "quantyval help" for usage');
        process.exit(1);
    }
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

main();