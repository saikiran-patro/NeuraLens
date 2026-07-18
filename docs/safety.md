# Safety and Privacy Model

- Screen access begins with an explicit browser permission prompt and ends whenever the user stops the track.
- Only a single compressed frame is sent with an assistant request; the application does not store screenshots.
- Provider keys are read only by the API from `services/.env`.
- Suggested actions are inert until an approval modal explains the exact operation, reason, and risk.
- The API revalidates every approved action and blocks high-risk or sensitive payloads.
- Passwords, OTPs, payment details, CAPTCHA handling, destructive file changes, and silent external communication are outside the application scope.
