# NeuraLens AI

NeuraLens AI is a private, voice-first screen intelligence assistant. It can analyze a user-selected screen frame, hold a low-latency voice conversation, search the public web with approval, and preview every safe action before it runs.

## Included in this MVP

- Persistent Light, Dark, and transparent Glass appearance modes
- User-controlled screen sharing and single-frame analysis
- Deepgram Voice Agent WebSocket with synchronized user and assistant transcripts
- Flux semantic turn detection that responds when the user stops speaking
- Aura-2 neural voice output with barge-in interruption support
- Private on-device OCR exposed to the voice agent as a screen-inspection tool
- Approved public-web search with server-side provider access and source URLs
- Coding answers displayed in chat without reading full code aloud
- OpenAI Responses API adapter for multimodal reasoning
- Local RAG when no live provider is configured; actionable errors when a configured provider is unavailable
- 15 readable Markdown knowledge documents across five packs
- Confirmation-first actions with server-side safety validation
- Transparent activity timeline and privacy controls

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the product landing page. Select **Try now** or open [http://localhost:5173/app](http://localhost:5173/app) for the web application. The API runs on [http://localhost:8787](http://localhost:8787).

Copy `services/.env.example` to `services/.env` and add a Deepgram API key; add an OpenAI key only if you also want typed multimodal requests. Tavily is optional because web search has a keyless Bing fallback. Long-lived keys remain in the server process. The browser receives a short-lived NeuraLens AI proxy token, while the server authenticates the upstream Deepgram WebSocket. Start screen sharing, then select the microphone button to open the persistent voice session.

## Windows desktop app

Run the desktop app in development mode:

```bash
npm run desktop
```

Build the Windows installer:

```bash
npm run desktop:package
```

The installer is written to `release/NeuraLens-AI-Setup-<version>.exe`. The landing page's **Download for Windows** button downloads that file through `/api/downloads/windows`. In production, place the installer in `release/` beside the server or set `NEURALENS_WINDOWS_INSTALLER` to its absolute path.

The packaged app never embeds API secrets. On first launch it creates `%APPDATA%\neuralens\.env` from `services/.env.example`; add the provider keys there for local voice and model access.

## Useful commands

```bash
npm run typecheck
npm run build
npm run build:backend
npm run dev:server
npm run dev:client
npm run desktop
npm run desktop:package
```

## Project map

```text
services/Agents/      Shared agent contracts and tool definitions
services/UI/src/agents/  Browser realtime-agent lifecycle
services/UI/src/tools/   Browser-only screen tools
services/Backend/src/agents/  Server model orchestration
services/Backend/src/tools/   Privileged server-side tools
knowledge/            Curated Markdown knowledge packs
docs/                 Architecture, safety model, and demo script
support/              Optional provider samples
```

See `docs/safety.md` for the approval and data-handling contract, and `NeuraLens_Design_Document.md` for the broader product vision.
