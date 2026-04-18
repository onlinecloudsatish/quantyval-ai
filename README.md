# Quantyval AI 🤖

> Universal AI Agent Framework - Task execution, voice, multi-agent orchestration

[![npm](https://img.shields.io/npm/v/quantyval-ai)](https://npmjs.com/package/quantyval-ai)
[![GitHub](https://img.shields.io/github/license/onlinecloudsatish/quantyval-ai)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-37%20passing-green)](tests/)

## Features

| Category | Features |
|----------|----------|
| **Core** | Agent with ReAct reasoning, LLM providers (OpenAI, Anthropic, OpenRouter, KiloCode) |
| **Security** | Command allowlists, SSRF protection, API auth, rate limiting |
| **Memory** | Short-term + long-term, Redis adapter for persistence |
| **Skills** | Auto-detect tech stack (React, Node, Python, Go, etc.) |
| **CLI** | Full command-line (`run`, `serve`, `init`, `voice`) |
| **Channels** | Telegram bot, WebSocket, HTTP |
| **Tools** | Playwright browser automation |
| **Multi-Agent** | Sequential, parallel, hierarchical orchestration |
| **Voice** | TTS (ElevenLabs, OpenAI) + STT (Whisper) |

## Quick Start

### CLI

```bash
# Run agent
npx quantyval run --model kilocode:kilo-auto/free

# Start server
npx quantyval serve --port 3000

# Initialize project
npx quantyval init
```

### Code

```javascript
import { Agent, createProvider } from 'quantyval-ai';

const agent = new Agent({
  name: 'MyBot',
  systemPrompt: 'You are a helpful assistant.',
  llm: { type: 'kilocode', apiKey: process.env.QUANTYVAL_API_KEY },
});

const response = await agent.run('Hello!');
console.log(response.text);
```

### Telegram Bot

```bash
TELEGRAM_BOT_TOKEN=xxx node examples/telegram-bot/bot.js
```

## Installation

```bash
npm install quantyval-ai
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `name` | Agent name | `Quantyval` |
| `model` | LLM provider | `kilocode:kilo-auto/free` |
| `memory` | Enable memory | `false` |
| `port` | Server port | `3000` |

## CLI Options

```bash
quantyval run --model openai:gpt-4        # Run interactive
quantyval serve --port 8080               # Start HTTP server
quantyval init                           # Create config
quantyval voice                          # Voice mode
```

## Architecture

```
quantyval-ai/
├── bin/cli.js          # CLI entry point
├── src/
│   ├── core/           # Agent, LLM providers
│   ├── memory/         # Memory, Redis
│   ├── channels/       # Telegram, Discord
│   ├── tools/          # Browser automation
│   ├── server/         # HTTP server
│   ├── voice/          # TTS/STT
│   ├── multiagent/     # Orchestration
│   └── utils/          # Logger, errors, skills
├── examples/          # Example projects
└── tests/             # 37 tests
```

## Best Practices

- Set `QUANTYVAL_API_KEY` environment variable
- Use `.env` for configuration
- Enable memory for conversations
- Use skills for tech-specific prompts

## License

MIT