# Repository agent guide

Runtime AI code lives under `services/Agents` and the platform-specific `agents` and `tools` directories. This hidden folder is reserved for coding-agent guidance and must not contain application runtime code or secrets.

## Working conventions

- Keep shared tool schemas in `services/Agents/tools`.
- Keep API keys and external-provider calls in `services/Backend`.
- Keep microphone, screen-share, and browser-only capabilities in `services/UI`.
- Require explicit approval before external searches or state-changing actions.
- Run `npm run typecheck` and `npm run build` before committing.
- Never commit `services/.env`, logs, generated `dist`, or `node_modules`.
