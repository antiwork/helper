---
title: Testing
---

## Vitest

The project uses [Vitest](https://vitest.dev/) for unit testing.

To run the tests:

```sh
pnpm test
```

## AI Evals

The project uses [Evalite](https://evalite.dev/) for testing AI behavior. Eval files are located in `tests/evals` and follow this pattern:

```typescript
evalite("Test description", {
  // Test data generator
  data: async () => [
    {
      input: "test input",
      expected: "expected output",
    },
  ],

  // The task to evaluate
  task: async (input) => {
    // Implementation that uses the AI model
    return result;
  },

  // Scoring methods from autoevals
  scorers: [Factuality],
});
```

To run eval tests:

```sh
pnpm eval:dev
```
