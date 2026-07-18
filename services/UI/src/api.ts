import type { AssistantResponse, HealthStatus, KnowledgePack, SuggestedAction } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "NeuraLens AI could not complete that request.");
  return data as T;
}

export const api = {
  health: () => request<HealthStatus>("/api/health"),
  knowledge: () => request<{ packs: KnowledgePack[] }>("/api/knowledge/packs"),
  createDeepgramToken: async () => {
    const response = await fetch("/api/deepgram/token", { method: "POST" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Deepgram voice could not start.");
    }
    return response.text();
  },
  ask: (payload: { sessionId: string; userText: string; screenshotBase64?: string; screenMarkdown?: string; mode: string }) =>
    request<AssistantResponse>("/api/assistant/ask", {
      method: "POST",
      body: JSON.stringify({ ...payload, allowActions: true }),
    }),
  searchWeb: (payload: { query: string; maxResults?: number; approved: boolean }) =>
    request<{ query: string; provider: string; results: Array<{ title: string; url: string; snippet: string }> }>("/api/search", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  confirmAction: (payload: { sessionId: string; action: SuggestedAction; approved: boolean }) =>
    request<{ status: string; message: string }>("/api/actions/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
