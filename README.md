# Quantyval AI 🤖

> Universal AI Agent Framework - Task execution, voice, multi-agent orchestration

## Features

- **Core Agent** - ReAct-style reasoning + tool use
- **LLM Integration** - OpenAI, Anthropic, OpenRouter, KiloCode
- **Tool System** - Shell, browser, HTTP, APIs
- **Memory** - Short-term + long-term with compression
- **Channels** - Telegram, Discord, WebSocket, HTTP
- **Voice** - TTS (ElevenLabs, OpenAI) + STT (Whisper)
- **Server** - HTTP API for agent interactions
- **Multi-Agent** - Orchestration (coming)
- **Deployment** - Local, server, Docker

## Install

```bash
npm install
```

## Quick Start

### CLI

```bash
npm start
# Starts server on port 3000
```

### Code

```javascript
import { Agent, createProvider, startServer } from './src/index.js';

// 1. Create LLM provider
const llm = createProvider('kilocode', {
  apiKey: process.env.QUANTYVAL_API_KEY,
  model: 'kilo-auto/free',
});

// 2. Create agent
const agent = new Agent({
  name: 'MyAgent',
  systemPrompt: 'You are a helpful AI assistant.',
  llm,
});

// 3. Run
const response = await agent.run('Hello, what can you do?');
console.log(response);
```

### HTTP API

```bash
# Health
curl http://localhost:3000/health

# Run agent
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello!"}'

# Stream
curl -X POST http://localhost:3000/api/stream \
  -H "Content-Type: application/json" \
  -d '{"input": "Tell me a story"}'
```

## Configuration

Edit `config/default.js`:

```javascript
export default {
  name: 'Quantyval',
  
  model: {
    provider: 'kilocode',
    model: 'kilo-auto/free',
    apiKey: process.env.QUANTYVAL_API_KEY,
  },

  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  // Voice (optional)
  voice: {
    tts: { type: 'elevenlabs', apiKey: '...' },
    stt: { type: 'whisper', apiKey: '...' },
  },
};
```

## Architecture

```
quantyval-ai/
├── src/
│   ├── index.js          # Main exports
│   ├── core/
│   │   ├── Agent.js      # Core agent
│   │   ├── ToolRunner.js # Tool system
│   │   └── LLMProvider.js # OpenAI, Anthropic, etc
│   ├── memory/
│   │   └── Memory.js   # Short + long term
│   ├── channels/
│   │   └── Channel.js  # Telegram, Discord, WS
│   ├── voice/
│   │   └── Voice.js    # TTS + STT
│   └── server/
│       └── Server.js    # HTTP API
├── config/
│   └── default.js
└── tests/
```

## Tech

- Node.js 18+
- ES Modules
- Minimal dependencies (node-fetch, ws)
- Add Rust for hot paths later

## License

MIT