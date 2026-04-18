// Quantyval AI - Database Adapter
// SQLite/Postgres persistence

import { createUnifiedAgent } from '../unified.js';
import { logger } from '../utils/logger.js';

export class Database {
  constructor(config = {}) {
    this.type = config.type || 'sqlite';
    this.path = config.path || './quantyval.db';
    this.client = null;
    this.connected = false;
  }
  
  // Connect (simulated for now - add better-sqlite3 or pg later)
  async connect() {
    try {
      // Try better-sqlite3
      const Database = (await import('better-sqlite3')).default;
      this.client = new Database(this.path);
      this.connected = true;
      logger.info(`Connected to SQLite: ${this.path}`);
    } catch (e) {
      // Fallback to in-memory
      this.client = new Map();
      this.connected = true;
      logger.info('Using in-memory storage');
    }
  }
  
  // Create table
  createTable(name, schema) {
    if (!this.connected) return;
    
    if (this.client.exec) {
      const cols = Object.entries(schema).map(([k, v]) => `${k} ${v}`).join(', ');
      this.client.exec(`CREATE TABLE IF NOT EXISTS ${name} (${cols})`);
    }
  }
  
  // Insert
  insert(table, data) {
    if (this.client instanceof Map) {
      const key = `${table}_${Date.now()}`;
      this.client.set(key, { ...data, createdAt: Date.now() });
      return key;
    }
    
    if (this.client.prepare) {
      const keys = Object.keys(data).join(', ');
      const values = Object.values(data).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
      return this.client.prepare(`INSERT INTO ${table} (${keys}) VALUES (${values})`).run();
    }
    
    return null;
  }
  
  // Query
  query(table, filter = {}) {
    if (this.client instanceof Map) {
      const results = [];
      for (const [k, v] of this.client) {
        if (k.startsWith(table)) {
          let match = true;
          for (const [key, val] of Object.entries(filter)) {
            if (v[key] !== val) match = false;
          }
          if (match) results.push(v);
        }
      }
      return results;
    }
    
    if (this.client.prepare) {
      if (Object.keys(filter).length === 0) {
        return this.client.prepare(`SELECT * FROM ${table}`).all();
      }
      
      const where = Object.keys(filter).map(k => `${k}=?`).join(' AND ');
      const values = Object.values(filter);
      return this.client.prepare(`SELECT * FROM ${table} WHERE ${where}`).all(...values);
    }
    
    return [];
  }
  
  // Update
  update(table, id, data) {
    if (this.client instanceof Map) {
      const key = `${table}_${id}`;
      const existing = this.client.get(key);
      if (existing) {
        this.client.set(key, { ...existing, ...data, updatedAt: Date.now() });
        return true;
      }
      return false;
    }
    
    if (this.client.prepare) {
      const set = Object.keys(data).map(k => `${k}=?`).join(', ');
      const values = [...Object.values(data), id];
      return this.client.prepare(`UPDATE ${table} SET ${set} WHERE id=?`).run(...values);
    }
    
    return false;
  }
  
  // Delete
  delete(table, id) {
    if (this.client instanceof Map) {
      return this.client.delete(`${table}_${id}`);
    }
    
    if (this.client.prepare) {
      return this.client.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
    }
    
    return false;
  }
  
  // Close
  close() {
    if (this.client?.close) {
      this.client.close();
    }
    this.connected = false;
    logger.info('Database disconnected');
  }
}

// Sessions table
export function createSessionStore(db) {
  db.createTable('sessions', {
    id: 'TEXT PRIMARY KEY',
    userId: 'TEXT',
    context: 'TEXT',
    createdAt: 'INTEGER',
    updatedAt: 'INTEGER',
  });
  
  return {
    save: (session) => db.insert('sessions', session),
    get: (id) => db.query('sessions', { id })[0],
    update: (id, data) => db.update('sessions', id, data),
    delete: (id) => db.delete('sessions', id),
  };
}

// Conversations table
export function createConversationStore(db) {
  db.createTable('conversations', {
    id: 'TEXT PRIMARY KEY',
    messages: 'TEXT',
    userId: 'TEXT',
    createdAt: 'INTEGER',
  });
  
  return {
    save: (conv) => db.insert('conversations', conv),
    get: (id) => db.query('conversations', { id })[0],
    list: (userId) => db.query('conversations', { userId }),
  };
}

// Create database
export function createDatabase(config = {}) {
  return new Database(config);
}