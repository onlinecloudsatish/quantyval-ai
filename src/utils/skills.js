// Quantyval AI - Skill System
// Based on autoskills/skills.sh concept

import { logger } from './logger.js';

export class Skill {
  constructor(config = {}) {
    this.name = config.name;
    this.description = config.description;
    this.tech = config.tech || []; // e.g., ['react', 'nextjs']
    this.commands = config.commands || [];
    this.prompt = config.prompt || '';
  }
  
  matches(techStack) {
    return this.tech.some(t => techStack.includes(t.toLowerCase()));
  }
}

// Built-in skills registry
export const BUILTIN_SKILLS = [
  // Frontend
  new Skill({
    name: 'react',
    description: 'React.js development',
    tech: ['react', 'create-react-app'],
    commands: ['npm run dev', 'npm test'],
    prompt: 'You are a React expert. Use hooks, functional components, and follow React best practices.',
  }),
  new Skill({
    name: 'nextjs',
    description: 'Next.js full-stack framework',
    tech: ['next', 'nextjs'],
    commands: ['npm run dev', 'npm run build'],
    prompt: 'You are a Next.js expert. Use App Router, server components, and API routes.',
  }),
  new Skill({
    name: 'vue',
    description: 'Vue.js framework',
    tech: ['vue', 'nuxt'],
    commands: ['npm run dev', 'npm run build'],
    prompt: 'You are a Vue.js expert. Use Composition API and Vue 3 patterns.',
  }),
  new Skill({
    name: 'svelte',
    description: 'Svelte framework',
    tech: ['svelte', 'sveltekit'],
    commands: ['npm run dev', 'npm run build'],
    prompt: 'You are a Svelte expert. Use Svelte 4/5 syntax and stores.',
  }),
  
  // Backend
  new Skill({
    name: 'node',
    description: 'Node.js runtime',
    tech: ['node', 'express', 'fastify', 'hono'],
    commands: ['node index.js', 'npm start'],
    prompt: 'You are a Node.js expert. Use async/await, proper error handling.',
  }),
  new Skill({
    name: 'python',
    description: 'Python runtime',
    tech: ['python', 'django', 'flask', 'fastapi'],
    commands: ['python main.py', 'pip install'],
    prompt: 'You are a Python expert. Follow PEP 8, use type hints.',
  }),
  new Skill({
    name: 'go',
    description: 'Go programming',
    tech: ['go', 'golang'],
    commands: ['go run main.go', 'go build'],
    prompt: 'You are a Go expert. Use idiomatic Go patterns, go mod.',
  }),
  
  // Mobile
  new Skill({
    name: 'react-native',
    description: 'React Native mobile',
    tech: ['react-native', 'expo'],
    commands: ['npx expo start', 'npm run android'],
    prompt: 'You are a React Native expert. Use Expo, proper native modules.',
  }),
  new Skill({
    name: 'flutter',
    description: 'Flutter mobile',
    tech: ['flutter', 'dart'],
    commands: ['flutter run', 'flutter build'],
    prompt: 'You are a Flutter expert. Use Dart 3, material design.',
  }),
  
  // Database
  new Skill({
    name: 'prisma',
    description: 'Prisma ORM',
    tech: ['prisma'],
    commands: ['npx prisma generate', 'npx prisma db push'],
    prompt: 'You are a Prisma expert. Use schema.prisma, proper migrations.',
  }),
  new Skill({
    name: 'postgresql',
    description: 'PostgreSQL database',
    tech: ['postgresql', 'postgres', 'neon'],
    commands: ['psql', 'pg_dump'],
    prompt: 'You are a PostgreSQL expert. Use proper indexing, queries.',
  }),
  
  // Cloud
  new Skill({
    name: 'aws',
    description: 'Amazon Web Services',
    tech: ['aws', 'amazon'],
    commands: ['aws s3', 'aws lambda'],
    prompt: 'You are an AWS expert. Use proper IAM, best practices.',
  }),
  new Skill({
    name: 'vercel',
    description: 'Vercel deployment',
    tech: ['vercel'],
    commands: ['vercel deploy', 'vercel --prod'],
    prompt: 'You are a Vercel expert. Use proper config, edge functions.',
  }),
  new Skill({
    name: 'cloudflare',
    description: 'Cloudflare workers',
    tech: ['cloudflare', 'wrangler'],
    commands: ['wrangler dev', 'wrangler deploy'],
    prompt: 'You are a Cloudflare expert. Use Workers, Durable Objects.',
  }),
  
  // Testing
  new Skill({
    name: 'vitest',
    description: 'Vitest testing',
    tech: ['vitest', 'vite'],
    commands: ['npx vitest', 'npx vitest run'],
    prompt: 'You are a Vitest expert. Write fast unit tests, use watch mode.',
  }),
  new Skill({
    name: 'playwright',
    description: 'Playwright e2e testing',
    tech: ['playwright'],
    commands: ['npx playwright test'],
    prompt: 'You are a Playwright expert. Write e2e tests, use page objects.',
  }),
];

// Skill Manager
export class SkillManager {
  constructor(options = {}) {
    this.skills = options.skills || [...BUILTIN_SKILLS];
    this.enabled = new Set();
  }
  
  // Detect tech stack from package.json
  detectTechStack(packageJson) {
    const deps = {
      ...(packageJson?.dependencies || {}),
      ...(packageJson?.devDependencies || {}),
    };
    
    return Object.keys(deps).map(d => d.toLowerCase());
  }
  
  // Auto-detect skills from project
  detect(projectConfig) {
    const techStack = projectConfig?.dependencies 
      ? this.detectTechStack(projectConfig)
      : [];
    
    const matched = this.skills.filter(skill => skill.matches(techStack));
    
    logger.info(`Detected ${matched.length} skills for tech stack`);
    return matched;
  }
  
  // Enable specific skill
  enable(skillName) {
    const skill = this.skills.find(s => s.name === skillName);
    if (skill) {
      this.enabled.add(skillName);
      return skill;
    }
    return null;
  }
  
  // Disable skill
  disable(skillName) {
    this.enabled.delete(skillName);
  }
  
  // Get enabled skill prompts
  getPrompts() {
    return [...this.enabled].map(name => {
      const skill = this.skills.find(s => s.name === name);
      return skill?.prompt || '';
    }).filter(Boolean);
  }
  
  // Add custom skill
  addSkill(skillConfig) {
    this.skills.push(new Skill(skillConfig));
  }
  
  // List all available skills
  list() {
    return this.skills.map(s => ({
      name: s.name,
      description: s.description,
      tech: s.tech,
    }));
  }
}

// Create skill manager with auto-detection
export function createSkillManager() {
  return new SkillManager();
}