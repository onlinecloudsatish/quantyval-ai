// Quantyval AI - Metrics & Dashboard
// Usage statistics and monitoring

import { logger } from '../utils/logger.js';

export class Metrics {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.startTime = Date.now();
  }
  
  // Counter - increment
  increment(name, value = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }
  
  // Counter - get
  getCounter(name) {
    return this.counters.get(name) || 0;
  }
  
  // Gauge - set value
  set(name, value) {
    this.gauges.set(name, { value, updatedAt: Date.now() });
  }
  
  // Gauge - get
  get(name) {
    return this.gauges.get(name)?.value;
  }
  
  // Histogram - record value
  record(name, value) {
    const bucket = this.histograms.get(name) || [];
    bucket.push({ value, timestamp: Date.now() });
    
    // Keep last 1000
    if (bucket.length > 1000) {
      bucket.shift();
    }
    
    this.histograms.set(name, bucket);
  }
  
  // Histogram - stats
  getHistogramStats(name) {
    const bucket = this.histograms.get(name) || [];
    if (bucket.length === 0) return null;
    
    const values = bucket.map(b => b.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }
  
  // Get all metrics
  getAll() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: Math.floor(uptime / 1000) + 's',
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(
        Array.from(this.gauges.entries()).map(([k, v]) => [k, v.value])
      ),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([k, v]) => [k, this.getHistogramStats(k)])
      ),
    };
  }
  
  // Reset
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// Track API calls
export function trackAPI(metrics, provider, duration, success) {
  metrics.increment('api.calls.total');
  metrics.increment(`api.calls.${provider}`);
  metrics.record('api.latency', duration);
  
  if (!success) {
    metrics.increment('api.errors');
  }
}

// Create metrics
export function createMetrics() {
  return new Metrics();
}

// Middleware for Express-like servers
export function metricsMiddleware(metrics) {
  return async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      metrics.increment('http.requests');
      metrics.record('http.latency', duration);
      metrics.set('http.status.' + res.statusCode, 1);
    });
    
    next();
  };
}