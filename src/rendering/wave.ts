export type CellKind = "empty" | "axis" | "glow" | "trace";

export interface WaveCell {
  glyph: string;
  kind: CellKind;
  magnitude: number;
}

export interface TraceOptions {
  width: number;
  height: number;
  span: number;
  amplitudeScale: number;
  sample: (x: number) => number;
  glow?: boolean;
}

const EMPTY: WaveCell = { glyph: " ", kind: "empty", magnitude: 0 };

function makeCell(glyph: string, kind: CellKind, magnitude = 0): WaveCell {
  return { glyph, kind, magnitude };
}

export function renderTrace({ width, height, span, amplitudeScale, sample, glow = true }: TraceOptions): WaveCell[][] {
  if (!Number.isInteger(width) || width < 2) throw new RangeError("width must be an integer greater than one");
  if (!Number.isInteger(height) || height < 3) throw new RangeError("height must be an integer greater than two");
  if (!Number.isFinite(span) || span <= 0) throw new RangeError("span must be greater than zero");
  if (!Number.isFinite(amplitudeScale) || amplitudeScale <= 0) throw new RangeError("amplitude scale must be greater than zero");

  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ ...EMPTY })));
  const center = Math.floor(height / 2);
  const verticalRadius = Math.max(1, center - 1);
  for (let column = 0; column < width; column += 1) grid[center]![column] = makeCell(column % 5 === 0 ? "┼" : "─", "axis");

  const rows: number[] = [];
  const magnitudes: number[] = [];
  for (let column = 0; column < width; column += 1) {
    const x = (column / (width - 1)) * span;
    const normalized = Math.max(-1, Math.min(1, sample(x) / amplitudeScale));
    rows.push(Math.round(center - normalized * verticalRadius));
    magnitudes.push(Math.abs(normalized));
  }

  for (let column = 0; column < width; column += 1) {
    const row = rows[column]!;
    const magnitude = magnitudes[column]!;
    if (glow) {
      for (const glowRow of [row - 1, row + 1]) {
        if (glowRow >= 0 && glowRow < height && grid[glowRow]![column]!.kind === "empty") {
          grid[glowRow]![column] = makeCell(magnitude > 0.72 ? "▒" : "░", "glow", magnitude);
        }
      }
    }
    const previous = rows[Math.max(0, column - 1)]!;
    const next = rows[Math.min(width - 1, column + 1)]!;
    const slope = next - previous;
    const glyph = magnitude > 0.92 ? "█" : slope < 0 ? "╱" : slope > 0 ? "╲" : magnitude > 0.6 ? "▓" : "━";
    grid[row]![column] = makeCell(glyph, "trace", magnitude);
  }
  return grid;
}

export function traceToText(trace: readonly (readonly WaveCell[])[]): string {
  return trace.map(row => row.map(cell => cell.glyph).join("")).join("\n");
}
