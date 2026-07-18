# Browser Console Debugging

## Console triage

Clear old output, reproduce once, and address the earliest red error. Expand the stack trace and open the first application source frame. Warnings can be important, but errors that block execution come first.

## Network triage

Filter Fetch/XHR requests and inspect status, request payload, response body, and timing. A 4xx response usually means the client request or authorization is wrong; a 5xx response points to the server path. A successful 200 with wrong content is a data-contract issue.

## Source maps and breakpoints

Use source maps to debug authored TypeScript or JSX. Place a breakpoint before the bad value is consumed, inspect scope variables, and step over one operation at a time. Conditional breakpoints help isolate one failing item in repeated renders.

## Preserve useful evidence

Copy the exact error and relevant request metadata without tokens, cookies, passwords, or private payloads. Do not paste complete environment files into chat or issue trackers.
