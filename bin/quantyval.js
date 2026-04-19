#!/usr/bin/env node
/**
 * Quantyval CLI Entry Point
 */

const C = { g: '\x1b[32m', c: '\x1b[36m', r: '\x1b[31m', y: '\x1b[33m', z: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' };
const log = m => console.log(m);
const header = m => log(C.bold + m + C.z);

header('\n╔══════════════════════════════════════════════════════╗');
header('║   🤖 Quantyval AI + vyasa-u-code Unified Framework ║');
header('║   Smart LLM Routing + vyasa Skills + 12+ Providers  ║');
header('╚══════════════════════════════════════════════════════╝\n');

const args = process.argv.slice(2);
const command = args[0];

const { spawn } = require('child_process');
const path = require('path');

// Get the package directory (parent of bin)
const binDir = __dirname;
const pkgDir = path.dirname(binDir);
const cliPath = path.join(pkgDir, 'bin', 'cli.js');

switch (command) {
  case 'run':
  case 'select':
  case 'models':
  case 'providers':
    const child = spawn('node', [cliPath, command, ...args.slice(1)], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false
    });
    child.on('exit', (code) => process.exit(code || 0));
    break;
    
  default:
    log('Usage: quantyval <command> [options]', 'dim');
    log('\nCommands:', 'bright');
    log('  run           Start interactive chat', 'dim');
    log('  select       Interactive model selection', 'dim');
    log('  models       List available models', 'dim');
    log('  providers    List LLM providers', 'dim');
    console.log('');
}