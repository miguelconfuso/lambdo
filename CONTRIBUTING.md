# Contributing to Lambdo

Thanks for helping make wave physics easier to see and understand.

## Local setup

Lambdo requires Node.js 22 or newer.

```bash
git clone https://github.com/miguelconfuso/lambdo.git
cd lambdo
npm ci
npm run build
npm start
```

Use `npm run dev` while changing the interactive interface and `npm run snapshot` when a non-interactive frame is enough.

## Before opening a pull request

```bash
npm run check
npm run compare
```

The first command runs tests, TypeScript verification and the production build. The second makes the canonical interference cases easy to inspect.

## Architecture rules

- Physics logic must remain independent from terminal rendering.
- Rendering functions should be deterministic for the same inputs.
- CLI comparisons and documentation must use values produced by the physics engine.
- Terminal animation must respect output backpressure and avoid unbounded queues.
- New physical behavior should include a focused invariant test.

## Commit style

Prefer small commits with an imperative description and a conventional prefix:

```text
feat: add standing-wave mode
fix: preserve phase after resizing
docs: explain reflection boundaries
test: cover destructive interference
perf: reduce terminal output
```

## Proposing a feature

Open a feature request describing the physical concept, the user-visible behavior and how the result could be verified. For a large mode, discuss the design before writing the complete implementation.
