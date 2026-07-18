# NeuraLens AI Architecture

The application uses a React/Vite client, an Express API, and a shared agent-contract layer. The client owns screen-share permission, single-frame capture, on-device screen reading, Deepgram session playback, UI state, and confirmed browser actions. The API owns secrets, knowledge indexing, retrieval, provider calls, web search, response normalization, and final action-policy validation.

## Source layout

- `services/Agents` defines shared agent tool schemas and documents the AI boundary.
- `services/UI/src/agents` manages the realtime Deepgram Voice Agent session.
- `services/UI/src/tools` implements browser-only capabilities.
- `services/Backend/src/agents` orchestrates typed multimodal and local responses.
- `services/Backend/src/tools` implements privileged server-side tools.

## Request path

1. The user asks by text or through the persistent realtime voice session.
2. Screen-dependent voice turns call the browser screen-inspection tool; typed turns attach one ephemeral resized frame.
3. Typed requests retrieve relevant local knowledge before provider reasoning.
4. Approved web searches run through the server and return concise results with source URLs.
5. Coding solutions use a chat-display tool so complete code is not spoken aloud.
6. The client renders guidance and presents external or state-changing actions separately for confirmation.

The knowledge folders are intentionally portable. They can later be indexed with SQLite FTS or embeddings without changing the UI response contract.
