#!/usr/bin/env node
// Quantyval AI CLI
// Usage: quantyval <command> [options]

import { parseArgs } from 'util';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgDir = path.resolve(__dirname);

// Import core modules using require for ESM compatibility
const Agent = require(path.join(pkgDir, 'src/core/Agent.js'));
const SecureServer = require(path.join(pkgDir, 'src/server/SecureServer.js'));
const LLMProvider = require(path.join(pkgDir, 'src/core/LLMProvider.js'));
const Memory = require(path.join(pkgDir, 'src/memory/Memory.js'));
const Voice = require(path.join(pkgDir, 'src/voice/Voice.js'));

const { createProvider } = LLMProvider;
const { startServer } = SecureServer;
const { createVoiceProvider } = Voice;

const COMMANDS = {
  run: 'Run agent interactively',
  serve: 'Start HTTP server',
  init: 'Initialize new agent config',
  chat: 'Start chat mode',
  voice: 'Start voice mode',
  models: 'List available models',
  select: 'Select model interactively',
  help: 'Show this help',
};

// Available models from config
const PROVIDERS = [
  { id: 'kilocode', name: 'KiloCode', models: ['kilo-auto/free', 'kilo-pro/free'] },
  { id: 'openrouter', name: 'OpenRouter (Free)', models: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/devstral-2512:free',
    'google/gemma-3-27b-instruct:free',
  ] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'o1-preview'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4', 'claude-opus-4', 'claude-haiku-4'] },
  { id: 'groq', name: 'Groq', models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'] },
  { id: 'ollama', name: 'Ollama (local)', models: ['llama3', 'mistral', 'codellama'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.0-flash-exp', 'gemini-pro'] },
  { id: 'mistral', name: 'Mistral', models: ['mistral-large', 'mistral-small'] },
  { id: 'nvidia', name: 'NVIDIA', models: ['nvidia/llama-3.1-nemotron-70b'] },
  { id: 'cohere', name: 'Cohere', models: ['command-r-plus', 'command-r'] },
  { id: '9router', name: '9Router', models: ['if/kimi-k2-thinking', 'deepseek/deepseek-chat'] },
];

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

// List models
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
  log('Example: quantyval run --model openrouter:meta-llama/llama-3.3-70b-instruct:free\n', 'dim');
}

// Interactive model selector
async function selectModel() {
  log('\n🎯 Select Model', 'green');
  log('='.repeat(40), 'dim');
  
  const grouped = {};
  for (const p of PROVIDERS) {
    grouped[p.id] = { name: p.name, models: p.models };
  }
  
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  
  const providerList = Object.keys(grouped);
  for (let i = 0; i < providerList.length; i++) {
    const pid = providerList[i];
    log(`  ${i + 1}. ${grouped[pid].name}`, 'blue');
  }
  
  log('\nSelect provider number: ', 'green');
  
  return new Promise((resolve) => {
    rl.question('> ', (pnum) => {
      const pi = parseInt(pnum) - 1;
      if (pi >= 0 && pi < providerList.length) {
        const pid = providerList[pi];
        const models = grouped[pid].models;
        
        log(`\n📦 Models for ${grouped[pid].name}:`, 'green');
        log('-'.repeat(40), 'dim');
        
        for (let i = 0; i < models.length; i++) {
          log(`  ${i + 1}. ${models[i]}`, 'dim');
        }
        
        log('\nSelect model number: ', 'green');
        
        rl.question('> ', (mnum) => {
          rl.close();
          const mi = parseInt(mnum) - 1;
          if (mi >= 0 && mi < models.length) {
            const modelStr = `${pid}:${models[mi]}`;
            log(`\n✅ Selected: ${modelStr}\n`, 'green');
            resolve(modelStr);
          } else {
            log('\n❌ Invalid, using default\n', 'red');
            resolve('kilocode:kilo-auto/free');
          }
        });
      } else {
        rl.close();
        log('\n❌ Invalid provider, using default\n', 'red');
        resolve('kilocode:kilo-auto/free');
      }
    });
  });
}

// Interactive run mode
async function runAgent(options) {
  log('\n🤖 Quantyval AI Runner', 'green');
  log('='.repeat(30), 'dim');
  
  let llm = null;
  if (options.model) {
    const [provider, model] = options.model.split(':');
    llm = createProvider(provider, {
      apiKey: process.env.QUANTYVAL_API_KEY,
      model,
    });
  }
  
  const agent = new Agent.default({
    name: 'Quantyval',
    systemPrompt: 'You are Quantyval AI. Be helpful and provide runnable code.',
    llm: llm ? { 
      type: options.model?.split(':')[0] || 'kilocode', 
      apiKey: process.env.QUANTYVAL_API_KEY, 
      model: options.model?.split(':')[1] 
    } : null,
  });
  
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  
  log('\nYou: ');
  
  for await (const line of rl) {
    if (line.trim().toLowerCase() === 'exit') break;
    
    try {
      const response = await agent.run(line);
      console.log(`\n🤖 ${response.text || response}\n\nYou: `);
    } catch (err) {
      error(err.message);
      console.log('\nYou: ');
    }
  }
  
  rl.close();
  log('\nGoodbye!\n', 'green');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const [key, value] = args[i].slice(2).split('=');
      options[key] = value || args[++i];
    }
  }
  
  switch (command) {
    case 'run':
    case 'chat':
      await runAgent(options);
      break;
    case 'models':
      await listModels();
      break;
    case 'select':
      const selected = await selectModel();
      if (selected) {
        log('\n🚀 Starting chat with selected model...\n', 'green');
        options.model = selected;
        await runAgent(options);
      }
      break;
    case 'help':
    default:
      log('\n🤖 Quantyval AI CLI', 'green');
      log('='.repeat(30), 'dim');
      log('\nUsage: quantyval <command> [options]', 'dim');
      log('\nCommands:', 'bright');
      for (const [cmd, desc] of Object.entries(COMMANDS)) {
        log(`  ${cmd.padEnd(10)} ${desc}`, 'dim');
      }
      log('\nOptions:', 'bright');
      log('  --model <p:m>  Model (provider:model)', 'dim');
      log('  --memory       Enable memory', 'dim');
      log('\nExamples:', 'bright');
      log('  quantyval run --model kilocode:kilo-auto/free', 'dim');
      log('  quantyval select', 'dim');
      log('  quantyval models', 'dim');
      console.log('');
  }
}

main().catch(error);