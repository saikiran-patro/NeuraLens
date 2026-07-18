# Getting Started

Run `npm install`, then `npm run dev`. Open `http://localhost:5173`; the local API listens on `http://localhost:8787`.

The app works immediately in private local retrieval mode. To enable live visual reasoning, use `services/.env.example` as a template and add an OpenAI API key to `services/.env`. API keys stay in the server process and are never included in the browser bundle.

Useful checks are `npm run typecheck` and `npm run build`.
