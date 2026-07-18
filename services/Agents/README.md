# NeuraLens AI agents

This directory is the shared contract layer for NeuraLens AI behavior.

## Structure

- `tools/definitions.ts` contains the tool names and JSON schemas exposed to the realtime agent.
- `Backend/src/agents` contains server-side agent orchestration and typed model responses.
- `Backend/src/tools` contains privileged server-side tool implementations.
- `UI/src/agents` contains browser realtime-agent lifecycle code.
- `UI/src/tools` contains browser-only tool implementations such as shared-screen reading.

Tool definitions belong here; tool implementations stay in the runtime that owns the required capability. This keeps API keys and external search on the server while microphone, chat, and screen access remain in the browser.

## Adding a tool

1. Add its public schema to `tools/definitions.ts`.
2. Implement it under `Backend/src/tools` or `UI/src/tools`.
3. Handle the function call in the relevant agent.
4. Add confirmation rules for any external or state-changing operation.
5. Run `npm run typecheck` and `npm run build`.
