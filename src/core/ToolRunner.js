// Quantyval AI - Tool Runner
// Execute shell, browser, API calls, and more

export class ToolRunner {
  constructor() {
    this.tools = new Map();
  }

  register(name, handler) {
    this.tools.set(name, handler);
  }

  async execute(toolName, args = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) throw new Error(`Tool ${toolName} not found`);
    return tool(args);
  }

  async canHandle(input, tools = []) {
    for (const tool of tools) {
      if (this.tools.has(tool)) return tool;
    }
    return null;
  }
}

// Built-in tools
export const builtinTools = {
  exec: async (command, opts = {}) => {
    // Shell execution - requires approval
    const { exec: execTool } = await import('child_process');
    return new Promise((resolve, reject) => {
      execTool(command, opts, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });
  },

  browser: async (action, opts = {}) => {
    // Browser automation placeholder
    return { action, status: 'Browser tool not configured' };
  },

  fetch: async (url, opts = {}) => {
    // HTTP requests
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, opts);
    return { status: res.status, json: await res.json() };
  },
};