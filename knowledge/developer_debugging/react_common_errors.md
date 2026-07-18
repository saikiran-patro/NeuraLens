# React Common Errors

## Cannot read properties of undefined

Start at the first stack frame that points to application code. Log the value immediately before the failing access and compare its initial value with its loaded value. Common causes are asynchronous data that is initially null, a prop name mismatch, and an API response nested one level deeper than expected.

Prefer an explicit state branch over scattered optional chaining. Render a loading state while data is unavailable, an empty state when the request succeeds without data, and the component only when its required shape exists. Optional chaining is appropriate for truly optional presentation fields, not for hiding a broken contract.

## Invalid hook call

Hooks must run at the top level of a React function component or custom hook. Do not call hooks inside conditions, loops, event handlers, or regular utility functions. Also check for duplicate React installations with `npm ls react react-dom` and ensure renderer and React versions are compatible.

## Too many re-renders

A state setter is probably running during render. Pass a function to event props instead of calling it, move synchronization into an effect, and verify that an effect dependency is not recreated on every render. Derive values during render when they do not need independent state.

## Effect debugging order

First identify what external system the effect synchronizes with. Then list every reactive value read by the effect, stabilize objects or functions only when necessary, and add cleanup for subscriptions, timers, and requests. If there is no external system, the effect may be unnecessary.
