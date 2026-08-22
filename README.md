# Lambdo

**See the wave. Understand the math.**

Lambdo is an interactive wave laboratory that runs entirely in the terminal. It turns the equations behind travelling waves and interference into a live, controllable visualization built from Unicode glyphs.

> The display is not a canned animation. Every frame is calculated from the current physical parameters.

[Leia em português](README.pt-BR.md)

## What is already working

- Animated one-dimensional travelling wave.
- Live controls for amplitude, wavelength, frequency, phase and time scale.
- Interference mode with Wave A, Wave B and their superposition.
- Constructive, destructive and partial interference classification.
- Equation inspector for speed, wave number and angular frequency.
- Static snapshot mode for scripts, CI and non-interactive terminals.
- Physics and rendering engines isolated from the TUI.
- Automated tests for the mathematical invariants.

## The model

Lambdo starts from the analytical travelling wave:

```text
y(x,t) = A sin(kx - ωt + φ)
```

with:

```text
v = λf        k = 2π/λ        ω = 2πf        T = 1/f
```

Interference follows the superposition principle:

```text
ytotal(x,t) = yA(x,t) + yB(x,t)
```

## Requirements

- Node.js 22 or newer
- A terminal measuring at least 80 × 24 characters

## Run locally

```bash
npm install
npm run dev
```

Or build the standalone CLI:

```bash
npm run build
npm link
lambdo
```

Print a deterministic frame without opening the interface:

```bash
lambdo --snapshot --wavelength 8 --frequency 2
lambdo --snapshot --mode interference
```

## Controls

| Key | Action |
| --- | --- |
| `↑` / `↓` | Select a parameter |
| `←` / `→` | Change the selected value |
| `Space` | Pause or resume time |
| `M` or `Tab` | Switch mode |
| `1` / `2` | Travelling wave / interference |
| `P` | Toggle Wave B between in-phase and opposite-phase |
| `H` | Open the equation guide |
| `R` | Reset the laboratory |
| `Q` | Quit |

## Architecture

```text
src/physics      analytical wave model and superposition
src/rendering    terminal-independent glyph renderer
src/app.tsx      interactive Ink interface
src/cli.tsx      command-line entry point and snapshot mode
test             mathematical and rendering invariants
```

The physics engine has no dependency on React or Ink. The interface consumes calculated state rather than owning the equations.

## Roadmap

- Reflection at fixed and free boundaries.
- Standing waves, nodes and antinodes.
- Numerical 1D wave-equation solver using finite differences.
- Stability and energy inspection.
- Two-dimensional ripple sandbox.

## License

MIT
