# JavaScript Runtime Errors

## Read the first useful frame

Error messages describe the symptom; the first stack frame in your source usually identifies the cause. Capture the exact message, file, line, and input that triggered it. Ignore framework internals until application frames have been inspected.

## TypeError workflow

For an undefined property, inspect the value on the left side of the property access. For “is not a function,” verify the import style, exported name, and runtime type. For iteration errors, confirm the value is an array or iterable before using map, filter, or spread syntax.

## Async failures

Await promises inside a try/catch at the boundary that can recover. Check the network response status before parsing JSON, and surface a useful error state. Use `Promise.all` only when every operation may run concurrently and all results are required; use `Promise.allSettled` when partial results are acceptable.

## Minimal reproduction

Reduce the failure to the smallest input and function. Remove unrelated rendering, requests, and state. A minimal reproduction distinguishes a data problem from a timing problem and makes each hypothesis quick to test.
