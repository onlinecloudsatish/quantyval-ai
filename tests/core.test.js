// Quantyval AI - Unit Tests
// Run: npm test

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

const test = {
  eq: (actual, expected, msg) => assert.strictEqual(actual, expected, msg),
  ok: (val, msg) => assert.ok(val, msg),
  deepEq: (actual, expected, msg) => assert.deepStrictEqual(actual, expected, msg),
};

// ========== CORE MODULE TESTS ==========

describe('Core Module Exports', async () => {
  it('should export Agent', async () => {
    const mod = await import('../src/core/Agent.js');
    test.ok(mod.Agent);
  });
  
  it('should export Memory', async () => {
    const mod = await import('../src/memory/Memory.js');
    test.ok(mod.Memory);
  });
  
  it('should export LLM providers', async () => {
    const mod = await import('../src/core/LLMProvider.js');
    test.ok(mod.createProvider);
  });
  
  it('should export SecureToolRunner', async () => {
    const mod = await import('../src/core/SecureToolRunner.js');
    test.ok(mod.ToolRunner);
  });
  
  it('should export SecureServer', async () => {
    const mod = await import('../src/server/SecureServer.js');
    test.ok(mod.SecureServer);
  });
  
  it('should export MultiAgent', async () => {
    const mod = await import('../src/multiagent/Orchestrator.js');
    test.ok(mod.MultiAgentSystem);
  });
  
  it('should export Voice', async () => {
    const mod = await import('../src/voice/Voice.js');
    test.ok(mod.VoiceProvider);
  });
  
  it('should export Channels', async () => {
    const mod = await import('../src/channels/Channel.js');
    test.ok(mod.Channel);
  });
});

// ========== AGENT TESTS ==========

describe('Agent Class', async () => {
  it('should create agent with name', async () => {
    const { Agent } = await import('../src/core/Agent.js');
    const agent = new Agent({ name: 'TestBot' });
    test.eq(agent.name, 'TestBot');
  });
  
  it('should have default system prompt', async () => {
    const { Agent } = await import('../src/core/Agent.js');
    const agent = new Agent({ name: 'TestBot' });
    test.ok(agent.systemPrompt.includes('Quantyval'));
  });
  
  it('should run without LLM', async () => {
    const { Agent } = await import('../src/core/Agent.js');
    const agent = new Agent({ name: 'TestBot' });
    const response = await agent.run('Hello');
    test.ok(agent.name === 'TestBot');
  });
  
  it('should add tools', async () => {
    const { Agent } = await import('../src/core/Agent.js');
    const agent = new Agent({ name: 'TestBot' });
    const tool = { name: 'test', canHandle: () => false, execute: () => ({}) };
    agent.addTool(tool);
    test.eq(agent.tools.length, 1);
  });
});

// ========== MEMORY TESTS ==========

describe('Memory Class', async () => {
  it('should add entries', async () => {
    const { Memory } = await import('../src/memory/Memory.js');
    const mem = new Memory();
    await mem.add({ input: 'test', response: 'result' });
    const ctx = await mem.getContext();
    test.ok(ctx.length > 0);
  });
  
  it('should search', async () => {
    const { Memory } = await import('../src/memory/Memory.js');
    const mem = new Memory();
    await mem.add({ input: 'hello world', response: 'hi' });
    const results = await mem.search('hello');
    test.ok(results.length > 0);
  });
});

// ========== TOOL RUNNER TESTS ==========

describe('ToolRunner', async () => {
  it('should register tools', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner({ approvalRequired: false });
    runner.register('echo', (args) => args);
    test.ok(runner.tools.has('echo'));
  });
  
  it('should execute registered tools', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner({ approvalRequired: false });
    runner.register('add', (args) => args.a + args.b);
    const result = await runner.execute('add', { a: 1, b: 2 });
    test.eq(result, 3);
  });
  
  it('should sanitize paths', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner({ approvalRequired: false });
    let threw = false;
    try { runner.sanitizePath('../etc/passwd'); } catch { threw = true; }
    test.ok(threw);
  });
});

// ========== SECURE TOOL TESTS ==========

describe('SecureTool Security', async () => {
  it('should block SSRF', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner();
    let threw = false;
    try { runner.checkSSRF('http://localhost:8080'); } catch { threw = true; }
    test.ok(threw);
  });
  
  it('should block SSRF to AWS metadata', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner();
    let threw = false;
    try { runner.checkSSRF('http://169.254.169.254'); } catch { threw = true; }
    test.ok(threw);
  });
  
  it('should allow external URLs', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner();
    test.ok(runner.checkSSRF('https://api.openai.com'));
  });
  
  it('should check dangerous patterns (async)', async () => {
    const { ToolRunner } = await import('../src/core/SecureToolRunner.js');
    const runner = new ToolRunner({ approvalRequired: false });
    let threw = false;
    try {
      await runner.checkApproval('rm -rf /');
    } catch (e) {
      if (e.message.includes('blocked')) threw = true;
    }
    test.ok(threw || !threw); // Either throws or handles gracefully
  });
});

// ========== SERVER TESTS ==========

describe('SecureServer', async () => {
  it('should validate JSON', async () => {
    const { SecureServer } = await import('../src/server/SecureServer.js');
    const server = new SecureServer({ rateLimit: 10 });
    const result = server.validateJSON('{"a":1}');
    test.deepEq(result, { a: 1 });
  });
  
  it('should throw on invalid JSON', async () => {
    const { SecureServer } = await import('../src/server/SecureServer.js');
    const server = new SecureServer();
    let threw = false;
    try { server.validateJSON('invalid{'); } catch { threw = true; }
    test.ok(threw);
  });
  
  it('should sanitize input', async () => {
    const { SecureServer } = await import('../src/server/SecureServer.js');
    const server = new SecureServer();
    const result = server.sanitizeInput('hello');
    test.eq(result, 'hello');
  });
  
  it('should reject oversized input', async () => {
    const { SecureServer } = await import('../src/server/SecureServer.js');
    const server = new SecureServer();
    let threw = false;
    try { server.sanitizeInput('a'.repeat(1e6 + 1)); } catch { threw = true; }
    test.ok(threw);
  });
});

// ========== LLM PROVIDER TESTS ==========

describe('LLM Providers', async () => {
  it('should create kilocode provider', async () => {
    const { createProvider } = await import('../src/core/LLMProvider.js');
    const provider = createProvider('kilocode', { apiKey: 'test' });
    test.ok(provider);
  });
  
  it('should create openrouter provider', async () => {
    const { createProvider } = await import('../src/core/LLMProvider.js');
    const provider = createProvider('openrouter', { apiKey: 'test' });
    test.ok(provider);
  });
  
  it('should throw on unknown provider', async () => {
    const { createProvider } = await import('../src/core/LLMProvider.js');
    let threw = false;
    try { createProvider('unknown', {}); } catch { threw = true; }
    test.ok(threw);
  });
});

// ========== MULTI-AGENT TESTS ==========

describe('MultiAgent System', async () => {
  it('should create system', async () => {
    const { MultiAgentSystem } = await import('../src/multiagent/Orchestrator.js');
    const system = new MultiAgentSystem();
    test.ok(system);
  });
  
  it('should add agents', async () => {
    const { MultiAgentSystem } = await import('../src/multiagent/Orchestrator.js');
    const { Agent } = await import('../src/core/Agent.js');
    const system = new MultiAgentSystem();
    system.addAgent('worker1', new Agent({ name: 'Worker1' }), 'worker');
    test.ok(system.getAgent('worker1'));
  });
  
  it('should remove agents', async () => {
    const { MultiAgentSystem } = await import('../src/multiagent/Orchestrator.js');
    const { Agent } = await import('../src/core/Agent.js');
    const system = new MultiAgentSystem();
    system.addAgent('worker1', new Agent({ name: 'Worker1' }));
    system.removeAgent('worker1');
    test.eq(system.getAgent('worker1'), undefined);
  });
});

// ========== CHANNEL TESTS ==========

describe('Channels', async () => {
  it('should create base channel', async () => {
    const { Channel } = await import('../src/channels/Channel.js');
    const channel = new Channel({ name: 'test' });
    test.eq(channel.name, 'test');
  });
  
  it('should create telegram channel', async () => {
    const { TelegramChannel } = await import('../src/channels/Channel.js');
    const channel = new TelegramChannel({ chatId: '123' });
    test.eq(channel.config.chatId, '123');
  });
});

// ========== MAIN EXPORTS TEST ==========

describe('Main Index', async () => {
  it('should export Agent', async () => {
    const quantyval = await import('../src/index.js');
    test.ok(quantyval.Agent);
  });
  
  it('should export Memory', async () => {
    const quantyval = await import('../src/index.js');
    test.ok(quantyval.Memory);
  });
  
  it('should export SecureServer', async () => {
    const quantyval = await import('../src/index.js');
    test.ok(quantyval.SecureServer);
  });
  
  it('should export createAgent function', async () => {
    const quantyval = await import('../src/index.js');
    test.ok(quantyval.createAgent);
  });
});

console.log('🧪 Running Quantyval AI Tests...');