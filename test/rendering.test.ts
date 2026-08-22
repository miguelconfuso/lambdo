import assert from "node:assert/strict";
import test from "node:test";
import { renderTrace, traceToText } from "../src/rendering/wave.js";

test("renderer preserves the requested terminal dimensions", () => {
  const trace = renderTrace({ width: 40, height: 9, span: 10, amplitudeScale: 1, sample: Math.sin });
  assert.equal(trace.length, 9);
  assert.ok(trace.every(row => row.length === 40));
});

test("zero displacement is drawn over the central axis", () => {
  const trace = renderTrace({ width: 20, height: 7, span: 10, amplitudeScale: 1, sample: () => 0, glow: false });
  const center = Math.floor(trace.length / 2);
  assert.ok(trace[center]!.every(cell => cell.kind === "trace"));
});

test("waveform uses terminal glyphs and glow instead of a prebuilt image", () => {
  const trace = renderTrace({ width: 50, height: 11, span: 12, amplitudeScale: 1, sample: x => Math.sin(x) });
  const cells = trace.flat();
  assert.ok(cells.some(cell => cell.kind === "trace"));
  assert.ok(cells.some(cell => cell.kind === "glow"));
  assert.match(traceToText(trace), /[╱╲━▓█]/u);
});

test("renderer rejects dimensions that cannot represent a wave", () => {
  assert.throws(() => renderTrace({ width: 1, height: 7, span: 10, amplitudeScale: 1, sample: () => 0 }), /width/);
  assert.throws(() => renderTrace({ width: 10, height: 2, span: 10, amplitudeScale: 1, sample: () => 0 }), /height/);
  assert.throws(() => renderTrace({ width: 10, height: 7, span: 10, amplitudeScale: 0, sample: () => 0 }), /amplitude scale/);
});
