// Quantyval AI - Cron Scheduler
// Scheduled tasks

import { createUnifiedAgent } from '../unified.js';
import { logger } from '../utils/logger.js';

export class CronJob {
  constructor(name, schedule, task) {
    this.name = name;
    this.schedule = schedule; // cron format or interval ms
    this.task = task;
    this.interval = null;
    this.running = false;
    this.lastRun = null;
    this.nextRun = null;
  }
  
  // Start job
  start() {
    if (typeof this.schedule === 'number') {
      // Interval in ms
      this.interval = setInterval(() => this.run(), this.schedule);
      logger.info(`Cron job "${this.name}" started (interval: ${this.schedule}ms)`);
    } else {
      // Simplified cron (minute interval)
      const mins = parseInt(this.schedule) || 1;
      this.interval = setInterval(() => this.run(), mins * 60 * 1000);
      logger.info(`Cron job "${this.name}" started (every ${mins} min)`);
    }
    this.running = true;
  }
  
  // Stop job
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    logger.info(`Cron job "${this.name}" stopped`);
  }
  
  // Run task
  async run() {
    this.lastRun = Date.now();
    logger.info(`Running cron job: ${this.name}`);
    
    try {
      if (typeof this.task === 'function') {
        await this.task();
      } else if (typeof this.task === 'string') {
        const agent = createUnifiedAgent({ name: 'CronWorker' });
        await agent.complete(this.task);
      }
    } catch (e) {
      logger.error(`Cron job "${this.name}" failed: ${e.message}`);
    }
  }
}

export class CronManager {
  constructor() {
    this.jobs = new Map();
  }
  
  // Add job
  add(name, schedule, task) {
    const job = new CronJob(name, schedule, task);
    this.jobs.set(name, job);
    return job;
  }
  
  // Start job
  start(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      return true;
    }
    return false;
  }
  
  // Stop job
  stop(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      return true;
    }
    return false;
  }
  
  // Start all
  startAll() {
    for (const job of this.jobs.values()) {
      if (!job.running) job.start();
    }
  }
  
  // Stop all
  stopAll() {
    for (const job of this.jobs.values()) {
      job.stop();
    }
  }
  
  // Get status
  getStatus() {
    const jobs = {};
    for (const [name, job] of this.jobs) {
      jobs[name] = {
        running: job.running,
        lastRun: job.lastRun,
        schedule: job.schedule,
      };
    }
    return jobs;
  }
}

// Common schedules
export const SCHEDULES = {
  everyMinute: 60000,
  every5Minutes: 300000,
  every15Minutes: 900000,
  everyHour: 3600000,
  everyDay: 86400000,
};

// Create manager
export function createCronManager() {
  return new CronManager();
}