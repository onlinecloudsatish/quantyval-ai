// Test all LLM providers
// Run: node tests/test-providers.js

import { createProvider, getProviders, getDefaultProvider } from '../src/core/LLMProvider.js';
import { logger } from '../src/utils/logger.js';

const testPrompt = "Hello! What is 2+2? Answer in one sentence.";

async function testProvider(name, config) {
  try {
    logger.info(`Testing ${name}...`, { model: config.model });
    
    const provider = createProvider(name, {
      ...config,
      apiKey: config.apiKey || process.env.QUANTYVAL_API_KEY,
    });
    
    const start = Date.now();
    const response = await provider.complete(testPrompt);
    const duration = Date.now() - start;
    
    logger.info(`✅ ${name}: ${response.slice(0, 80)}...`, { duration: `${duration}ms` });
    return { success: true, response, duration };
  } catch (err) {
    logger.error(`❌ ${name}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('LLM Provider Test Suite');
  logger.info('='.repeat(50));
  
  const providers = getProviders();
  const results = [];
  
  // Test each provider
  for (const name of providers) {
    // Skip local/requires special setup
    if (name === 'ollama') {
      logger.info(`⏭️ ${name}: Skipped (requires local server)`);
      continue;
    }
    if (name === 'azure') {
      logger.info(`⏭️ ${name}: Skipped (requires Azure config)`);
      continue;
    }
    
    const result = await testProvider(name, {});
    results.push({ name, ...result });
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  logger.info('='.repeat(50));
  logger.info('Results:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  logger.info(`✅ Passed: ${passed}`);
  logger.info(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    logger.info('Failed providers:');
    results.filter(r => !r.success).forEach(r => {
      logger.info(`  - ${r.name}: ${r.error}`);
    });
  }
  
  // Show default
  logger.info('='.repeat(50));
  logger.info(`Default provider: ${JSON.stringify(getDefaultProvider())}`);
}

main();