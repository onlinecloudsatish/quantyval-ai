// Quantyval AI - Multi-Agent Workers System
// Spawn and manage multiple parallel agents

import { createUnifiedAgent } from '../unified.js';
import { logger } from '../utils/logger.js';

export class WorkerPool {
  constructor(config = {}) {
    this.maxWorkers = config.maxWorkers || 5;
    this.workers = new Map();
    this.queue = [];
    this.stats = { completed: 0, failed: 0, active: 0 };
  }
  
  // Spawn a new worker agent
  spawn(id, config = {}) {
    if (this.workers.size >= this.maxWorkers) {
      throw new Error(`Max workers (${this.maxWorkers}) reached`);
    }
    
    const agent = createUnifiedAgent({
      name: config.name || `Worker-${id}`,
      apiKey: config.apiKey,
      provider: config.provider,
      model: config.model,
    });
    
    this.workers.set(id, {
      agent,
      status: 'idle',
      task: null,
      startTime: null,
    });
    
    logger.info(`Worker ${id} spawned`);
    return this.workers.get(id).agent;
  }
  
  // Submit task to worker
  async submit(workerId, task) {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Worker ${workerId} not found`);
    
    if (worker.status !== 'idle') {
      throw new Error(`Worker ${workerId} is busy`);
    }
    
    worker.status = 'busy';
    worker.task = task;
    worker.startTime = Date.now();
    this.stats.active++;
    
    try {
      const result = await worker.agent.complete(task);
      this.stats.completed++;
      worker.status = 'idle';
      worker.task = null;
      worker.startTime = null;
      this.stats.active--;
      return result;
    } catch (e) {
      this.stats.failed++;
      worker.status = 'idle';
      this.task = null;
      this.stats.active--;
      throw e;
    }
  }
  
  // Run tasks in parallel across workers
  async runParallel(tasks, options = {}) {
    const results = [];
    const concurrency = options.concurrency || this.maxWorkers;
    
    // Process in batches
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchPromises = [];
      
      for (let j = 0; j < batch.length; j++) {
        const workerId = `auto-${i + j}`;
        
        // Spawn worker if needed
        if (!this.workers.has(workerId)) {
          this.spawn(workerId, options);
        }
        
        batchPromises.push(
          this.submit(workerId, batch[j]).catch(e => ({ error: e.message }))
        );
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  // Get worker status
  getStatus() {
    const workers = {};
    for (const [id, w] of this.workers) {
      workers[id] = { status: w.status, task: w.task };
    }
    return {
      workers,
      stats: this.stats,
      queueLength: this.queue.length,
    };
  }
  
  // Kill a worker
  kill(workerId) {
    if (this.workers.delete(workerId)) {
      logger.info(`Worker ${workerId} terminated`);
      return true;
    }
    return false;
  }
  
  // Kill all workers
  killAll() {
    this.workers.clear();
    logger.info('All workers terminated');
  }
}

// Task queue with priority
export class TaskQueue {
  constructor() {
    this.tasks = [];
  }
  
  add(task, priority = 0) {
    this.tasks.push({ task, priority, addedAt: Date.now() });
    this.tasks.sort((a, b) => b.priority - a.priority);
  }
  
  next() {
    return this.tasks.shift();
  }
  
  size() {
    return this.tasks.length;
  }
  
  clear() {
    this.tasks = [];
  }
}

// Create worker pool
export function createWorkerPool(config = {}) {
  return new WorkerPool(config);
}