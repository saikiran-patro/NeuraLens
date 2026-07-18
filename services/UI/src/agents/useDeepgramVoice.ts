import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentMicrophone,
  AgentPlayer,
  AgentSession,
  type AgentSettingsObject,
  type FunctionCallRequestMessage,
} from "@deepgram/agents";
import { api } from "../api";
import { voiceToolDefinitions } from "../../../Agents/tools/definitions";

export type DeepgramVoiceState = "off" | "connecting" | "ready" | "listening" | "thinking" | "speaking" | "error";

interface DeepgramVoiceOptions {
  enabled: boolean;
  getScreenFrame: () => string | undefined;
  onAssistantTranscript: (id: string, text: string, final: boolean) => void;
  onError: (message: string) => void;
  onScreenRead: (detail: string) => void;
  onCodePaste: (code: string, language?: string, filename?: string) => void;
  onUserTranscript: (id: string, text: string, final: boolean) => void;
}

const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const agentPrompt = `You are NeuraLens AI, a natural screen-aware voice assistant.
IDENTITY: NeuraLens AI was created and built by Sai Kiran, a developer from India. If the user asks who created, built, developed, made, or owns your identity, answer clearly that I was built by Sai Kiran, a developer from India. Never identify OpenAI, Deepgram, GPT, or any underlying model/provider as your creator; those services are infrastructure used by NeuraLens AI.
Speak like a thoughtful person in a live conversation: warm, concise, direct, and never robotic. Use complete sentences with natural punctuation because your output is spoken aloud. Do not give canned checklists or generic troubleshooting unless the user asks for steps.

You have an inspect_shared_screen capability that returns a structured Markdown representation of content currently visible to the user. You MUST use it before answering any question about what is visible, selected, open, broken, written, or happening on the user's screen. Ground screen answers only in the returned visible content and never invent details.

STRICT USER-FACING LANGUAGE RULES:
- Never mention OCR, Markdown, confidence scores, extraction, tools, functions, pipelines, models, or any implementation detail.
- Speak from the user's perspective: say “I can see…” or “The screen shows…”.
- When visibility is partial, first state only the useful details you can clearly see. Then say, naturally, “Some of the smaller text isn't clear enough for me to read accurately.”
- When nothing useful is visible, say “I can't see enough detail on the shared screen yet.” Then ask the user to zoom in, enlarge the relevant window, or share the correct screen.
- Do not call visible text “garbled,” and do not blame the screen-reading technology.
- Do not infer non-text graphics, color, or precise layout from text alone.

For ordinary conversational questions that do not depend on the screen, answer immediately without using screen inspection. Keep most answers to two or three short sentences, and allow the user to interrupt you.
For coding problems, never speak complete code, code blocks, syntax, imports, or long commands aloud. Put the complete correct code in the chat by calling show_code_in_chat. After the function succeeds, say only: "I've pasted the correct code in the chat window," followed by at most one or two crisp sentences explaining the essential change. Use show_code_in_chat again for each separate file. Do not repeat the displayed code in your spoken response.
Before using search_web, ask the user whether they want you to search the public web for the exact query. Call it only after the user explicitly agrees in a later turn. Never send passwords, personal secrets, payment information, or screen contents as a search query. After a search, answer from the returned results, name the relevant sources naturally, and do not read long URLs aloud.`;

const agentConfig = {
  listen: {
    provider: {
      type: "deepgram",
      model: "flux-general-en",
      version: "v2",
      eot_threshold: 0.75,
      eager_eot_threshold: 0.45,
      eot_timeout_ms: 1400,
      keyterms: ["NeuraLens", "NeuraLens AI"],
    },
  },
  think: {
    provider: { type: "open_ai", model: "gpt-5.4-mini", temperature: 0.45 },
    prompt: agentPrompt,
    functions: voiceToolDefinitions,
  },
  speak: { provider: { type: "deepgram", model: "aura-2-vesta-en", speed: 1.02 } },
  greeting: "Hi, I'm NeuraLens AI. I'm ready whenever you are. What would you like to know about your screen?",
} as AgentSettingsObject;

export function useDeepgramVoice(options: DeepgramVoiceOptions) {
  const [state, setState] = useState<DeepgramVoiceState>("off");
  const sessionRef = useRef<AgentSession | null>(null);
  const microphoneRef = useRef<AgentMicrophone | null>(null);
  const playerRef = useRef<AgentPlayer | null>(null);
  const userTurnRef = useRef("");
  const assistantTurnRef = useRef("");
  const intentionalCloseRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (options.enabled) player.unmute();
    else player.mute();
  }, [options.enabled]);

  const stop = useCallback(() => {
    intentionalCloseRef.current = true;
    microphoneRef.current?.stop();
    sessionRef.current?.disconnect();
    playerRef.current?.dispose();
    microphoneRef.current = null;
    sessionRef.current = null;
    playerRef.current = null;
    userTurnRef.current = "";
    assistantTurnRef.current = "";
    setState("off");
  }, []);

  const readScreen = useCallback(async () => {
    const frame = optionsRef.current.getScreenFrame();
    if (!frame) return JSON.stringify({ screen_shared: false, visibility: "unavailable", screen_markdown: "No screen is currently shared." });
    setState("thinking");
    optionsRef.current.onScreenRead("Reading the current shared-screen view privately.");
    try {
      const { recognizeScreen } = await import("../tools/screenOcr");
      const screen = await recognizeScreen(frame);
      return JSON.stringify({
        screen_shared: true,
        visibility: screen.visibility,
        screen_markdown: screen.markdown || "No clearly readable content was found in the current view.",
      });
    } catch {
      return JSON.stringify({ screen_shared: true, visibility: "unavailable", screen_markdown: "The current shared view is not clear enough to read accurately." });
    }
  }, []);

  const handleFunctions = useCallback(async (message: FunctionCallRequestMessage) => {
    const session = sessionRef.current;
    if (!session) return;
    for (const fn of message.functions || []) {
      if (!fn.client_side) continue;
      let content: string;
      if (fn.name === "inspect_shared_screen") {
        content = await readScreen();
      } else if (fn.name === "show_code_in_chat") {
        try {
          const args = JSON.parse(String(fn.arguments || "{}")) as { code?: string; language?: string; filename?: string };
          if (!args.code?.trim()) {
            content = JSON.stringify({ error: "No code was provided for the chat." });
          } else {
            optionsRef.current.onCodePaste(args.code, args.language, args.filename);
            content = JSON.stringify({ displayed: true, instruction: "Tell the user the correct code was pasted in the chat. Do not repeat or read the code aloud." });
          }
        } catch {
          content = JSON.stringify({ error: "The code could not be displayed in chat." });
        }
      } else if (fn.name === "search_web") {
        try {
          const args = JSON.parse(String(fn.arguments || "{}")) as { query?: string; max_results?: number; user_confirmed?: boolean };
          if (args.user_confirmed !== true) {
            content = JSON.stringify({ error: "Search not performed. Ask the user to approve the exact query first." });
          } else {
            setState("thinking");
            const result = await api.searchWeb({ query: args.query || "", maxResults: args.max_results, approved: true });
            content = JSON.stringify(result);
          }
        } catch (error) {
          content = JSON.stringify({ error: error instanceof Error ? error.message : "Web search failed." });
        }
      } else {
        content = JSON.stringify({ error: `Unknown client function: ${fn.name}` });
      }
      session.sendFunctionCallResponse(fn.id, fn.name, content);
    }
  }, [readScreen]);

  const start = useCallback(async () => {
    if (state !== "off" && state !== "error") return;
    setState("connecting");
    optionsRef.current.onError("");
    intentionalCloseRef.current = false;
    try {
      if (optionsRef.current.getScreenFrame()) void import("../tools/screenOcr").then(({ warmScreenOcr }) => warmScreenOcr());

      const player = new AgentPlayer({ sampleRate: 24_000 });
      if (!optionsRef.current.enabled) player.mute();
      playerRef.current = player;

      const session = new AgentSession({
        auth: { tokenFactory: api.createDeepgramToken },
        agent: agentConfig,
        url: `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/deepgram/agent`,
        audio: {
          input: { encoding: "linear16", sampleRate: 16_000 },
          output: { encoding: "linear16", sampleRate: 24_000 },
        },
        reconnect: { enabled: true, maxAttempts: 5, baseDelay: 500, maxDelay: 8_000, jitter: true },
        keepAliveInterval: 8_000,
        tags: ["neuralens", "screen-voice-agent"],
      });
      sessionRef.current = session;

      session.on("settings-applied", () => setState("ready"));
      session.on("audio", (chunk) => player.queue(chunk));
      session.on("user-started-speaking", () => {
        player.interrupt();
        userTurnRef.current = id("voice_user");
        optionsRef.current.onUserTranscript(userTurnRef.current, "Listening…", false);
        setState("listening");
      });
      session.on("conversation-text", (message) => {
        const text = String(message.content || "").trim();
        if (!text) return;
        if (message.role === "user") {
          if (!userTurnRef.current) userTurnRef.current = id("voice_user");
          optionsRef.current.onUserTranscript(userTurnRef.current, text, true);
          userTurnRef.current = "";
          setState("thinking");
        } else {
          if (!assistantTurnRef.current) assistantTurnRef.current = id("voice_assistant");
          optionsRef.current.onAssistantTranscript(assistantTurnRef.current, text, true);
        }
      });
      session.on("agent-thinking", () => setState("thinking"));
      session.on("agent-started-speaking", () => setState("speaking"));
      session.on("agent-audio-done", () => {
        const delay = Math.max(80, Math.ceil(player.getRemainingPlaybackTime() * 1000) + 50);
        window.setTimeout(() => {
          assistantTurnRef.current = "";
          if (sessionRef.current === session) setState("ready");
        }, delay);
      });
      session.on("function-call-request", (message) => { void handleFunctions(message); });
      session.on("reconnecting", () => setState("connecting"));
      session.on("error", (message) => {
        optionsRef.current.onError(message.description || "Deepgram reported a voice-agent error.");
        setState("error");
      });
      session.on("sdk-error", (error) => {
        optionsRef.current.onError(error.message || "Deepgram voice could not connect.");
        setState("error");
      });
      session.on("disconnected", (reason) => {
        if (!intentionalCloseRef.current) {
          optionsRef.current.onError(reason || "The Deepgram voice session disconnected.");
          setState("error");
        }
      });

      const microphone = new AgentMicrophone((data) => session.sendAudio(data), {
        sampleRate: 16_000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      microphone.on("error", (error) => {
        optionsRef.current.onError(error.message || "Microphone input failed.");
        setState("error");
      });
      microphoneRef.current = microphone;

      await session.connect();
      await microphone.start();
    } catch (error) {
      stop();
      const message = error instanceof Error ? error.message : "Deepgram voice could not start.";
      optionsRef.current.onError(message);
      setState("error");
    }
  }, [handleFunctions, state, stop]);

  useEffect(() => () => stop(), [stop]);

  return { state, start, stop };
}
