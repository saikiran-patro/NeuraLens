# npm and Build Debugging

## Diagnose before reinstalling

Read the first error, not the final cascade. Confirm the Node and npm versions, the active working directory, and the script being run. Use `npm run` to list scripts and `npm ls <package>` to inspect the installed dependency graph.

## Dependency conflicts

Peer dependency errors mean packages declare incompatible expectations. Prefer upgrading the related packages together or selecting compatible versions. Do not default to `--force`; it can create an install that builds but fails at runtime.

## Clean install

When the lockfile is authoritative, `npm ci` gives a reproducible install. Deleting the lockfile should be a deliberate dependency update, not a routine fix. Preserve the original error and Git status before removing generated artifacts.

## Vite and environment variables

Client variables must use the configured public prefix and are bundled into browser code. Secrets must stay in the server environment and never use a client-visible prefix. Restart the development server after changing environment files.
