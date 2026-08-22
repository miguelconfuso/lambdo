<div align="center">
  <img src="./docs/assets/lambdo.png" width="280" alt="Lambdo" />
  <p><strong>See the wave. Understand the math.</strong></p>
  <p>Change the equation. Watch the physics respond.</p>
  <p>
    <a href="https://github.com/miguelconfuso/lambdo/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/miguelconfuso/lambdo/ci.yml?branch=main&style=flat-square&label=build" /></a>
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
    <img alt="Version 0.1.0" src="https://img.shields.io/badge/version-0.1.0-f05c58?style=flat-square" />
    <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/github/license/miguelconfuso/lambdo?style=flat-square" /></a>
  </p>
  <p><strong>English</strong> · <a href="./README.pt-BR.md">Português</a></p>
</div>

<p align="center">
  <img src="./docs/assets/lambdo-interference.svg" width="940" alt="Lambdo visualizing partial interference in the terminal" />
</p>

---

Lambdo is an interactive wave-physics laboratory that runs entirely in the terminal. It visualizes travelling waves, phase and interference directly from their physical parameters—no canned animations and no UI-framework runtime.

## The difference is visible and measurable

For two equal waves with amplitude `1`, changing only the phase difference moves the result from full reinforcement to complete cancellation.

| Case | Phase difference | Result amplitude | Maximum | Classification |
|---|---:|---:|---:|---|
| In phase | `0.00 rad` | `2.00` | `100%` | Constructive |
| Quarter cycle | `1.57 rad` | `1.41` | `71%` | Partial |
| Opposite phase | `3.14 rad` | `0.00` | `0%` | Destructive |

These values come from the same physics engine used by the live interface. Reproduce them with:

```bash
npm run compare
```

For equal amplitudes, the analytical result is `Aresult = 2A · |cos(Δφ / 2)|`.

## Quick start

Lambdo requires Node.js 22 or newer and a terminal measuring at least 80 × 24 characters.

```bash
git clone https://github.com/miguelconfuso/lambdo.git
cd lambdo
npm ci
npm run build
npm start
```

Install the command globally from the cloned project:

```bash
npm install -g .
lambdo
```

## Why Lambdo?

Lambdo started while I was studying waves and interference in physics. I wanted changing `λ`, `f`, `A` or `φ` to immediately show what that value actually does to a wave.

The goal is simple: **see the equation behave**.

## What is inside

- Animated one-dimensional travelling waves.
- Live amplitude, wavelength, frequency, phase and time-scale controls.
- Wave A, Wave B and resultant superposition views.
- Constructive, destructive, partial and cancelled classifications.
- Phase-difference rails, result-intensity bar and live equations.
- Contextual Learn mode explaining the current physical state.
- Deterministic snapshot and comparison modes for scripts and CI.
- Direct ANSI rendering with changed-region updates and output backpressure.
- No runtime dependencies; the compiled CLI is approximately 19 KB.

## Physical model

| Quantity | Relation | Meaning |
|---|---|---|
| Displacement | `y(x,t) = A sin(kx − ωt + φ)` | Wave position at space and time |
| Speed | `v = λf` | Distance travelled per second |
| Wave number | `k = 2π/λ` | Spatial angular frequency |
| Angular frequency | `ω = 2πf` | Temporal angular frequency |
| Period | `T = 1/f` | Time for one complete cycle |
| Superposition | `ytotal = y₁ + y₂` | Sum of simultaneous displacements |

Every displayed point is recalculated from the current parameters.

## CLI

```bash
# Open the interactive laboratory
npm start

# Reproducible interference comparison
npm run compare

# Machine-readable comparison
node dist/cli.js --compare --json

# Deterministic frames without opening the interface
node dist/cli.js --snapshot --wavelength 8 --frequency 2
node dist/cli.js --snapshot --mode interference
```

Run `node dist/cli.js --help` for every option.

<details>
<summary><strong>Keyboard map</strong></summary>

| Key | Action |
|---|---|
| `↑` / `↓` | Select a parameter |
| `←` / `→` | Change the selected value |
| `Space` | Pause or resume time |
| `M` or `Tab` | Switch mode |
| `1` / `2` | Travelling wave / interference |
| `P` | Toggle Wave B between in-phase and opposite-phase |
| `H` | Open contextual Learn mode |
| `R` | Reset the laboratory |
| `Q` | Quit |

</details>

## Architecture

```text
             ┌──────────────────┐
             │  Physics engine  │
             │     wave.ts      │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │ Simulation data  │
             └────────┬─────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Unicode renderer │    │ Snapshot/compare │
└─────────┬────────┘    └──────────────────┘
          ▼
┌──────────────────┐
│ ANSI terminal UI │
│ diff + backpress │
└──────────────────┘
```

Physics is independent from presentation. The same analytical functions power the animation, snapshots, comparisons and tests.

## Engineering checks

```bash
npm ci
npm run check
```

The check runs mathematical and rendering tests, verifies TypeScript and creates the production bundle. CI repeats the locked installation and the same verification on every push and pull request.

## Project documents

- [Presentation guide](docs/PRESENTATION.md)
- [Release process](docs/RELEASING.md)
- [Changelog](CHANGELOG.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Roadmap

- Reflection at fixed and free boundaries.
- Standing waves, nodes and antinodes.
- Numerical 1D wave-equation solver using finite differences.
- Stability, energy and convergence inspection.
- Two-dimensional ripple sandbox.

## License

[MIT](LICENSE) — use it, study it and adapt it.
