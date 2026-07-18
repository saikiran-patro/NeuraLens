interface ToolProperty {
  type: "string" | "integer" | "boolean";
  description?: string;
  minimum?: number;
  maximum?: number;
}

export interface VoiceToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolProperty>;
    required: string[];
  };
}

export const voiceToolDefinitions: VoiceToolDefinition[] = [
  {
    name: "inspect_shared_screen",
    description: "Return a structured representation of content currently visible on the user's shared screen. Always call this before answering a screen-dependent question.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "show_code_in_chat",
    description: "Display complete code in the NeuraLens AI chat without speaking it aloud. Use this for every coding answer that contains code.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "The complete code to display." },
        language: { type: "string", description: "Code language for display, such as typescript, python, or css." },
        filename: { type: "string", description: "Optional target filename." },
      },
      required: ["code"],
    },
  },
  {
    name: "search_web",
    description: "Search the public web for current factual information. Call only after the user explicitly approves this exact query in the conversation.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The concise public web search query." },
        max_results: { type: "integer", minimum: 1, maximum: 5 },
        user_confirmed: { type: "boolean", description: "True only when the user explicitly approved this exact search in a preceding turn." },
      },
      required: ["query", "user_confirmed"],
    },
  },
];
