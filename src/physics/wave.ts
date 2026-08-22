export const TAU = Math.PI * 2;

export type Direction = 1 | -1;

export interface WaveParameters {
  amplitude: number;
  wavelength: number;
  frequency: number;
  phase: number;
  direction: Direction;
}

export interface WaveDerived {
  speed: number;
  period: number;
  waveNumber: number;
  angularFrequency: number;
}

export type InterferenceKind = "constructive" | "destructive" | "partial";

export interface InterferenceComparison {
  label: "In phase" | "Quarter cycle" | "Opposite phase";
  phaseDifference: number;
  resultantAmplitude: number;
  maximumRatio: number;
  kind: InterferenceKind;
}

export const DEFAULT_WAVE: WaveParameters = {
  amplitude: 1,
  wavelength: 8,
  frequency: 1,
  phase: 0,
  direction: 1,
};

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
}

export function validateWave(wave: WaveParameters): void {
  finite(wave.amplitude, "amplitude");
  finite(wave.wavelength, "wavelength");
  finite(wave.frequency, "frequency");
  finite(wave.phase, "phase");
  if (wave.amplitude < 0) throw new RangeError("amplitude must be non-negative");
  if (wave.wavelength <= 0) throw new RangeError("wavelength must be greater than zero");
  if (wave.frequency <= 0) throw new RangeError("frequency must be greater than zero");
  if (wave.direction !== 1 && wave.direction !== -1) throw new RangeError("direction must be 1 or -1");
}

export function waveSpeed(wavelength: number, frequency: number): number {
  finite(wavelength, "wavelength");
  finite(frequency, "frequency");
  if (wavelength <= 0 || frequency <= 0) throw new RangeError("wavelength and frequency must be greater than zero");
  return wavelength * frequency;
}

export function frequencyFromCycles(cycles: number, elapsedSeconds: number): number {
  finite(cycles, "cycles");
  finite(elapsedSeconds, "elapsed time");
  if (cycles < 0 || elapsedSeconds <= 0) throw new RangeError("cycles must be non-negative and elapsed time must be positive");
  return cycles / elapsedSeconds;
}

export function deriveWave(wave: WaveParameters): WaveDerived {
  validateWave(wave);
  return {
    speed: waveSpeed(wave.wavelength, wave.frequency),
    period: 1 / wave.frequency,
    waveNumber: TAU / wave.wavelength,
    angularFrequency: TAU * wave.frequency,
  };
}

export function phaseAt(x: number, time: number, wave: WaveParameters): number {
  finite(x, "position");
  finite(time, "time");
  const { waveNumber, angularFrequency } = deriveWave(wave);
  return waveNumber * x - wave.direction * angularFrequency * time + wave.phase;
}

export function displacementAt(x: number, time: number, wave: WaveParameters): number {
  return wave.amplitude * Math.sin(phaseAt(x, time, wave));
}

export function superpositionAt(x: number, time: number, waves: readonly WaveParameters[]): number {
  return waves.reduce((sum, wave) => sum + displacementAt(x, time, wave), 0);
}

export function shortestPhaseDifference(phaseA: number, phaseB: number): number {
  finite(phaseA, "phase A");
  finite(phaseB, "phase B");
  const wrapped = ((phaseB - phaseA + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return Math.abs(wrapped);
}

export function resultantAmplitude(amplitudeA: number, amplitudeB: number, phaseDifference: number): number {
  finite(amplitudeA, "amplitude A");
  finite(amplitudeB, "amplitude B");
  finite(phaseDifference, "phase difference");
  if (amplitudeA < 0 || amplitudeB < 0) throw new RangeError("amplitudes must be non-negative");
  const squared = amplitudeA ** 2 + amplitudeB ** 2 + 2 * amplitudeA * amplitudeB * Math.cos(phaseDifference);
  return Math.sqrt(Math.max(0, squared));
}

export function classifyInterference(amplitudeA: number, amplitudeB: number, phaseDifference: number): InterferenceKind {
  const maximum = amplitudeA + amplitudeB;
  if (maximum === 0) return "destructive";
  const ratio = resultantAmplitude(amplitudeA, amplitudeB, phaseDifference) / maximum;
  if (ratio >= 0.95) return "constructive";
  if (ratio <= 0.05) return "destructive";
  return "partial";
}

export function compareEqualWaveInterference(amplitude = 1): InterferenceComparison[] {
  finite(amplitude, "amplitude");
  if (amplitude <= 0) throw new RangeError("amplitude must be greater than zero");
  const maximumAmplitude = amplitude * 2;
  const cases: ReadonlyArray<readonly [InterferenceComparison["label"], number]> = [
    ["In phase", 0],
    ["Quarter cycle", Math.PI / 2],
    ["Opposite phase", Math.PI],
  ];
  return cases.map(([label, phaseDifference]) => {
    const result = resultantAmplitude(amplitude, amplitude, phaseDifference);
    return {
      label,
      phaseDifference,
      resultantAmplitude: result,
      maximumRatio: result / maximumAmplitude,
      kind: classifyInterference(amplitude, amplitude, phaseDifference),
    };
  });
}

export function equationFor(wave: WaveParameters): string {
  const { waveNumber, angularFrequency } = deriveWave(wave);
  const direction = wave.direction === 1 ? "−" : "+";
  const phase = wave.phase >= 0 ? `+ ${wave.phase.toFixed(2)}` : `− ${Math.abs(wave.phase).toFixed(2)}`;
  return `y(x,t) = ${wave.amplitude.toFixed(2)} sin(${waveNumber.toFixed(2)}x ${direction} ${angularFrequency.toFixed(2)}t ${phase})`;
}
