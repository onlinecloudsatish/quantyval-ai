// Example: Using vyasa-u-code + 9Router with Quantyval
// Run: node examples/integrations/full-setup.js

import { Agent } from '../src/core/Agent.js';
import { createVyasaBridge, integrateVyasa } from '../src/integrations/VyasaBridge.js';
import { createNineRouterIntegration } from '../src/integrations/NineRouterIntegration.js';

async function main() {
  console.log('🔗 Quantyval + vyasa-u-code + 9Router Integration\n');
  
  // 1. Initialize 9Router integration
  console.log('1️⃣ Setting up 9Router...');
  const nineRouter = createNineRouterIntegration({
    baseUrl: 'http://localhost:20128/v1',
    enabled: true,
  });
  
  const isHealthy = await nineRouter.checkHealth();
  if (isHealthy) {
    console.log('   ✅ 9Router connected');
    const models = await nineRouter.getModels();
    console.log(`   📊 ${models.length} models available`);
  } else {
    console.log('   ⚠️ 9Router not running (start with: npm install -g 9router && 9router)');
  }
  
  // 2. Load vyasa-u-code skills
  console.log('\n2️⃣ Loading vyasa-u-code skills...');
  const vyasaBridge = new VyasaBridge({
    skillsPath: '/root/.openclaw/workspace/vyasa-u-code/skills',
  });
  
  await vyasaBridge.loadSkills();
  console.log(`   📚 ${vyasaBridge.listSkills().length} skills loaded`);
  
  for (const skill of vyasaBridge.listSkills()) {
    const s = vyasaBridge.getSkill(skill);
    console.log(`   - ${skill}: ${s.description.slice(0, 50)}...`);
  }
  
  // 3. Create Quantyval agent with both integrations
  console.log('\n3️⃣ Creating Quantyval agent...');
  const agent = new Agent({
    name: 'Quantyval-Integrated',
    systemPrompt: `You are Quantyval AI, enhanced with vyasa-u-code skills and 9Router smart routing.`,
    llm: null, // Will use 9Router when available
  });
  
  // Add vyasa skills to agent
  const skillCount = await vyasaBridge.addToSkillManager(agent.skillManager);
  console.log(`   ✅ Added ${skillCount} vyasa-u-code skills to agent`);
  
  console.log('\n4️⃣ Available models via 9Router:');
  if (isHealthy) {
    const models = await nineRouter.getModels();
    models.slice(0, 10).forEach(m => {
      console.log(`   - ${m.id}`);
    });
  }
  
  // 5. Test completion (if 9Router available)
  if (isHealthy) {
    console.log('\n5️⃣ Testing completion...');
    try {
      const response = await nineRouter.complete('Hello! What can you help me with?');
      console.log(`   🤖 Response: ${response.slice(0, 100)}...`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Integration Complete!');
  console.log('='.repeat(50));
  console.log('\nUsage:');
  console.log('- Agent has vyasa-u-code skills loaded');
  console.log('- 9Router provides smart routing when running');
  console.log('- Fallback: Subscription → Cheap → Free');
  console.log('\nTo start 9Router: npm install -g 9router && 9router');
}

main();