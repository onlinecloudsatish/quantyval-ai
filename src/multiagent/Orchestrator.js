// Quantyval AI - Multi-Agent Orchestration
// Coordinate multiple agents for complex tasks

import { Agent } from '../core/Agent.js';

export class MultiAgentSystem {
  constructor(config = {}) {
    this.agents = new Map();
    this.hub = config.hub || null;
    this.strategy = config.strategy || 'sequential'; // sequential, parallel, hierarchical
  }

  addAgent(id, agent, role = 'worker') {
    this.agents.set(id, { agent, role });
  }

  removeAgent(id) {
    this.agents.delete(id);
  }

  getAgent(id) {
    return this.agents.get(id)?.agent;
  }

  async run(input, options = {}) {
    const strategy = options.strategy || this.strategy;

    switch (strategy) {
      case 'parallel':
        return this.runParallel(input);
      case 'hierarchical':
        return this.runHierarchical(input);
      default:
        return this.runSequential(input);
    }
  }

  // Sequential: one agent after another
  async runSequential(input) {
    const results = [];
    
    for (const [id, { agent }] of this.agents) {
      const result = await agent.run(input, { 
        priorResults: results 
      });
      results.push({ id, result });
    }

    return this.summarize(results);
  }

  // Parallel: all agents work simultaneously
  async runParallel(input) {
    const tasks = [];
    
    for (const [id, { agent }] of this.agents) {
      tasks.push(
        agent.run(input).then(result => ({ id, result }))
      );
    }

    const results = await Promise.all(tasks);
    return this.summarize(results);
  }

  // Hierarchical: manager delegates to workers
  async runHierarchical(input) {
    // Find manager agent
    const manager = [...this.agents.values()].find(a => a.role === 'manager');
    const workers = [...this.agents.entries()].filter(([_, a]) => a.role === 'worker');

    if (!manager) {
      throw new Error('No manager agent found for hierarchical mode');
    }

    // Manager analyzes and assigns
    const plan = await manager.agent.run(input, { 
      task: 'analyze and create sub-tasks',
      workers: workers.map(([id]) => id),
    });

    // Execute sub-tasks in parallel
    const workerPromises = plan.subtasks?.map(async (task) => {
      const worker = workers.find(([id]) => id === task.assignee);
      if (!worker) return null;
      
      return worker.agent.run(task.input).then(result => ({
        assignee: task.assignee,
        result,
      }));
    }) || [];

    const workerResults = await Promise.all(workerPromises);

    // Manager synthesizes
    const final = await manager.agent.run(JSON.stringify(workerResults), {
      task: 'synthesize results',
    });

    return { plan, workerResults, final };
  }

  summarize(results) {
    return {
      agentCount: this.agents.size,
      results,
      timestamp: Date.now(),
    };
  }

  // Hub communication for agent-to-agent messaging
  async send(fromId, toId, message) {
    const from = this.agents.get(fromId)?.agent;
    const to = this.agents.get(toId)?.agent;
    
    if (!from || !to) {
      throw new Error('Agent not found');
    }

    return from.run(message);
  }

  // Broadcast to all agents
  async broadcast(message) {
    const tasks = [];
    
    for (const [id, { agent }] of this.agents) {
      tasks.push(
        agent.run(message).then(result => ({ id, result }))
      );
    }

    return Promise.all(tasks);
  }
}

// Supervisor agent that manages other agents
export class SupervisorAgent extends Agent {
  constructor(config = {}) {
    super(config);
    this.workers = config.workers || [];
    this.supervisorPrompt = config.supervisorPrompt || 
      'You are a supervisor. Analyze the task and delegate to the appropriate worker.';
  }

  async reason(input, state) {
    // Analyze task
    const analysis = await this.llm?.complete(
      `${this.supervisorPrompt}\n\nTask: ${input}\n\nAvailable workers: ${this.workers.join(', ')}`
    );

    // Determine which worker
    const workerId = this.selectWorker(analysis);
    const worker = this.workers.find(w => w.id === workerId);

    if (!worker) {
      return { text: analysis, agent: this.name };
    }

    // Delegate
    const result = await worker.agent.run(input, state);
    
    // Synthesize
    const response = await this.llm?.complete(
      `Original task: ${input}\nWorker result: ${result}\n\nProvide final answer:`
    );

    return { text: response || result, delegatedTo: workerId };
  }

  selectWorker(analysis) {
    // Simple selection based on keywords
    // TODO: More sophisticated selection
    const worker = this.workers[0];
    return worker?.id;
  }

  addWorker(agent, id) {
    this.workers.push({ id, agent });
  }
}

// Agent pool for scaling
export class AgentPool {
  constructor(config = {}) {
    this.size = config.size || 3;
    this.template = config.template || null;
    this.pool = [];
  }

  async acquire() {
    if (this.pool.length < this.size) {
      const agent = new Agent(this.template);
      this.pool.push(agent);
      return agent;
    }

    // Simple round-robin for now
    // TODO: Better load balancing
    return this.pool[Math.floor(Math.random() * this.pool.length)];
  }

  release(agent) {
    // No-op for simple pool
  }

  async runAll(input) {
    const tasks = this.pool.map(a => a.run(input));
    return Promise.all(tasks);
  }
}

// Workflow orchestration
export class Workflow {
  constructor(steps = []) {
    this.steps = steps;
  }

  addStep(name, agent, condition = null) {
    this.steps.push({ name, agent, condition });
  }

  async execute(input) {
    const context = { input };
    const results = [];

    for (const step of this.steps) {
      // Check condition
      if (step.condition && !step.condition(context)) {
        continue;
      }

      // Execute step
      const result = await step.agent.run(context.input, {
        ...context,
        step: step.name,
      });

      results.push({ step: step.name, result });
      context.input = result.text || result;
    }

    return results;
  }
}