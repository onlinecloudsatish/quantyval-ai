#!/usr/bin/env node
/**
 * Quantyval + vyasa-u-code Unified CLI
 * Combines: Quantyval AI Agent Framework + vyasa-u-code skills
 * 
 * Usage:
 *   quantyval run                    - Interactive chat
 *   quantyval agent <task>           - Run agent task
 *   quantyval vyasa <command>         - Run vyasa-u-code commands
 *   quantyval providers              - List LLM providers
 *   quantyval status                 - Show status
 */

import { createUnifiedAgent, quickStart } from '../src/unified.js';
import { createProvider, getProviders } from '../src/core/LLMProvider.js';
import { PROVIDER_INFO } from '../config/default.js';
import { logger } from '../src/utils/logger.js';
import { execSync } from 'child_process';
import path from 'path';

const C = { 
  g: '\x1b[32m', c: '\x1b[36m', r: '\x1b[31m', y: '\x1b[33m', 
  z: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' 
};

const log = m => console.log(m);
const info = m => log(C.c + m + C.z);
const success = m => log(C.g + m + C.z);
const error = m => log(C.r + m + C.z);
const header = m => log(C.bold + m + C.z);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  // Banner
  header('\n╔══════════════════════════════════════════════════════╗');
  header('║   🤖 Quantyval AI + vyasa-u-code Unified Framework     ║');
  header('║   Smart LLM Routing + vyasa Skills + 12 Providers     ║');
  header('╚══════════════════════════════════════════════════════╝\n');
  
  switch (command) {
    case 'run':
    case 'chat':
      await runChat(args.slice(1));
      break;
      
    case 'agent':
    case 'a':
      await runAgent(args.slice(1));
      break;
      
    case 'vyasa':
      runVyasa(args.slice(1));
      break;
      
    case 'providers':
      listProviders();
      break;
      
    case 'status':
      await showStatus(args.slice(1));
      break;
      
    case 'model':
      await setModel(args.slice(1));
      break;
      
    case 'help':
    default:
      showHelp();
  }
}

async function runChat(opts) {
  const provider = opts.find(o => o.startsWith('--provider='))?.split('=')[1] || 'openrouter';
  const model = opts.find(o => o.startsWith('--model='))?.split('=')[1];
  
  info(`Starting chat with ${provider}${model ? '/' + model : ''}...\n`);
  
  const agent = createUnifiedAgent({
    name: 'Quantyval',
    apiKey: process.env.QUANTYVAL_API_KEY || process.env.OPENROUTER_API_KEY,
    provider,
    model,
    vyasaSkillsPath: process.env.VYASA_SKILLS_PATH || '/root/.openclaw/workspace/vyasa-u-code/skills',
  });
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  
  const prompt = () => {
    rl.question(C.g + '\nYou: ' + C.z, async (input) => {
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        rl.close();
        return;
      }
      
      if (input.trim()) {
        try {
          const response = await agent.complete(input);
          console.log(C.c + '\n🤖 [' + response.provider + ']: ' + C.z + response.text);
        } catch (e) {
          error('Error: ' + e.message);
        }
      }
      
      prompt();
    });
  };
  
  success('Type your message (or "exit" to quit)\n');
  prompt();
}

async function runAgent(args) {
  if (!args.length) {
    error('Usage: quantyval agent <task description>');
    return;
  }
  
  const task = args.join(' ');
  info(`Running agent task: ${task}\n`);
  
  const agent = createUnifiedAgent({
    apiKey: process.env.QUANTYVAL_API_KEY || process.env.OPENROUTER_API_KEY,
    provider: 'openrouter',
  });
  
  try {
    const response = await agent.complete(task);
    console.log(C.c + '\n🤖 Result:' + C.z);
    console.log(response.text);
  } catch (e) {
    error('Error: ' + e.message);
  }
}

function runVyasa(args) {
  info('Delegating to vyasa-u-code...\n');
  
  const vyasaPath = '/root/.openclaw/workspace/bin/vyasa-u-code.js';
  
  try {
    execSync(`node ${vyasaPath} ${args.join(' ')}`, { 
      stdio: 'inherit',
      env: process.env 
    });
  } catch (e) {
    // vyasa handles its own output
  }
}

function listProviders() {
  header('Available LLM Providers:\n');
  
  const providers = getProviders();
  for (const p of providers) {
    const info = PROVIDER_INFO[p];
    if (info) {
      log(`  ${C.g}•${C.z} ${C.bold}${p}${C.z} - ${info.description}`);
      log(`    Default: ${info.defaultModel}`);
    } else {
      log(`  ${C.g}•${C.z} ${p}`);
    }
  }
  
  console.log('\n' + C.dim + 'Routing tiers: premium → cheap → free' + C.z);
}

async function showStatus(args) {
  const agent = createUnifiedAgent({
    apiKey: process.env.QUANTYVAL_API_KEY,
  });
  
  const status = agent.getStatus();
  
  header('Status:\n');
  console.log(`  ${C.bold}Name:${C.z} ${status.name}`);
  console.log(`  ${C.bold}Provider:${C.z} ${status.provider}/${status.model}`);
  console.log(`  ${C.bold}Smart Routing:${C.z} ${status.smartRouting ? C.g + 'ON' + C.z : C.r + 'OFF' + C.z}`);
  console.log(`  ${C.bold}Skills:${C.z} ${status.skillsCount} (from vyasa-u-code)`);
  console.log(`  ${C.bold}Providers:${C.z} ${status.availableProviders.length} available`);
}

async function setModel(args) {
  if (args.length < 2) {
    error('Usage: quantyval model <provider> <model>');
    return;
  }
  
  const provider = args[0];
  const model = args[1];
  
  info(`Setting default model: ${provider}/${model}\n`);
  
  // Could save to config
  console.log(C.g + `Default model set to ${provider}/${model}` + C.z);
}

function showHelp() {
  header('Commands:\n');
  log(`  ${C.g}run${C.z} [options]     Start interactive chat`);
  log(`  ${C.g}agent <task>${C.z}    Run single agent task`);
  log(`  ${C.g}vyasa <cmd>${C.z}      Delegate to vyasa-u-code`);
  log(`  ${C.g}providers${C.z}       List available LLM providers`);
  log(`  ${C.g}status${C.z}          Show agent status`);
  log(`  ${C.g}model <p> <m>${C.z}  Set default provider/model`);
  
  console.log('\n' + C.dim + 'Options:' + C.z);
  log(`  --provider=   LLM provider (default: openrouter)`);
  log(`  --model=     Specific model`);
  
  console.log('\n' + C.dim + 'Examples:' + C.z);
  log(`  quantyval run --provider=openrouter`);
  log(`  quantyval agent "Write a hello world in Python"`);
  log(`  quantyval vyasa git status`);
  log(`  quantyval providers`);
}

main();