// Quantyval AI - Chat Web App Example
// Simple web interface for Quantyval

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quantyval AI Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; color: #fff; height: 100vh; display: flex; flex-direction: column;
    }
    header { 
      padding: 20px; background: #16213e; border-bottom: 1px solid #0f3460;
      display: flex; justify-content: space-between; align-items: center;
    }
    h1 { font-size: 1.5rem; color: #00d9ff; }
    .provider-select { 
      background: #0f3460; color: #fff; border: 1px solid #0f3460;
      padding: 8px 12px; border-radius: 6px; cursor: pointer;
    }
    #chat { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .message { 
      max-width: 70%; padding: 12px 16px; border-radius: 12px; line-height: 1.5;
    }
    .user { align-self: flex-end; background: #0f3460; }
    .bot { align-self: flex-start; background: #16213e; border: 1px solid #0f3460; }
    .bot .meta { font-size: 0.75rem; color: #888; margin-bottom: 4px; }
    #input-area { 
      padding: 20px; background: #16213e; border-top: 1px solid #0f3460;
      display: flex; gap: 12px;
    }
    #message-input { 
      flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #0f3460;
      background: #1a1a2e; color: #fff; font-size: 1rem;
    }
    #send-btn { 
      padding: 12px 24px; border-radius: 8px; border: none; background: #00d9ff;
      color: #1a1a2e; font-weight: 600; cursor: pointer; transition: 0.2s;
    }
    #send-btn:hover { background: #00b8d9; }
    #send-btn:disabled { background: #555; cursor: not-allowed; }
    .loading { opacity: 0.5; }
  </style>
</head>
<body>
  <header>
    <h1>🤖 Quantyval AI</h1>
    <select class="provider-select" id="provider">
      <option value="openrouter">OpenRouter</option>
      <option value="openai">OpenAI</option>
      <option value="anthropic">Anthropic</option>
      <option value="groq">Groq</option>
      <option value="gemini">Gemini</option>
    </select>
  </header>
  
  <div id="chat">
    <div class="message bot">
      <div class="meta">Quantyval AI</div>
      Hello! I'm Quantyval AI. How can I help you today?
    </div>
  </div>
  
  <div id="input-area">
    <input type="text" id="message-input" placeholder="Type your message..." autofocus>
    <button id="send-btn">Send</button>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const provider = document.getElementById('provider');
    
    const API_URL = window.location.origin + '/api/complete';
    
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;
      
      // Add user message
      addMessage(message, 'user');
      input.value = '';
      sendBtn.disabled = true;
      sendBtn.textContent = '...';
      
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        
        const data = await res.json();
        
        if (data.error) {
          addMessage('Error: ' + data.error, 'bot');
        } else {
          addMessage(data.response, 'bot', data.provider);
        }
      } catch (err) {
        addMessage('Error: ' + err.message, 'bot');
      }
      
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
    
    function addMessage(text, type, meta) {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      if (meta) {
        div.innerHTML = '<div class="meta">' + meta + '</div>' + escapeHtml(text);
      } else {
        div.textContent = text;
      }
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }
    
    function escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
  </script>
</body>
</html>
`;

import { createServer } from 'http';
import { startServer } from './src/server/api.js';

const port = process.env.PORT || 8080;

const server = createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function main() {
  // Start API server in background
  startServer({ port: 3000 });
  
  // Start web UI
  server.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   🌐 Quantyval Web Chat                            ║
╠═══════════════════════════════════════════════════╣
║   UI:   http://localhost:${port}                     ║
║   API:  http://localhost:3000/api/complete          ║
╚═══════════════════════════════════════════════════╝
    `);
  });
}

main();