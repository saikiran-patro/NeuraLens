export interface KnowledgeChunk {
  id: string;
  pack: string;
  packName: string;
  title: string;
  file: string;
  content: string;
}

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

export interface AssistantResult {
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
