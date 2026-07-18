import OpenAI from "openai";
import { retrieveKnowledge } from "../knowledge.js";
import type { AssistantResult, KnowledgeChunk, SuggestedAction } from "../types.js";

const configuredModel = () => process.env.OPENAI_MODEL || "gpt-5.6-luna";

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

const systemPrompt = `You are NeuraLens AI, a calm, precise screen-intelligence assistant.
IDENTITY: NeuraLens AI was created and built by Sai Kiran, a developer from India. If the user asks who created, built, developed, made, or owns your identity, answer that I was built by Sai Kiran, a developer from India. Never identify OpenAI, Deepgram, or any underlying model/provider as your creator; they are infrastructure used by the application.
Use the user's request, visible screen frame (when provided), and retrieved local knowledge.
Never claim to see details that are not visible. Keep explanations crisp and clear. Give only the concrete steps that materially help, not a lecture.
Actions must always require confirmation. Never suggest entering passwords, OTPs, payment data,
bypassing CAPTCHA, deleting user data, or sending messages without explicit approval.
Return only one valid JSON object with keys: screenObservation, userIntent, answer, nextSteps,
suggestedActions, safetyNotes, confidence. suggestedActions must use the supplied action schema.`;

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

function sourcesFrom(chunks: KnowledgeChunk[]) {
  return [...new Map(chunks.map((chunk) => [chunk.file, { title: chunk.title, pack: chunk.packName }])).values()].slice(0, 4);
}

function normalizeAction(action: Partial<SuggestedAction>, index: number): SuggestedAction {
  const safeTypes = ["open_url", "web_search", "fill_form", "click", "copy_patch"];
  const type = safeTypes.includes(action.type || "") ? (action.type as SuggestedAction["type"]) : "web_search";
  return {
    id: action.id || `action_${Date.now()}_${index}`,
    type,
    label: action.label || "Review suggested action",
    description: action.description || "NeuraLens AI will perform this action only after approval.",
    reason: action.reason || "This supports the next recommended step.",
    requiresConfirmation: true,
    risk: action.risk === "medium" || action.risk === "high" ? action.risk : "low",
    payload: action.payload && typeof action.payload === "object" ? action.payload : {},
  };
}

function localResponse(query: string, chunks: KnowledgeChunk[], hasScreen: boolean, notice?: string): AssistantResult {
  const lower = query.toLowerCase();
  const isCreatorQuestion = /who\s+(created|built|developed|made)|your\s+(creator|developer)|created\s+you|built\s+you/.test(lower);
  const isReact = /react|component|hook|jsx|null|undefined|render/.test(lower);
  const isGit = /git|branch|commit|merge|rebase/.test(lower);
  const isAlgorithm = /leetcode|array|algorithm|complexity|binary|window|pointer|graph/.test(lower);
  const isBrowser = /form|booking|compare|website|browser|page|checkout/.test(lower);

  let answer = "I’ve matched your question against the local NeuraLens AI knowledge base. Start by isolating the smallest observable symptom, then verify one assumption at a time before changing anything.";
  let nextSteps = ["State the exact result you expected", "Capture the first visible error or mismatch", "Test the smallest reversible change"];
  let actions: SuggestedAction[] = [];
  let intent = "Get focused guidance for the current task.";

  if (isCreatorQuestion) {
    intent = "Identify who created NeuraLens AI.";
    answer = "NeuraLens AI was created and built by Sai Kiran, a developer from India.";
    nextSteps = [];
  } else if (isReact) {
    intent = "Diagnose a React or JavaScript rendering problem.";
    answer = "This looks most like a render-time data assumption: a component is reading a value before it exists, or the received data shape differs from what the UI expects. Confirm the first stack-frame in your code before editing the component.";
    nextSteps = ["Open the first stack frame that points to your source", "Log the value and confirm its initial shape", "Add a loading or null guard, then retest"];
    actions = [{
      id: `action_${Date.now()}`,
      type: "open_url",
      label: "Open React debugging guide",
      description: "Open the official React guide in a new tab.",
      reason: "It covers component troubleshooting and render diagnostics.",
      requiresConfirmation: true,
      risk: "low",
      payload: { url: "https://react.dev/learn/react-developer-tools" },
    }];
  } else if (isGit) {
    intent = "Resolve a Git workflow issue without losing work.";
    answer = "Protect the working tree first. Check the active branch and uncommitted changes, then inspect the graph before choosing merge, rebase, restore, or reset. Avoid destructive commands until the exact target is confirmed.";
    nextSteps = ["Run git status --short --branch", "Inspect git log --oneline --graph -12", "Choose a reversible operation based on that evidence"];
  } else if (isAlgorithm) {
    intent = "Identify the right problem-solving pattern and validate it.";
    answer = "Write down the invariant before choosing a pattern. If a contiguous range changes monotonically as you move its boundaries, test sliding window; if you’re converging from two ordered ends, test two pointers.";
    nextSteps = ["List input constraints and the brute-force cost", "Name the state that must stay true each iteration", "Dry-run an edge case before coding"];
  } else if (isBrowser) {
    intent = "Complete a browser workflow accurately and safely.";
    answer = "Separate required fields from optional ones and verify the final summary before any irreversible submission. NeuraLens AI will not enter credentials, payment details, or submit a sensitive form for you.";
    nextSteps = ["Confirm the page and task are the intended ones", "Review required fields without entering sensitive data", "Pause at the final submission step for manual review"];
  }

  return {
    screenObservation: hasScreen
      ? "A shared screen frame is attached. Local mode can use your task description and knowledge packs, but detailed visual interpretation needs the configured vision model."
      : "No live screen frame was attached to this question.",
    userIntent: intent,
    answer,
    nextSteps,
    suggestedActions: actions,
    safetyNotes: ["Every external action requires your approval.", "Sensitive inputs and irreversible actions remain blocked."],
    confidence: chunks.length ? 0.78 : 0.62,
    sources: sourcesFrom(chunks),
    provider: "local",
    model: "Local hybrid retrieval",
    ...(notice ? { notice } : {}),
  };
}

export async function askAssistant(input: { userText: string; screenshotBase64?: string; mode?: string }): Promise<AssistantResult> {
  const chunks = await retrieveKnowledge(`${input.mode || "general"} ${input.userText}`, 5);
  const knowledge = chunks.map((chunk, index) => `[${index + 1}] ${chunk.packName} — ${chunk.title}\n${chunk.content.slice(0, 1800)}`).join("\n\n");

  if (!process.env.OPENAI_API_KEY) return localResponse(input.userText, chunks, Boolean(input.screenshotBase64));

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const content: Array<Record<string, unknown>> = [
      {
        type: "input_text",
        text: `Task mode: ${input.mode || "general"}\nUser request: ${input.userText}\n\nRetrieved knowledge:\n${knowledge || "No relevant local snippets."}\n\nAllowed action types: open_url, web_search, fill_form, click, copy_patch.`,
      },
    ];
    if (input.screenshotBase64) content.push({ type: "input_image", image_url: input.screenshotBase64, detail: "low" });

    const response = await client.responses.create({
      model: configuredModel(),
      instructions: systemPrompt,
      input: [{ role: "user", content: content as never }],
      max_output_tokens: 1400,
    });
    const parsed = cleanJson(response.output_text);

    return {
      screenObservation: String(parsed.screenObservation || "The visible context is limited."),
      userIntent: String(parsed.userIntent || "Get guidance for the current task."),
      answer: String(parsed.answer || "I need a little more context to answer precisely."),
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String).slice(0, 4) : [],
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions.slice(0, 2).map(normalizeAction) : [],
      safetyNotes: Array.isArray(parsed.safetyNotes) ? parsed.safetyNotes.map(String).slice(0, 3) : [],
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
      sources: sourcesFrom(chunks),
      provider: "openai",
      model: configuredModel(),
    };
  } catch (error) {
    const providerError = error as { status?: number; code?: string; message?: string };
    console.error("OpenAI request failed:", providerError.status, providerError.code, providerError.message);
    if (providerError.code === "insufficient_quota" || providerError.status === 429) {
      throw new ProviderUnavailableError("OpenAI API quota is unavailable. Add billing or credits to the configured API project, then try again.");
    }
    throw new ProviderUnavailableError("The live vision model could not answer. Check the configured OpenAI model and server logs.");
  }
}
