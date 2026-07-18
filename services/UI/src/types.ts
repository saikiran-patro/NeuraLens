export type AppView = "workspace" | "knowledge" | "activity" | "settings";
export type AssistantState = "ready" | "listening" | "thinking" | "guiding" | "awaiting" | "acting";

export interface SuggestedAction {
  id: string;
  type: "open_url" | "web_search" | "fill_form" | "click" | "copy_patch";
  label: string;
  description: string;
  reason: string;
  requiresConfirmation: boolean;
  risk: "low" | "medium" | "high";
  payload: Record<string, string>;
}

export interface AssistantResponse {
  screenObservation: string;
  userIntent: string;
  answer: string;
  nextSteps: string[];
  suggestedActions: SuggestedAction[];
  safetyNotes: string[];
  confidence: number;
  sources: Array<{ title: string; pack: string }>;
  provider: "openai" | "local";
  model: string;
  notice?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  response?: AssistantResponse;
  code?: { content: string; language?: string; filename?: string };
}

export interface TimelineItem {
  id: string;
  type: "session" | "screen" | "question" | "knowledge" | "answer" | "action";
  title: string;
  detail: string;
  createdAt: string;
}

export interface KnowledgePack {
  id: string;
  name: string;
  description: string;
  locked: boolean;
  documents: Array<{ title: string; file: string; excerpt: string }>;
}

export interface HealthStatus {
  status: string;
  provider: "openai" | "local";
  model: string;
  voiceProvider?: "deepgram" | "unavailable";
  voiceModel?: string;
  knowledgeDocuments: number;
}
