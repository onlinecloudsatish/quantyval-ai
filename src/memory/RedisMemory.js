// Quantyval AI - Redis Adapter
// Persistent memory storage with Redis

import { logger } from '../utils/logger.js';

export class RedisMemory {
  constructor(config = {}) {
    this.url = config.url || process.env.REDIS_URL || 'redis://localhost:6379';
    this.prefix = config.prefix || 'quantyval:memory:';
    this.ttl = config.ttl || 86400; // 24 hours default
    this.client = null;
    this.connected = false;
  }
  
  // Connect to Redis
  async connect() {
    try {
      const redis = await import('redis');
      this.client = redis.createClient({ url: this.url });
      this.client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
      await this.client.connect();
      this.connected = true;
      logger.info('Redis memory connected');
    } catch (e) {
      logger.warn('Redis not available, using in-memory fallback');
      this.connected = false;
      this.fallback = new Map();
    }
  }
  
  // Store a memory
  async set(key, value, ttl = this.ttl) {
    const fullKey = this.prefix + key;
    const data = JSON.stringify(value);
    
    if (this.connected && this.client) {
      await this.client.setEx(fullKey, ttl, data);
    } else {
      this.fallback.set(fullKey, { data, expires: Date.now() + ttl * 1000 });
    }
  }
  
  // Retrieve memory
  async get(key) {
    const fullKey = this.prefix + key;
    
    if (this.connected && this.client) {
      const data = await this.client.get(fullKey);
      return data ? JSON.parse(data) : null;
    } else {
      const item = this.fallback.get(fullKey);
      if (item && item.expires > Date.now()) {
        return JSON.parse(item.data);
      }
      this.fallback.delete(fullKey);
      return null;
    }
  }
  
  // Delete memory
  async delete(key) {
    const fullKey = this.prefix + key;
    
    if (this.connected && this.client) {
      await this.client.del(fullKey);
    } else {
      this.fallback.delete(fullKey);
    }
  }
  
  // List keys (with pattern)
  async keys(pattern = '*') {
    const fullPattern = this.prefix + pattern;
    
    if (this.connected && this.client) {
      return this.client.keys(fullPattern).then(keys => 
        keys.map(k => k.replace(this.prefix, ''))
      );
    } else {
      return Array.from(this.fallback.keys())
        .filter(k => k.includes(pattern.replace('*', '')))
        .map(k => k.replace(this.prefix, ''));
    }
  }
  
  // Add to conversation history
  async addConversation(userId, message) {
    const key = `conversation:${userId}`;
    const history = await this.get(key) || [];
    history.push({ ...message, timestamp: Date.now() });
    
    // Keep last 100 messages
    const trimmed = history.slice(-100);
    await this.set(key, trimmed, this.ttl * 7); // 7 days
  }
  
  // Get conversation history
  async getHistory(userId, limit = 50) {
    const key = `conversation:${userId}`;
    const history = await this.get(key) || [];
    return history.slice(-limit);
  }
  
  // Store user preference
  async setPreference(userId, key, value) {
    const prefKey = `pref:${userId}:${key}`;
    await this.set(prefKey, value, this.ttl * 30); // 30 days
  }
  
  // Get user preference
  async getPreference(userId, key) {
    const prefKey = `pref:${userId}:${key}`;
    return this.get(prefKey);
  }
  
  // Close connection
  async close() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

// Create Redis memory instance
export function createRedisMemory(config = {}) {
  return new RedisMemory(config);
}