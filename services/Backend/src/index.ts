import "dotenv/config";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";
import { askAssistant, ProviderUnavailableError } from "./agents/assistant.js";
import { getKnowledgePacks, knowledgeDocumentCount, loadKnowledge } from "./knowledge.js";
import type { SuggestedAction } from "./types.js";
import { searchWeb } from "./tools/webSearch.js";

dotenv.config({ path: path.resolve(process.cwd(), "services/.env") });

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "12mb" }));

const deepgramThinkModel = () => process.env.DEEPGRAM_THINK_MODEL || "gpt-5.4-mini";
const deepgramVoiceModel = () => process.env.DEEPGRAM_VOICE_MODEL || "aura-2-vesta-en";

app.get("/api/health", async (_request, response) => {
  response.json({
    status: "ready",
    provider: process.env.OPENAI_API_KEY ? "openai" : "local",
    model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || "gpt-5.6-luna" : "Local hybrid retrieval",
    voiceProvider: process.env.DEEPGRAM_API_KEY ? "deepgram" : "unavailable",
    voiceModel: process.env.DEEPGRAM_API_KEY ? `${deepgramThinkModel()} + ${deepgramVoiceModel()}` : "Unavailable",
    knowledgeDocuments: await knowledgeDocumentCount(),
  });
});

const voiceTokens = new Map<string, number>();
app.post("/api/deepgram/token", (_request, response) => {
  if (!process.env.DEEPGRAM_API_KEY) {
    response.status(503).json({ error: "Configure DEEPGRAM_API_KEY to start the voice agent." });
    return;
  }
  const token = randomUUID();
  voiceTokens.set(token, Date.now() + 5 * 60_000);
  response.set("Cache-Control", "no-store").type("text/plain").send(token);
});

app.get("/api/knowledge/packs", async (_request, response, next) => {
  try {
    response.json({ packs: await getKnowledgePacks() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/assistant/ask", async (request, response, next) => {
  try {
    const { userText, screenshotBase64, mode } = request.body || {};
    if (typeof userText !== "string" || !userText.trim()) {
      response.status(400).json({ error: "Tell NeuraLens AI what you want help with." });
      return;
    }
    if (userText.length > 6000) {
      response.status(400).json({ error: "Please shorten the request to under 6,000 characters." });
      return;
    }
    response.json(await askAssistant({ userText: userText.trim(), screenshotBase64, mode }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/search", async (request, response, next) => {
  try {
    const { query, maxResults, approved } = request.body || {};
    if (approved !== true) {
      response.status(403).json({ error: "Ask the user to approve this exact web search first." });
      return;
    }
    response.json(await searchWeb(query, maxResults));
  } catch (error) {
    next(error);
  }
});

const blockedPayloadKeys = ["password", "otp", "payment", "card", "cvv", "captcha"];
app.post("/api/actions/confirm", (request, response) => {
  const { approved, action } = request.body as { approved?: boolean; action?: SuggestedAction };
  if (!action || !action.type) {
    response.status(400).json({ error: "A valid action is required." });
    return;
  }
  const payloadText = JSON.stringify(action.payload || {}).toLowerCase();
  if (blockedPayloadKeys.some((key) => payloadText.includes(key)) || action.risk === "high") {
    response.status(403).json({ error: "This action is blocked by the NeuraLens AI safety policy." });
    return;
  }
  if (!approved) {
    response.json({ status: "cancelled", message: "Action cancelled. Nothing changed." });
    return;
  }
  response.json({ status: "approved", message: `${action.label} was approved and logged.` });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (error instanceof ProviderUnavailableError) {
    response.status(503).json({ error: error.message });
    return;
  }
  response.status(500).json({ error: "NeuraLens AI encountered an unexpected error." });
});

await loadKnowledge();
const server = app.listen(port, () => {
  console.log(`NeuraLens AI API ready at http://localhost:${port}`);
});

const voiceProxy = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) => protocols.has("bearer") ? "bearer" : protocols.has("token") ? "token" : false,
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const voicePaths = new Set(["/api/deepgram/agent", "/api/deepgram/agent/v1/agent/converse"]);
  if (!voicePaths.has(url.pathname)) return;
  const protocols = String(request.headers["sec-websocket-protocol"] || "").split(",").map((value) => value.trim());
  const authorization = String(request.headers.authorization || "");
  const headerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = protocols.find((value) => voiceTokens.has(value)) || (headerToken && voiceTokens.has(headerToken) ? headerToken : undefined);
  const expiresAt = token ? voiceTokens.get(token) : undefined;
  if (!token || !expiresAt || expiresAt < Date.now()) {
    if (token) voiceTokens.delete(token);
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  voiceTokens.delete(token);
  voiceProxy.handleUpgrade(request, socket, head, (client) => voiceProxy.emit("connection", client, request));
});

voiceProxy.on("connection", (client) => {
  const upstream = new WebSocket("wss://agent.deepgram.com/v1/agent/converse", {
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
  });
  const pending: Array<{ data: Buffer; binary: boolean }> = [];

  client.on("message", (data, binary) => {
    let buffer = Buffer.from(data as ArrayBuffer);
    if (!binary) {
      try {
        const message = JSON.parse(buffer.toString()) as any;
        if (message.type === "Settings" && message.agent) {
          if (message.agent.think?.provider) message.agent.think.provider.model = deepgramThinkModel();
          if (message.agent.speak?.provider) message.agent.speak.provider.model = deepgramVoiceModel();
          message.mip_opt_out = true;
          message.flags = { ...message.flags, history: true };
          buffer = Buffer.from(JSON.stringify(message));
        }
      } catch { /* Binary audio and non-JSON control frames pass through unchanged. */ }
    }
    if (upstream.readyState === WebSocket.OPEN) upstream.send(buffer, { binary });
    else if (upstream.readyState === WebSocket.CONNECTING) pending.push({ data: buffer, binary });
  });
  upstream.on("open", () => {
    for (const message of pending.splice(0)) upstream.send(message.data, { binary: message.binary });
  });
  upstream.on("message", (data, binary) => {
    if (client.readyState === WebSocket.OPEN) client.send(data, { binary });
  });
  upstream.on("close", (code, reason) => {
    if (client.readyState === WebSocket.OPEN) client.close(code === 1005 ? 1000 : code, reason.toString().slice(0, 120));
  });
  upstream.on("error", () => {
    if (client.readyState === WebSocket.OPEN) client.close(1011, "Deepgram voice connection failed");
  });
  client.on("close", () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
  });
});
