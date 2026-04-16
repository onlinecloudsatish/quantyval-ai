// Quantyval AI - Voice (TTS + STT)
// Text-to-Speech and Speech-to-Text

export class VoiceProvider {
  async speak(text, options = {}) {
    throw new Error('speak() must be implemented');
  }

  async listen(audioData, options = {}) {
    throw new Error('listen() must be implemented');
  }
}

// ElevenLabs TTS
export class ElevenLabsProvider extends VoiceProvider {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io/v1';
  }

  async speak(text, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(
      `${this.baseUrl}/text-to-speech/${options.voiceId || this.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarity || 0.75,
          },
        }),
      }
    );

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  }

  getStreamUrl() {
    return `${this.baseUrl}/text-to-stream/${this.voiceId}`;
  }
}

// OpenAI TTS
export class OpenAITTSProvider extends VoiceProvider {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'tts-1';
    this.voice = config.voice || 'alloy';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async speak(text, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.model,
        voice: options.voice || this.voice,
        input: text,
      }),
    });

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  }
}

// Web Speech API (browser TTS)
export class WebSpeechProvider extends VoiceProvider {
  constructor(config = {}) {
    super();
    this.voice = config.voice || null;
    this.rate = config.rate || 1;
    this.pitch = config.pitch || 1;
    this.volume = config.volume || 1;
  }

  async speak(text) {
    // Browser-only - uses Web Speech API
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      if (this.voice) {
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.name === this.voice) || voices[0];
      }

      utterance.onend = () => resolve(true);
      window.speechSynthesis.speak(utterance);
    });
  }
}

// Whisper STT
export class WhisperProvider extends VoiceProvider {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'whisper-1';
  }

  async listen(audioBuffer, options = {}) {
    const { default: fetch } = await import('node-fetch');
    
    const form = new FormData();
    form.append('file', new Blob([audioBuffer]), 'audio.webm');
    form.append('model', options.model || this.model);
    if (options.language) {
      form.append('language', options.language);
    }

    const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    const data = await res.json();
    return data.text || '';
  }
}

// Voice factory
export function createVoiceProvider(type, config) {
  const providers = {
    elevenlabs: ElevenLabsProvider,
    openai: OpenAITTSProvider,
    webspeech: WebSpeechProvider,
    whisper: WhisperProvider,
  };

  const Provider = providers[type];
  if (!Provider) throw new Error(`Unknown voice provider: ${type}`);
  
  return new Provider(config);
}

// Voice Agent - combines TTS + STT
export class VoiceAgent {
  constructor(config = {}) {
    this.tts = config.tts ? createVoiceProvider(config.tts.type, config.tts) : null;
    this.stt = config.stt ? createVoiceProvider(config.stt.type, config.stt) : null;
    this.agent = config.agent || null;
  }

  async speak(text) {
    if (!this.tts) return null;
    return this.tts.speak(text);
  }

  async hear(audioBuffer) {
    if (!this.stt) return '';
    return this.stt.listen(audioBuffer);
  }

  async processVoiceInput(audioBuffer) {
    const text = await this.hear(audioBuffer);
    if (!text || !this.agent) return null;
    
    const response = await this.agent.run(text);
    await this.speak(response.text);
    
    return response;
  }
}