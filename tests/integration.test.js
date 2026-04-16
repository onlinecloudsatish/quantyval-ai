// Quantyval AI - Integration Tests
// Tests HTTP API endpoints

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const test = {
  req: (options, body) => new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  }),
};

describe('HTTP API Integration', () => {
  let server;
  let baseUrl = 'http://localhost:3999';
  
  before(async () => {
    // Start server on different port for testing
    const { SecureServer } = await import('../src/server/SecureServer.js');
    const { Agent } = await import('../src/core/Agent.js');
    
    server = new SecureServer({ port: 3999, rateLimit: 100 });
    server.setAgent(new Agent({ name: 'TestQuantyval' }));
    
    await server.start();
    console.log('🧪 Test server running on port 3999');
    await new Promise(r => setTimeout(r, 500));
  });
  
  after(() => {
    if (server?.server) server.server.close();
  });
  
  describe('GET /health', () => {
    it('should return OK', async () => {
      const res = await test.req({ hostname: 'localhost', port: 3999, path: '/health' });
      test.eq(res.status, 200);
      test.ok(res.body.includes('ok'));
    });
  });
  
  describe('POST /api/run', () => {
    it('should run agent', async () => {
      const res = await test.req({
        hostname: 'localhost',
        port: 3999,
        path: '/api/run',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, JSON.stringify({ input: 'Hello' }));
      
      test.eq(res.status, 200);
      const data = JSON.parse(res.body);
      test.ok(data.agent || data.text);
    });
    
    it('should reject invalid JSON', async () => {
      const res = await test.req({
        hostname: 'localhost',
        port: 3999,
        path: '/api/run',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, 'invalid{');
      
      test.eq(res.status, 400);
    });
    
    it('should reject oversized input', async () => {
      const oversized = 'a'.repeat(1e6 + 1);
      const res = await test.req({
        hostname: 'localhost',
        port: 3999,
        path: '/api/run',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, JSON.stringify({ input: oversized }));
      
      test.eq(res.status, 400);
    });
  });
  
  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const limitedServer = new (await import('../src/server/SecureServer.js')).SecureServer({ 
        port: 0, 
        rateLimit: 3 
      });
      
      // Make 4 requests quickly
      for (let i = 0; i < 4; i++) {
        if (i === 3) {
          assert.rejects(
            limitedServer.checkRateLimit('test-ip'),
            { message: 'Rate limit exceeded' }
          );
        } else {
          limitedServer.checkRateLimit('test-ip');
        }
      }
    });
  });
  
  describe('CORS', () => {
    it('should handle OPTIONS', async () => {
      const res = await test.req({
        hostname: 'localhost',
        port: 3999,
        path: '/health',
        method: 'OPTIONS',
      });
      test.eq(res.status, 204);
    });
  });
});

console.log('🧪 Running Integration Tests...');