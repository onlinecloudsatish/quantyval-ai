# Quantyval AI Documentation

## Quick Links

- [API Reference](./api/)
- [Examples](./examples/)
- [Configuration](./config.md)
- [Security](./SECURITY.md)
- [CLI](./cli.md)

## Core Features

| Feature | Description |
|---------|-------------|
| **Agent** | Core agent with ReAct reasoning |
| **LLM** | OpenAI, Anthropic, OpenRouter, KiloCode |
| **Memory** | Short-term + long-term (Redis) |
| **Skills** | Auto-detect tech stack |
| **CLI** | Full command-line interface |
| **Telegram** | Real Telegram bot |
| **Browser** | Playwright automation |

## Installation

```bash
npm install quantyval-ai
```

## Usage

```bash
# Run agent
quantyval run --model kilocode:kilo-auto/free

# Start server
quantyval serve --port 3000

# Initialize project
quantyval init
```

## Architecture

```
src/
├── core/         # Agent, LLM providers
├── memory/       # Memory, Redis
├── channels/     # Telegram, Discord
├── tools/        # Browser, tools
├── server/       # HTTP server
├── voice/        # TTS/STT
├── multiagent/   # Orchestration
└── utils/        # Logger, errors, skills
```