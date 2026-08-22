import packageJson from "../package.json" with { type: "json" };
import { deriveWave, displacementAt, superpositionAt, type WaveParameters } from "./physics/wave.js";
import { renderTrace, traceToText } from "./rendering/wave.js";
import { LAMBDO_ASCII, runTerminal, type LabMode } from "./terminal.js";

const args = process.argv.slice(2);
const VERSION = packageJson.version;

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${LAMBDO_ASCII}

  lambdo — see the wave, understand the math

  Usage
    $ lambdo
    $ lambdo --mode interference
    $ lambdo --snapshot --wavelength 8 --frequency 2

  Options
    --mode <travelling|interference>  initial laboratory mode
    --amplitude <number>              initial amplitude (default: 1)
    --wavelength <number>             wavelength in metres (default: 8)
    --frequency <number>              frequency in hertz (default: 1)
    --snapshot                        print one frame without opening the TUI
    -h, --help                        show help
    -v, --version                     show version

  Inside the lab, press H for formulas and the keyboard map.
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}

const option = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const numberOption = (name: string, fallback: number): number => {
  const raw = option(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} expects a number greater than zero`);
  return value;
};

try {
  const mode = (option("--mode") ?? "travelling") as LabMode;
  if (mode !== "travelling" && mode !== "interference") throw new Error("--mode expects travelling or interference");
  const amplitude = numberOption("--amplitude", 1);
  const wavelength = numberOption("--wavelength", 8);
  const frequency = numberOption("--frequency", 1);

  if (args.includes("--snapshot") || !process.stdout.isTTY) {
    printSnapshot(mode, amplitude, wavelength, frequency);
    process.exit(0);
  }

  await runTerminal({
    initialMode: mode,
    initialAmplitude: amplitude,
    initialWavelength: wavelength,
    initialFrequency: frequency,
  });
  process.exit(0);
} catch (error) {
  console.error(`lambdo: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function printSnapshot(mode: LabMode, amplitude: number, wavelength: number, frequency: number): void {
  const waveA: WaveParameters = { amplitude, wavelength, frequency, phase: 0, direction: 1 };
  const waveB: WaveParameters = { ...waveA, phase: Math.PI };
  const sample = mode === "travelling"
    ? (x: number) => displacementAt(x, 0, waveA)
    : (x: number) => superpositionAt(x, 0, [waveA, waveB]);
  const scale = mode === "travelling" ? amplitude : amplitude * 2;
  const trace = renderTrace({ width: 60, height: 13, span: 20, amplitudeScale: scale, sample });
  const derived = deriveWave(waveA);
  console.log(`\n${LAMBDO_ASCII}\n\n${mode.toUpperCase()} · t = 0.00s\n`);
  console.log(traceToText(trace));
  console.log(`\nA ${amplitude.toFixed(2)}  λ ${wavelength.toFixed(2)}m  f ${frequency.toFixed(2)}Hz  v ${derived.speed.toFixed(2)}m/s`);
  console.log(`k ${derived.waveNumber.toFixed(2)}rad/m  ω ${derived.angularFrequency.toFixed(2)}rad/s  T ${derived.period.toFixed(2)}s\n`);
}
