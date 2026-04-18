// Quantyval AI - vyasa-u-code Integration
// Bridge between Quantyval and vyasa-u-code skill system

import { logger } from '../utils/logger.js';
import { Skill } from '../utils/skills.js';
import fs from 'fs/promises';
import path from 'path';

export class VyasaBridge {
  constructor(options = {}) {
    this.skillsPath = options.skillsPath || './skills';
    this.skillsPath = options.skillsPath || process.env.VYASA_SKILLS_PATH || '/root/.openclaw/workspace/vyasa-u-code/skills';
    this.skills = new Map();
  }
  
  // Load all .qmd skills from vyasa-u-code
  async loadSkills() {
    try {
      const entries = await fs.readdir(this.skillsPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(this.skillsPath, entry.name);
          const skillFile = path.join(skillPath, 'SKILL.md');
          
          try {
            const content = await fs.readFile(skillFile, 'utf-8');
            const skill = this.parseSkill(content, entry.name);
            this.skills.set(entry.name, skill);
            logger.info(`Loaded vyasa-u-code skill: ${entry.name}`);
          } catch (e) {
            logger.warn(`Could not load skill ${entry.name}: ${e.message}`);
          }
        }
      }
      
      logger.info(`Loaded ${this.skills.size} skills from vyasa-u-code`);
      return this.skills;
    } catch (e) {
      logger.warn(`Could not load vyasa-u-code skills: ${e.message}`);
      return new Map();
    }
  }
  
  // Parse SKILL.md format
  parseSkill(content, name) {
    const lines = content.split('\n');
    let description = '';
    let triggers = [];
    let behavior = '';
    let install = '';
    let setup = '';
    
    let section = '';
    for (const line of lines) {
      if (line.startsWith('description:')) {
        description = line.replace('description:', '').trim();
      } else if (line.includes('trigger') || line.includes('When to use')) {
        section = 'triggers';
      } else if (line.startsWith('#') && line.includes('Default')) {
        section = 'behavior';
      } else if (line.startsWith('## Install')) {
        section = 'install';
      } else if (line.startsWith('## Setup')) {
        section = 'setup';
      } else if (section === 'triggers' && line.trim()) {
        triggers.push(line.replace('-', '').trim());
      } else if (section === 'behavior' && line.trim() && !line.startsWith('#')) {
        behavior += line + '\n';
      } else if (section === 'install' && line.trim() && !line.startsWith('#')) {
        install += line + '\n';
      } else if (section === 'setup' && line.trim() && !line.startsWith('#')) {
        setup += line + '\n';
      }
    }
    
    return {
      name,
      description,
      triggers,
      behavior: behavior.trim(),
      install: install.trim(),
      setup: setup.trim(),
      raw: content,
    };
  }
  
  // Get skill by name
  getSkill(name) {
    return this.skills.get(name);
  }
  
  // Get all skill names
  listSkills() {
    return Array.from(this.skills.keys());
  }
  
  // Convert to Quantyval skill format
  toQuantyvalSkill(vyasaSkill) {
    return new Skill({
      name: vyasaSkill.name,
      description: vyasaSkill.description,
      tech: vyasaSkill.triggers.map(t => t.toLowerCase().replace(/[^a-z]/g, '')),
      commands: vyasaSkill.install ? [vyasaSkill.install] : [],
      prompt: vyasaSkill.behavior || vyasaSkill.description,
    });
  }
  
  // Add all vyasa skills to Quantyval skill manager
  async addToSkillManager(skillManager) {
    await this.loadSkills();
    
    for (const [name, vyasaSkill] of this.skills) {
      const qSkill = this.toQuantyvalSkill(vyasaSkill);
      skillManager.addSkill(qSkill);
      logger.info(`Added skill: ${name}`);
    }
    
    return this.skills.size;
  }
}

// Create bridge with default paths
export function createVyasaBridge(options = {}) {
  return new VyasaBridge(options);
}

// Auto-detect and integrate
export async function integrateVyasa(agent) {
  const bridge = new VyasaBridge();
  const count = await bridge.addToSkillManager(agent.skillManager);
  
  logger.info(`Integrated ${count} vyasa-u-code skills into Quantyval agent`);
  return { bridge, skillCount: count };
}