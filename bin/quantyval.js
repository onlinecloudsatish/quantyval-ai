#!/usr/bin/env node
/**
 * Quantyval + vyasa-u-code Unified CLI
 * Usage:
 *   quantyval run                    - Interactive chat
 *   quantyval select                - Interactive model selection
 *   quantyval models                - List available models
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Banner
const C = { g: '\x1b[32m', c: '\x1b[36m', r: '\x1b[31m', y: '\x1b[33m', z: '\x1b[0m', bold: '\x1b[1m' };
const log = m => console.log(m);
const info = m => log(C.c + m + C.z);
const success = m => log(C.g + m + C.z);
const header = m => log(C.bold + m + C.z);

header('\n╔══════════════════════════════════════════════════════╗');
header('║   🤖 Quantyval AI + vyasa-u-code Unified Framework ║');
header('║   Smart LLM Routing + vyasa Skills + 12+ Providers  ║');
header('╚══════════════════════════════════════════════════════╝\n');

const args = process.argv.slice(2);
const command = args[0];

// Simple commands that don't need core modules
async function showHelp() {
  log('Usage: quantyval <command> [options]', 'dim');
  log('\nCommands:', 'bright');
  log('  run [options]   Start interactive chat', 'dim');
  log('  select         Interactive model selection', 'dim');
  log('  models         List available models', 'dim');
  log('  providers      List LLM providers', 'dim');
  log('\nOptions:', 'bright');
  log('  --model=<p:m>  Provider:model', 'dim');
  console.log('');
}

function listProviders() {
  const providers = [
    { id: 'kilocode', name: 'KiloCode', desc: 'Free tier, kilo-auto models' },
    { id: 'openrouter', name: 'OpenRouter', desc: 'Access 100+ models' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT-4, GPT-4o, o1' },
    { id: 'anthropic', name: 'Anthropic', desc: 'Claude models' },
    { id: 'groq', name: 'Groq', desc: 'Fast inference' },
    { id: 'gemini', name: 'Google Gemini', desc: 'Gemini models' },
    { id: 'mistral', name: 'Mistral', desc: 'Mistral models' },
    { id: '9router', name: '9Router', desc: 'Alternative routing' },
  ];
  
  log('\nAvailable LLM Providers:', 'green');
  log('='.repeat(40), 'dim');
  
  for (const p of providers) {
    log(` • ${p.id.padEnd(12)} ${p.name} - ${p.desc}`, 'dim');
  }
  console.log('');
}

async function main() {
  const { spawn } = await import('child_process');
  const pkgDir = path.resolve(__dirname);
  
  switch (command) {
    case 'run':
    case 'chat':
    case 'select':
    case 'models':
      const cliPath = path.join(pkgDir, 'cli.js');
      const child = spawn('node', [cliPath, command, ...args.slice(1)], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
      child.on('exit', (code) => process.exit(code || 0));
      break;
      
    case 'providers':
      listProviders();
      break;
      
    case 'help':
    default:
      showHelp();
  }
}

main().catch(e => {
  console.error(C.r + e.message + C.z);
  process.exit(1);
});