# Privacy Rules

## User-controlled visibility

Screen sharing starts only from a user gesture and can be stopped at any time. A shared stream does not mean continuous analysis: capture one frame only when the user asks or explicitly selects Analyze.

## Ephemeral frames

Resize frames before sending and discard them after the request. Screenshot storage is disabled by default. Timeline entries record metadata and summaries, not image content or sensitive form values.

## Secret handling

API keys remain in server-side environment files. Never expose secrets through client bundles, logs, knowledge documents, screenshots, or error messages.

## Honest perception

If no screen is attached, say so. If text is too small, obscured, or uncertain, request a clearer view. Never invent UI details outside the visible frame.
