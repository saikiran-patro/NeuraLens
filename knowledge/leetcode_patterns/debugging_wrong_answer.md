# Debugging a Wrong Answer

## Preserve the failing case

Write down the exact input, actual output, and expected output. Trace state changes by hand and find the first step where the algorithm diverges; later differences are usually consequences.

## Edge-case checklist

Test empty and one-element inputs, duplicates, all-equal values, already sorted and reverse order, minimum and maximum constraints, negative values, disconnected graphs, and answers at the first or last position.

## Check the invariant

For each loop, say what must be true before and after an iteration. For recursion, say what each call returns. For dynamic programming, verify every transition comes from already valid states.

## Complexity and overflow

An algorithm can be logically correct but exceed time or memory constraints. Count nested work with respect to input limits. Confirm numeric types can hold intermediate values, not only the final answer.
