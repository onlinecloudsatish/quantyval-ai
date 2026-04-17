// Quantyval AI - Core Agent
// Universal agent with reasoning, tools, memory, LLM
// Based on best patterns from CL4R1T4S analysis

import { createProvider } from './LLMProvider.js';
import { Memory } from '../memory/Memory.js';

export class Agent {
  constructor(config = {}) {
    this.name = config.name || 'Quantyval';
    this.model = config.model || null;
    this.llm = null;
    this.tools = config.tools || [];
    this.memory = config.memory || new Memory();
    
    // Best patterns from CL4R1T4S
    this.config = {
      // Communication style
      noOptInQuestions: config.noOptInQuestions ?? true,  // Don't ask, just do
      explainBeforeTool: config.explainBeforeTool ?? true, // Explain why before tool
      readBeforeEdit: config.readBeforeEdit ?? true,        // Read before editing
      maxErrorLoops: config.maxErrorLoops ?? 3,             // Max 3 error attempts
      
      // Tone
      systemPrompt: config.systemPrompt || 'You are Quantyval AI, a helpful agent. Be professional but friendly. Provide runnable code and examples without asking. Do the next obvious step automatically.',
    };
    
    // Initialize LLM if provider specified
    if (config.llm) {
      this.setLLM(config.llm);
    }
  }

  setLLM(providerConfig) {
    this.llm = createProvider(providerConfig.type, {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model || providerConfig.id,
    });
  }

  async run(input, context = {}) {
    const state = {
      input,
      context,
      toolResults: [],
    };

    // Get memory context
    state.context.past = await this.memory.getContext();

    // Execute tools
    for (const tool of this.tools) {
      if (await tool.canHandle(input)) {
        const result = await tool.execute(input, state);
        state.toolResults.push({ tool: tool.name, result });
      }
    }

    // LLM reasoning
    const response = await this.reason(input, state);

    // Save to memory
    await this.memory.add({ input, response, tools: state.toolResults });

    return response;
  }

  async reason(input, state) {
    if (!this.llm) {
      return { text: `No LLM configured. Input: ${input}`, agent: this.name };
    }

    // Build messages with system prompt and context
    const messages = [
      { role: 'system', content: this.systemPrompt },
    ];

    // Add past context if available
    if (state.context.past?.length) {
      messages.push({ 
        role: 'system', 
        content: `Previous context: ${JSON.stringify(state.context.past.slice(-5))}` 
      });
    }

    // Add tool results
    if (state.toolResults?.length) {
      messages.push({
        role: 'system',
        content: `Tool results: ${JSON.stringify(state.toolResults)}`
      });
    }

    messages.push({ role: 'user', content: input });

    // Get completion
    const text = await this.llm.complete(messages);
    
    return { text, agent: this.name, model: this.llm.model };
  }

  async reasonStream(input, onChunk, state = {}) {
    if (!this.llm) {
      onChunk(`No LLM configured. Input: ${input}`);
      return;
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input },
    ];

    for await (const chunk of this.llm.stream(messages)) {
      onChunk(chunk);
    }
  }

  addTool(tool) {
    this.tools.push(tool);
  }

  setMemory(memory) {
    this.memory = memory;
  }
}

// ReAct Agent with explicit reasoning steps
export class ReActAgent extends Agent {
  async reason(input, state) {
    // Think
    const thought = await this.llm?.complete(
      `Think about this: ${input}`
    ) || 'Thinking...';

    // Act (use tools if needed)
    let action = null;
    for (const tool of this.tools) {
      if (await tool.canHandle(input)) {
        action = await tool.execute(input, state);
        break;
      }
    }

    // Observe
    const observation = action?.result || 'No action taken';

    // Final output
    const response = await this.llm?.complete(
      `Based on:\nThought: ${thought}\nAction: ${action}\nObservation: ${observation}\n\nProvide the final answer:`
    ) || observation;

    return { 
      text: response, 
      reasoning: { thought, action, observation },
      agent: this.name 
    };
  }
}