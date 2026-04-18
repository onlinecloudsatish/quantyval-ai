// Quantyval AI - Workflow System
// Multi-step task pipelines

import { createUnifiedAgent } from '../unified.js';
import { logger } from '../utils/logger.js';

export class Workflow {
  constructor(config = {}) {
    this.name = config.name || 'Workflow';
    this.steps = [];
    this.context = {};
  }
  
  // Add a step
  addStep(name, action, options = {}) {
    this.steps.push({
      name,
      action, // function or string (prompt)
      condition: options.condition, // function that returns boolean
      onError: options.onError || 'stop', // stop, continue, retry
      maxRetries: options.maxRetries || 0,
    });
    return this;
  }
  
  // Add condition step
  addCondition(name, checkFn, trueStep, falseStep) {
    this.steps.push({
      name,
      type: 'condition',
      check: checkFn,
      trueStep,
      falseStep,
    });
    return this;
  }
  
  // Add parallel steps
  addParallel(name, actions) {
    this.steps.push({
      name,
      type: 'parallel',
      actions,
    });
    return this;
  }
  
  // Execute workflow
  async execute(initialInput, variables = {}) {
    this.context = { ...variables, input: initialInput, results: {} };
    logger.info(`Starting workflow: ${this.name}`);
    
    let stepIndex = 0;
    
    while (stepIndex < this.steps.length) {
      const step = this.steps[stepIndex];
      logger.info(`Step ${stepIndex + 1}: ${step.name}`);
      
      try {
        // Handle conditions
        if (step.type === 'condition') {
          const result = await step.check(this.context);
          if (result) {
            const nextStep = this.steps.find(s => s.name === step.trueStep);
            stepIndex = nextStep ? this.steps.indexOf(nextStep) : stepIndex + 1;
          } else {
            const nextStep = this.steps.find(s => s.name === step.falseStep);
            stepIndex = nextStep ? this.steps.indexOf(nextStep) : stepIndex + 1;
          }
          continue;
        }
        
        // Handle parallel
        if (step.type === 'parallel') {
          const agent = createUnifiedAgent({ name: 'ParallelWorker' });
          const promises = step.actions.map(async (action) => {
            return agent.complete(typeof action === 'string' ? action : action(this.context));
          });
          const results = await Promise.all(promises);
          this.context.results[step.name] = results;
        }
        
        // Regular step
        let result;
        if (typeof step.action === 'function') {
          result = await step.action(this.context);
        } else if (typeof step.action === 'string') {
          const agent = createUnifiedAgent({ name: `Step-${step.name}` });
          result = await agent.complete(step.action.replace(/\{\{(\w+)\}\}/g, (_, k) => this.context[k]));
        }
        
        this.context.results[step.name] = result;
        this.context.previous = result;
        stepIndex++;
        
      } catch (e) {
        logger.error(`Step ${step.name} failed: ${e.message}`);
        
        if (step.onError === 'stop') {
          throw e;
        } else if (step.onError === 'retry' && step.maxRetries > 0) {
          step.maxRetries--;
          logger.info(`Retrying step: ${step.name}`);
        } else {
          stepIndex++;
        }
      }
    }
    
    logger.info(`Workflow ${this.name} completed`);
    return this.context;
  }
}

// Factory for common workflows
export function createWorkflow(name) {
  return new Workflow({ name });
}

// Example workflows
export const EXAMPLE_WORKFLOWS = {
  codeReview: () => new Workflow({ name: 'CodeReview' })
    .addStep('analyze', 'Analyze this code for bugs and issues')
    .addStep('test', 'Suggest test cases for the code'),
  
  deploy: () => new Workflow({ name: 'Deploy' })
    .addStep('build', 'Build the project')
    .addStep('test', 'Run tests')
    .addStep('deploy', 'Deploy to production'),
  
  research: () => new Workflow({ name: 'Research' })
    .addStep('search', 'Search for information on {{topic}}')
    .addStep('summarize', 'Summarize the findings'),
};