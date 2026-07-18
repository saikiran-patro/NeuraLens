# Complexity Explainer

## Time complexity

Count how the dominant operation grows with input size. Consecutive phases add and nested independent loops multiply. A sliding window can be linear even with a nested while loop when each element enters and leaves at most once.

## Space complexity

Count additional memory created by the algorithm. Include hash maps, queues, recursion depth, copied slices, and output only when the problem asks for total rather than auxiliary space.

## Constraint-driven choice

Small inputs may permit quadratic work; inputs around one hundred thousand usually require near-linear or `n log n` behavior. Treat these as guidance and account for expensive inner operations and language overhead.

## Explain the proof

Tie the complexity claim to a concrete bound: each index advances at most n times, each edge is visited once, or the search interval halves on every step.
