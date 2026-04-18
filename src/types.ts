// Quantyval AI - TypeScript Definitions

// ============= Core Types =============

export interface AgentConfig {
  name?: string;
  systemPrompt?: string;
  llm?: LLMConfig;
  memory?: Memory | boolean;
  packageJson?: PackageJson;
  tools?: Tool[];
  noOptInQuestions?: boolean;
  explainBeforeTool?: boolean;
  readBeforeEdit?: boolean;
  maxErrorLoops?: number;
  autoDetectSkills?: boolean;
}

export interface LLMConfig {
  type: 'openai' | 'anthropic' | 'openrouter' | 'kilocode';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface Tool {
  name: string;
  canHandle: (input: string) => boolean | Promise<boolean>;
  execute: (input: string, state?: AgentState) => Promise<any>;
}

export interface AgentState {
  input: string;
  context: Record<string, any>;
  toolResults: Array<{ tool: string; result: any }>;
}

export interface AgentResponse {
  text: string;
  agent: string;
  model?: string;
  reasoning?: {
    thought: string;
    action: any;
    observation: string;
  };
}

// ============= Memory Types =============

export interface Memory {
  add(entry: MemoryEntry): Promise<void>;
  getContext(): Promise<MemoryEntry[]>;
  search(query: string): Promise<MemoryEntry[]>;
}

export interface MemoryEntry {
  input: string;
  response: string;
  tools?: any[];
  timestamp?: number;
}

export interface RedisMemoryConfig {
  url?: string;
  prefix?: string;
  ttl?: number;
}

// ============= Channel Types =============

export interface ChannelConfig {
  name?: string;
  chatId?: string;
  token?: string;
  apiKey?: string;
}

export interface TelegramConfig extends ChannelConfig {
  token: string;
  webhookUrl?: string;
}

export interface DiscordConfig extends ChannelConfig {
  token: string;
}

export interface WhatsAppConfig extends ChannelConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken?: string;
}

// ============= Skill Types =============

export interface Skill {
  name: string;
  description: string;
  tech: string[];
  commands?: string[];
  prompt?: string;
}

export interface SkillManager {
  detect(projectConfig: PackageJson): Skill[];
  enable(skillName: string): Skill | null;
  disable(skillName: string): void;
  getPrompts(): string[];
  list(): Array<{ name: string; description: string; tech: string[] }>;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// ============= Server Types =============

export interface ServerConfig {
  port?: number;
  host?: string;
  apiKey?: string;
  rateLimit?: number;
}

export interface APIRequest {
  input: string;
  context?: Record<string, any>;
}

export interface APIResponse {
  text: string;
  agent?: string;
  model?: string;
  error?: string;
}

// ============= Voice Types =============

export interface VoiceConfig {
  tts?: {
    type: 'elevenlabs' | 'openai' | 'webspeech';
    apiKey?: string;
    voiceId?: string;
    voice?: string;
  };
  stt?: {
    type: 'whisper';
    apiKey?: string;
  };
}

export interface TTSProvider {
  speak(text: string, options?: any): Promise<Buffer>;
}

export interface STTProvider {
  listen(audioBuffer: Buffer, options?: any): Promise<string>;
}

// ============= Multi-Agent Types =============

export interface MultiAgentConfig {
  strategy?: 'sequential' | 'parallel' | 'hierarchical';
  hub?: boolean;
}

export interface WorkflowStep {
  name: string;
  agent: Agent;
  condition?: (context: any) => boolean;
}

export interface AgentPoolConfig {
  size?: number;
  template?: AgentConfig;
}

// ============= Logger Types =============

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  child(prefix: string): Logger;
}

// ============= Error Types =============

export class QuantyvalError extends Error {
  code: string;
  meta: any;
}

export class ConfigError extends QuantyvalError {}
export class LLMError extends QuantyvalError {}
export class AuthError extends QuantyvalError {}
export class RateLimitError extends QuantyvalError {}
export class ToolError extends QuantyvalError {}
export class ValidationError extends QuantyvalError {}
export class NetworkError extends QuantyvalError {}

// ============= CLI Types =============

export interface CLIOptions {
  model?: string;
  system?: string;
  memory?: boolean;
  voice?: boolean;
  stream?: boolean;
  port?: string;
}

export type CLICommand = 'run' | 'serve' | 'init' | 'chat' | 'voice' | 'help';