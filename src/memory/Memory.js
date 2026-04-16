// Quantyval AI - Memory System
// Short-term and long-term memory

export class Memory {
  constructor(options = {}) {
    this.shortTerm = [];
    this.longTerm = options.persistent ? [] : null;
    this.maxSize = options.maxSize || 100;
  }

  async add(entry) {
    this.shortTerm.push({ ...entry, timestamp: Date.now() });
    if (this.shortTerm.length > this.maxSize) {
      // Compress to long-term
      const summary = this.summarize(this.shortTerm);
      if (this.longTerm) this.longTerm.push(summary);
      this.shortTerm = [];
    }
  }

  async getContext() {
    return [...this.longTerm || [], ...this.shortTerm].slice(-10);
  }

  summarize(messages) {
    return { summary: messages.length + ' interactions', count: messages.length };
  }

  async search(query) {
    // Simple search in short-term
    return this.shortTerm.filter(m => 
      JSON.stringify(m).toLowerCase().includes(query.toLowerCase())
    );
  }
}