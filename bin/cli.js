#!/usr/bin/env node
// Quantyval AI CLI - Simple version without module imports
const { createInterface } = require('readline');

// Banner
const C = { g: '\x1b[32m', c: '\x1b[36m', r: '\x1b[31m', y: '\x1b[33m', z: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' };
const log = m => console.log(m);
const info = m => log(C.c + m + C.z);
const success = m => log(C.g + m + C.z);

const PROVIDERS = [
  { id: 'kilocode', name: 'KiloCode', models: ['kilo-auto/free', 'kilo-pro/free'] },
  { id: 'openrouter', name: 'OpenRouter', models: ['meta-llama/llama-3.3-70b-instruct:free', 'mistralai/devstral-2512:free'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4', 'claude-opus-4'] },
  { id: 'groq', name: 'Groq', models: ['llama-3.1-70b-versatile'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.0-flash'] },
  { id: 'mistral', name: 'Mistral', models: ['mistral-large', 'mistral-small'] },
  { id: '9router', name: '9Router', models: ['if/kimi-k2-thinking'] },
];

function showHelp() {
  log('\n🤖 Quantyval AI CLI', 'green');
  log('='.repeat(30), 'dim');
  log('\nUsage: quantyval <command> [options]', 'dim');
  log('\nCommands:', 'bright');
  log('  run           Start interactive chat', 'dim');
  log('  select       Interactive model selection', 'dim');
  log('  models       List available models', 'dim');
  log('  providers    List LLM providers', 'dim');
  log('\nOptions:', 'bright');
  log('  --model=<p:m>  Provider:model', 'dim');
  log('\nExamples:', 'bright');
  log('  quantyval run --model=kilocode:kilo-auto/free', 'dim');
  log('  quantyval select', 'dim');
  console.log('');
}

function listModels() {
  log('\n📋 Available Models', 'green');
  log('='.repeat(35), 'dim');
  for (const p of PROVIDERS) {
    log(`\n${p.name} (${p.id}):`, 'blue');
    for (const m of p.models) {
      log(`  • ${p.id}:${m}`, 'dim');
    }
  }
  log('\nUsage: quantyval run --model=provider:model\n', 'green');
}

function listProviders() {
  log('\n📦 Available LLM Providers:', 'green');
  log('='.repeat(35), 'dim');
  for (const p of PROVIDERS) {
    log(` • ${p.id.padEnd(12)} ${p.name}`, 'dim');
  }
  console.log('');
}

async function selectModel() {
  log('\n🎯 Select Model', 'green');
  log('='.repeat(40), 'dim');
  
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  
  for (let i = 0; i < PROVIDERS.length; i++) {
    log(`  ${i + 1}. ${PROVIDERS[i].name}`, 'blue');
  }
  
  log('\nSelect provider number: ', 'green');
  
  return new Promise((resolve) => {
    rl.question('> ', (pnum) => {
      const pi = parseInt(pnum) - 1;
      if (pi >= 0 && pi < PROVIDERS.length) {
        const p = PROVIDERS[pi];
        
        log(`\n📦 Models for ${p.name}:`, 'green');
        log('-'.repeat(40), 'dim');
        
        for (let i = 0; i < p.models.length; i++) {
          log(`  ${i + 1}. ${p.models[i]}`, 'dim');
        }
        
        log('\nSelect model number: ', 'green');
        
        rl.question('> ', (mnum) => {
          rl.close();
          const mi = parseInt(mnum) - 1;
          if (mi >= 0 && mi < p.models.length) {
            const modelStr = `${p.id}:${p.models[mi]}`;
            success(`\n✅ Selected: ${modelStr}`);
            resolve(modelStr);
          } else {
            log('\n❌ Invalid, using default\n', 'red');
            resolve('kilocode:kilo-auto/free');
          }
        });
      } else {
        rl.close();
        log('\n❌ Invalid provider\n', 'red');
        resolve(null);
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'run':
      const model = args.find(a => a.startsWith('--model='))?.split('=')[1] || args[1] || 'kilocode:kilo-auto/free';
      const [provider, modelName] = model.split(':');
      
      const apiKey = process.env.QUANTYVAL_API_KEY || process.env.OPENROUTER_API_KEY;
      
      if (!apiKey) {
        log('\n⚠️  API key not set!', 'red');
        log('Set: export QUANTYVAL_API_KEY=your-key\n', 'dim');
        log('Or get a free key at: https://openrouter.ai/settings/keys\n', 'dim');
        break;
      }
      
      log('\n🤖 Starting chat with ' + provider + ':' + modelName, 'green');
      log('Type "exit" to quit\n', 'dim');
      
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      
      log('\nYou: ');
      for await (const line of rl) {
        if (line.trim().toLowerCase() === 'exit') break;
        
        // Simple echo for now - actual LLM integration needs Agent.js working
        log('\n[Demo] You said: ' + line, 'dim');
        log('\nYou: ');
      }
      
      rl.close();
      log('\nGoodbye!\n', 'green');
      break;
      
    case 'select':
      const selected = await selectModel();
      if (selected) {
        info('\n🚀 Run with: quantyval run --model=' + selected + '\n');
      } else {
        log('\nCancelled.\n', 'dim');
      }
      break;
      
    case 'models':
      listModels();
      break;
      
    case 'providers':
      listProviders();
      break;
      
    case 'help':
    default:
      showHelp();
  }
}

main();