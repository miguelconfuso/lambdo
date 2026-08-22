# Presenting Lambdo

This is a short demonstration route for a portfolio review, class presentation or technical interview.

## One-minute version

1. Start with the problem: wave equations are compact, but their parameters are hard to visualize from symbols alone.
2. Open `lambdo` and change `λ`, `f` and `A` in travelling-wave mode.
3. Switch to interference with `2` and change `φB`.
4. Stop at `Δφ = 0`, `π/2` and `π` to show reinforcement, partial interference and cancellation.
5. Press `H` to connect the current picture to the live equations.
6. Run `npm run compare` to show that the visual states are also reproducible numerical results.

## Engineering points worth highlighting

- The physics engine does not depend on the terminal UI.
- Every frame is calculated from analytical equations; there is no prerecorded animation.
- The ANSI runtime updates only changed regions and prevents an output queue from growing without bounds.
- The same functions power the animation, comparison output and automated tests.
- There are no runtime package dependencies.

## Useful commands

```bash
npm start
npm run compare
node dist/cli.js --compare --json
node dist/cli.js --snapshot --mode interference
npm run check
```
