# Core Algorithm Patterns

## Sliding window

Use for contiguous ranges when expanding one boundary and shrinking the other can maintain an invariant. Define exactly what makes a window valid, update counts as elements enter and leave, and record the answer at the correct validity point.

## Two pointers

Use when ordered structure lets two indices converge or when read/write positions transform an array in place. State why moving a particular pointer cannot discard a valid answer.

## Binary search

Binary search requires a monotonic predicate, not only a sorted array. Choose whether the interval is closed or half-open, keep that convention throughout, and test one-element and no-solution inputs.

## Graph traversal

BFS is natural for unweighted shortest paths and level order. DFS is natural for reachability, components, and recursive structure. Mark nodes visited when enqueued or entered so cycles do not duplicate work.

## Dynamic programming

Define the state in one sentence, list transitions from smaller states, identify base cases, and determine evaluation order. Optimize space only after the full recurrence is correct.
