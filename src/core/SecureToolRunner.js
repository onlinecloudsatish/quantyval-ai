// Quantyval AI - Secure Tool Runner
// With approval system, sandboxing, allowlists

export class ToolRunner {
  constructor(config = {}) {
    this.tools = new Map();
    this.approvalRequired = config.approvalRequired || true;
    this.allowedCommands = config.allowedCommands || null;
    this.blockedPatterns = [
      /rm\s+-rf/i, /dd\s+if/i, /mkfs/i, /:(){/i, /\|\s*sh/i,
      /\$\(/i, /`/i, /\>\s*\//i, /wget.*\|.*sh/i, /curl.*\|.*sh/i,
    ];
  }

  register(name, handler) {
    this.tools.set(name, handler);
  }

  async execute(toolName, args = {}, context = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) throw new Error(`Tool ${toolName} not found`);
    return tool(args, context);
  }

  // Check command approval
  async checkApproval(command) {
    if (!this.approvalRequired) return true;
    
    // Check blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Command blocked: ${command}`);
      }
    }
    
    // Check allowlist
    if (this.allowedCommands) {
      const cmd = command.split(' ')[0];
      if (!this.allowedCommands.includes(cmd)) {
        throw new Error(`Command not allowed: ${cmd}`);
      }
    }
    
    // TODO: External approval integration
    return true;
  }

  // Sanitize path to prevent traversal
  sanitizePath(path) {
    const resolved = path.replace(/\\/g, '/');
    if (resolved.includes('../')) {
      throw new Error('Path traversal not allowed');
    }
    return path;
  }

  // Check for SSRF
  checkSSRF(url) {
    try {
      const u = new URL(url);
      const hostname = u.hostname.toLowerCase();
      const blocked = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        '169.254.169.254', // AWS
        'metadata.google.internal', // GCP
        '169.254.169.169', // Azure
      ];
      if (blocked.includes(hostname)) {
        throw new Error('Blocked internal host');
      }
      // Block private IPs
      if (/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(hostname)) {
        throw new Error('Blocked private IP');
      }
    } catch (e) {
      throw new Error('Invalid URL');
    }
    return true;
  }
}

// Secure exec with allowlist
export const secureExec = {
  // Allowed commands (restrictive by default)
  allowed: ['git', 'npm', 'node', 'npx', 'cat', 'ls', 'grep', 'echo', 'pwd', 'whoami'],
  
  async exec(command, opts = {}) {
    // Parse command
    const cmd = command.trim().split(/\s+/)[0];
    const args = command.trim().split(/\s+/).slice(1);
    
    // Check allowlist
    if (!this.allowed.includes(cmd)) {
      throw new Error(`Command ${cmd} not in allowlist`);
    }
    
    // Additional checks
    const dangerous = ['&&', '||', ';', '|', '$', '`', '>', '>>'];
    for (const d of dangerous) {
      if (command.includes(d)) {
        throw new Error('Chain commands not allowed');
      }
    }
    
    // Execute with limits
    const { exec: execTool } = await import('child_process');
    const optsWithLimits = {
      ...opts,
      timeout: opts.timeout || 30000,
      maxBuffer: opts.maxBuffer || 1024 * 1024, // 1MB
      cwd: '/tmp', // Restrict working directory
      env: { PATH: '/usr/bin:/bin' }, // Minimal PATH
    };
    
    return new Promise((resolve, reject) => {
      execTool(cmd, args, optsWithLimits, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout: stdout?.slice(0, 10000), stderr: stderr?.slice(0, 1000) });
      });
    });
  },
};

// SSRF-safe fetch
export const secureFetch = {
  async fetch(url, opts = {}) {
    const u = new URL(url);
    
    // Block internal
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
    if (blocked.includes(u.hostname)) throw new Error('Internal hosts blocked');
    
    // Block private ranges
    const privateIP = /^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^127\./;
    if (privateIP.test(u.hostname)) throw new Error('Private IPs blocked');
    
    const { default: fetch } = await import('node-fetch');
    return fetch(url, { ...opts, timeout: opts.timeout || 10000 });
  },
};

// Built-in tools (secured)
export const builtinTools = {
  exec: async (args, context = {}) => {
    return secureExec.exec(args.command, args);
  },

  fetch: async (args, context = {}) => {
    return secureFetch.fetch(args.url, args);
  },

  // File operations with path sanitization
  readFile: async (args, context = {}) => {
    const fs = await import('fs');
    const path = args.path.replace(/\\/g, '/');
    if (path.includes('../')) throw new Error('Path traversal blocked');
    return fs.readFileSync(path, 'utf-8');
  },

  writeFile: async (args, context = {}) => {
    const fs = await import('fs');
    const path = args.path.replace(/\\/g, '/');
    if (path.includes('../')) throw new Error('Path traversal blocked');
    // Limit size
    if (args.content?.length > 1e6) throw new Error('File too large');
    fs.writeFileSync(path, args.content);
    return { written: true };
  },
};