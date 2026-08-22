import assert from "node:assert/strict";
import test from "node:test";
import {
  TAU,
  classifyInterference,
  deriveWave,
  displacementAt,
  frequencyFromCycles,
  resultantAmplitude,
  shortestPhaseDifference,
  superpositionAt,
  waveSpeed,
  type WaveParameters,
} from "../src/physics/wave.js";

const wave: WaveParameters = {
  amplitude: 2,
  wavelength: 4,
  frequency: 5,
  phase: 0,
  direction: 1,
};

const closeTo = (actual: number, expected: number, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
};

test("fundamental relation returns v = lambda times frequency", () => {
  assert.equal(waveSpeed(4, 5), 20);
});

test("frequency is the number of cycles divided by elapsed time", () => {
  assert.equal(frequencyFromCycles(12, 3), 4);
});

test("derived quantities follow the analytical wave definitions", () => {
  const derived = deriveWave(wave);
  assert.equal(derived.speed, 20);
  assert.equal(derived.period, 0.2);
  closeTo(derived.waveNumber, Math.PI / 2);
  closeTo(derived.angularFrequency, 10 * Math.PI);
});

test("a travelling wave advances by v times t", () => {
  const time = 0.137;
  const position = 7.2;
  const shifted = position - waveSpeed(wave.wavelength, wave.frequency) * time;
  closeTo(displacementAt(position, time, wave), displacementAt(shifted, 0, wave));
});

test("waves in phase interfere constructively", () => {
  assert.equal(classifyInterference(1, 1, 0), "constructive");
  assert.equal(resultantAmplitude(1, 1, 0), 2);
});

test("equal waves separated by pi cancel completely", () => {
  const opposite = { ...wave, phase: Math.PI };
  closeTo(superpositionAt(1.25, 0.7, [wave, opposite]), 0);
  assert.equal(classifyInterference(2, 2, Math.PI), "destructive");
});

test("a quarter-cycle phase difference produces partial interference", () => {
  assert.equal(classifyInterference(1, 1, Math.PI / 2), "partial");
  closeTo(resultantAmplitude(1, 1, Math.PI / 2), Math.sqrt(2));
});

test("phase difference is wrapped to the shortest angular distance", () => {
  closeTo(shortestPhaseDifference(0, TAU - 0.2), 0.2);
});

test("left-moving and right-moving waves use opposite time signs", () => {
  const right = { ...wave, phase: 0.3, direction: 1 as const };
  const left = { ...wave, phase: 0.3, direction: -1 as const };
  closeTo(displacementAt(2, 0.4, right), displacementAt(2, -0.4, left));
});

test("invalid physical parameters fail before simulation", () => {
  assert.throws(() => waveSpeed(0, 2), /greater than zero/);
  assert.throws(() => deriveWave({ ...wave, amplitude: -1 }), /non-negative/);
  assert.throws(() => frequencyFromCycles(3, 0), /elapsed time/);
});
