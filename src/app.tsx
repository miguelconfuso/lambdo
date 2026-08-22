import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import {
  TAU,
  classifyInterference,
  deriveWave,
  equationFor,
  resultantAmplitude,
  shortestPhaseDifference,
  type InterferenceKind,
  type WaveParameters,
} from "./physics/wave.js";
import { renderTrace, traceToText, type WaveCell } from "./rendering/wave.js";

export type LabMode = "travelling" | "interference";
type Screen = "lab" | "learn";
type Parameter = "amplitude" | "wavelength" | "frequency" | "phase" | "phaseB" | "rate";

const palette = {
  primary: "#f4f4f5",
  muted: "#71717a",
  border: "#3f3f46",
  surface: "#18181b",
  waveA: "#fb7185",
  waveB: "#67e8f9",
  result: "#fbbf24",
  success: "#a3e635",
  button: "#09090b",
};

const MODE_LABELS: Record<LabMode, string> = {
  travelling: "TRAVELLING WAVE",
  interference: "INTERFERENCE",
};

const MIN_ANIMATION_FPS = 4;
const MAX_ANIMATION_FPS = 10;
const MAX_OUTPUT_BUFFER_BYTES = 32 * 1_024;

interface InterferencePresentation {
  category: "CONSTRUCTIVE" | "DESTRUCTIVE" | "PARTIAL";
  label: "CONSTRUCTIVE" | "DESTRUCTIVE" | "PARTIAL" | "CANCELLED";
  relation: "IN PHASE" | "NEARLY IN PHASE" | "PARTLY IN PHASE" | "QUARTER CYCLE" | "PARTLY OUT OF PHASE" | "OUT OF PHASE";
  color: string;
  ratio: number;
}
export const LAMBDO_ASCII = [
  "       √≠π",
  "      ÷=≠+=",
  "      ∞   ×∞",
  "          π-",
  "          ≠+π",
  "         √++÷",
  "        √++π×",
  "        ++π ≈=",
  "       ++∞   -    π",
  "      -+≠    ∞+≠∞×",
  "     ∞≈∞       ≠=",
].join("\n");

export interface AppProps {
  initialMode?: LabMode;
  initialAmplitude?: number;
  initialWavelength?: number;
  initialFrequency?: number;
}

export function App({
  initialMode = "travelling",
  initialAmplitude = 1,
  initialWavelength = 8,
  initialFrequency = 1,
}: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [mode, setMode] = useState<LabMode>(initialMode);
  const [screen, setScreen] = useState<Screen>("lab");
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [amplitude, setAmplitude] = useState(initialAmplitude);
  const [wavelength, setWavelength] = useState(initialWavelength);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [phase, setPhase] = useState(0);
  const [phaseB, setPhaseB] = useState(Math.PI);
  const [rate, setRate] = useState(1);
  const [selected, setSelected] = useState(0);
  const columns = stdout?.columns ?? 80;
  const rows = stdout?.rows ?? 30;
  const compact = rows < 28;
  const tooSmall = columns < 80 || rows < 24;
  const sidebarWidth = 25;
  const canvasWidth = columns - sidebarWidth;
  const plotWidth = Math.max(44, canvasWidth - 4);
  const plotHeight = Math.max(12, rows - (compact ? 9 : 10));

  const parameters: Parameter[] = mode === "interference"
    ? ["amplitude", "wavelength", "frequency", "phase", "phaseB", "rate"]
    : ["amplitude", "wavelength", "frequency", "phase", "rate"];
  const selectedParameter = parameters[Math.min(selected, parameters.length - 1)]!;
  const animationFps = clamp(Math.ceil(4 + frequency * rate * 6), MIN_ANIMATION_FPS, MAX_ANIMATION_FPS);
  const frameInterval = 1_000 / animationFps;

  useEffect(() => {
    if (paused || screen === "learn" || tooSmall) return;
    let previousFrame = performance.now();
    const timer = setInterval(() => {
      const currentFrame = performance.now();
      if (stdout && (stdout.writableNeedDrain || stdout.writableLength > MAX_OUTPUT_BUFFER_BYTES)) {
        previousFrame = currentFrame;
        return;
      }
      const elapsedSeconds = (currentFrame - previousFrame) / 1_000;
      previousFrame = currentFrame;
      setTime(value => (value + elapsedSeconds * rate) % 10_000);
    }, frameInterval);
    return () => clearInterval(timer);
  }, [frameInterval, paused, rate, screen, stdout, tooSmall]);

  const waveA = useMemo<WaveParameters>(() => ({ amplitude, wavelength, frequency, phase, direction: 1 }), [amplitude, frequency, phase, wavelength]);
  const waveB = useMemo<WaveParameters>(() => ({ amplitude, wavelength, frequency, phase: phaseB, direction: 1 }), [amplitude, frequency, phaseB, wavelength]);
  const derived = deriveWave(waveA);
  const phaseDelta = shortestPhaseDifference(phase, phaseB);
  const resultAmplitude = resultantAmplitude(amplitude, amplitude, phaseDelta);
  const interference = classifyInterference(amplitude, amplitude, phaseDelta);
  const presentation = describeInterference(interference, phaseDelta, resultAmplitude, amplitude * 2);
  const displayTime = Math.floor(time * 4) / 4;
  const simulationPaused = paused || screen === "learn";

  const reset = () => {
    setAmplitude(1);
    setWavelength(8);
    setFrequency(1);
    setPhase(0);
    setPhaseB(Math.PI);
    setRate(1);
    setTime(0);
    setPaused(false);
  };

  const adjust = (direction: -1 | 1) => {
    if (selectedParameter === "amplitude") setAmplitude(value => clamp(round(value + direction * 0.1), 0.1, 3));
    if (selectedParameter === "wavelength") setWavelength(value => clamp(round(value + direction * 0.5), 2, 20));
    if (selectedParameter === "frequency") setFrequency(value => clamp(round(value + direction * 0.1), 0.1, 5));
    if (selectedParameter === "phase") setPhase(value => wrapPhase(value + direction * Math.PI / 8));
    if (selectedParameter === "phaseB") setPhaseB(value => wrapPhase(value + direction * Math.PI / 8));
    if (selectedParameter === "rate") setRate(value => clamp(round(value + direction * 0.25), 0.25, 3));
  };

  useInput((input, key) => {
    if ((key.ctrl && input === "c") || input === "q") { exit(); return; }
    if (screen === "learn") {
      if (key.escape || input === "h") setScreen("lab");
      return;
    }
    if (key.upArrow || input === "w") setSelected(value => (value - 1 + parameters.length) % parameters.length);
    else if (key.downArrow || input === "s") setSelected(value => (value + 1) % parameters.length);
    else if (key.leftArrow || input === "a" || input === "-") adjust(-1);
    else if (key.rightArrow || input === "d" || input === "+" || input === "=") adjust(1);
    else if (input === " ") setPaused(value => !value);
    else if (input === "m" || key.tab) { setMode(value => value === "travelling" ? "interference" : "travelling"); setSelected(0); }
    else if (input === "1") { setMode("travelling"); setSelected(0); }
    else if (input === "2") { setMode("interference"); setSelected(0); }
    else if (input === "p" && mode === "interference") setPhaseB(value => shortestPhaseDifference(value, 0) < 0.1 ? Math.PI : 0);
    else if (input === "r") reset();
    else if (input === "h" || input === "?") setScreen("learn");
  });

  if (tooSmall) {
    return <FullScreen>
      <Text color={palette.waveA} bold>LAMBDO NEEDS MORE ROOM</Text>
      <Text color={palette.muted}>minimum 80×24  ·  current {columns}×{rows}</Text>
      <Text color={palette.primary}>Resize the terminal to reveal the wave laboratory.</Text>
      <Gap/>
      <Text color={palette.muted}>[Q] QUIT</Text>
    </FullScreen>;
  }

  return <FullScreen>
    <Box width={columns} height={rows - 1}>
      <Sidebar
        width={sidebarWidth}
        mode={mode}
        selected={selectedParameter}
        amplitude={amplitude}
        wavelength={wavelength}
        frequency={frequency}
        phase={phase}
        phaseB={phaseB}
        rate={rate}
        time={displayTime}
        paused={simulationPaused}
      />
      <Box width={canvasWidth} height={rows - 1} paddingX={1} flexDirection="column">
        <CanvasHeader mode={mode} paused={simulationPaused} time={displayTime} compact={compact}/>
        {screen === "lab" ? <>
          <Box height={plotHeight} flexDirection="column" justifyContent="center">
            {mode === "travelling"
              ? <TravellingView wave={waveA} time={time} width={plotWidth} height={plotHeight}/>
              : <InterferenceView waveA={waveA} waveB={waveB} time={time} resultAmplitude={resultAmplitude} presentation={presentation} width={plotWidth} height={plotHeight}/>}
          </Box>
          <Text color={palette.border}>{"·".repeat(plotWidth)}</Text>
          {mode === "travelling" ? <>
            <Text color={palette.primary}>v <Text color={palette.success}>{derived.speed.toFixed(2)} m/s</Text>   k <Text color={palette.waveB}>{derived.waveNumber.toFixed(2)} rad/m</Text>   ω <Text color={palette.result}>{derived.angularFrequency.toFixed(2)} rad/s</Text></Text>
            <Text color={palette.muted}>{equationFor(waveA)}</Text>
          </> : <>
            <Text color={presentation.color} bold>INTERFERENCE: {presentation.category}  ·  {presentation.relation}</Text>
            <Text color={palette.primary}>φA <Text color={palette.waveA}>{phaseTrack(phase)}</Text>  φB <Text color={palette.waveB}>{phaseTrack(phaseB)}</Text>  Δφ <Text color={palette.result}>{phaseDelta.toFixed(2)}</Text></Text>
            <Text color={palette.muted}>y(x,t) = y₁(x,t) + y₂(x,t)</Text>
          </>}
          <CanvasShortcuts compact={compact}/>
        </> : <Theory compact={compact} mode={mode} waveA={waveA} waveB={waveB} phaseDelta={phaseDelta} resultAmplitude={resultAmplitude} presentation={presentation}/>}
      </Box>
    </Box>
  </FullScreen>;
}

function TravellingView({ wave, time, width, height }: { wave: WaveParameters; time: number; width: number; height: number }) {
  const traceHeight = Math.max(8, height - 1);
  const sample = waveSampleAtTime(wave, time);
  const trace = renderTrace({ width, height: traceHeight, span: 20, amplitudeScale: Math.max(0.1, wave.amplitude), sample });
  return <>
    <WavePlot trace={trace} traceColor={palette.waveA}/>
    <Text color={palette.muted}>0m <Text color={palette.border}>{"·".repeat(Math.max(0, width - 10))}</Text> 20m →</Text>
  </>;
}

function InterferenceView({ waveA, waveB, time, resultAmplitude, presentation, width, height }: { waveA: WaveParameters; waveB: WaveParameters; time: number; resultAmplitude: number; presentation: InterferencePresentation; width: number; height: number }) {
  const traceHeight = Math.max(3, Math.floor((height - 3) / 3));
  const resultHeight = Math.max(3, height - 3 - traceHeight * 2);
  const common = { width, span: 20 };
  const sampleA = waveSampleAtTime(waveA, time);
  const sampleB = waveSampleAtTime(waveB, time);
  const traceA = renderTrace({ ...common, height: traceHeight, amplitudeScale: waveA.amplitude, sample: sampleA, glow: false });
  const traceB = renderTrace({ ...common, height: traceHeight, amplitudeScale: waveB.amplitude, sample: sampleB, glow: false });
  const traceResult = renderTrace({ ...common, height: resultHeight, amplitudeScale: Math.max(0.1, waveA.amplitude + waveB.amplitude), sample: x => sampleA(x) + sampleB(x) });
  return <>
    <Text color={palette.waveA} bold>{namedEquationFor(waveA, "y₁")}</Text>
    <WavePlot trace={traceA} traceColor={palette.waveA}/>
    <Text color={palette.waveB} bold>{namedEquationFor(waveB, "y₂")}</Text>
    <WavePlot trace={traceB} traceColor={palette.waveB}/>
    <Text><Text color={palette.result} bold>RESULT</Text><Text color={palette.muted}> A={resultAmplitude.toFixed(2)} </Text><Text color={presentation.color} bold>{intensityBar(presentation.ratio)}  {presentation.label}</Text></Text>
    <WavePlot trace={traceResult} traceColor={palette.result}/>
  </>;
}

function WavePlot({ trace, traceColor }: { trace: WaveCell[][]; traceColor: string }) {
  return <Text color={traceColor} bold>{traceToText(trace)}</Text>;
}

function ParameterRow({ active, label, value }: { active: boolean; label: string; value: string }) {
  return <Text color={active ? palette.waveA : palette.primary} backgroundColor={active ? palette.surface : undefined} bold={active}>{active ? ">" : " "} {label.padEnd(5)}{value.padStart(10)}</Text>;
}

const Sidebar = memo(function Sidebar({ width, mode, selected, amplitude, wavelength, frequency, phase, phaseB, rate, time, paused }: {
  width: number;
  mode: LabMode;
  selected: Parameter;
  amplitude: number;
  wavelength: number;
  frequency: number;
  phase: number;
  phaseB: number;
  rate: number;
  time: number;
  paused: boolean;
}) {
  return <Box width={width} height="100%" borderStyle="single" borderColor={palette.border} paddingX={1} flexDirection="column">
    <Text color={palette.waveA} bold>{LAMBDO_ASCII}</Text>
    <Text color={palette.muted}>MODE  <Text color={mode === "travelling" ? palette.waveA : palette.primary} bold={mode === "travelling"}>1 WAVE</Text>  <Text color={mode === "interference" ? palette.waveB : palette.primary} bold={mode === "interference"}>2 MIX</Text></Text>
    <Text color={palette.muted}>PARAMETERS  <Text color={palette.border}>↑↓</Text></Text>
    <ParameterRow active={selected === "amplitude"} label="A" value={amplitude.toFixed(2)}/>
    <ParameterRow active={selected === "wavelength"} label="λ" value={`${wavelength.toFixed(2)} m`}/>
    <ParameterRow active={selected === "frequency"} label="f" value={`${frequency.toFixed(2)} Hz`}/>
    <ParameterRow active={selected === "phase"} label="φA" value={`${phase.toFixed(2)} rad`}/>
    {mode === "interference" && <ParameterRow active={selected === "phaseB"} label="φB" value={`${phaseB.toFixed(2)} rad`}/>}
    <ParameterRow active={selected === "rate"} label="time" value={`${rate.toFixed(2)}×`}/>
    <Box flexGrow={1}/>
    <Text color={paused ? palette.result : palette.success} bold>{paused ? "Ⅱ PAUSED" : "▶ LIVE"}  <Text color={palette.primary}>t <Text color={palette.result}>{time.toFixed(2)}s</Text></Text></Text>
    <Text backgroundColor={palette.waveA} color={palette.button} bold> ←  →  CHANGE </Text>
  </Box>;
});

const CanvasHeader = memo(function CanvasHeader({ mode, paused, time, compact }: { mode: LabMode; paused: boolean; time: number; compact: boolean }) {
  return <Box flexDirection="column">
    <Box justifyContent="space-between">
      <Text color={mode === "travelling" ? palette.waveA : palette.waveB} bold>{MODE_LABELS[mode]}</Text>
      <Text color={paused ? palette.result : palette.success}>{paused ? "TIME FROZEN" : `LIVE  t=${time.toFixed(2)}s`}</Text>
    </Box>
    {!compact && <Text color={palette.muted}>CHARACTER WAVEFIELD  ·  0—20 METRES</Text>}
  </Box>;
});

function CanvasShortcuts({ compact }: { compact: boolean }) {
  return compact
    ? <Text color={palette.muted}><Text color={palette.waveA}>[←→]</Text> EDIT  <Text color={palette.waveA}>[SPC]</Text> PAUSE  <Text color={palette.waveA}>[M]</Text> MODE  <Text color={palette.waveA}>[H]</Text> LEARN  <Text color={palette.waveA}>[Q]</Text> QUIT</Text>
    : <Text color={palette.muted}><Text color={palette.waveA}>[↑↓]</Text> SELECT  <Text color={palette.waveA}>[←→]</Text> CHANGE  <Text color={palette.waveA}>[SPACE]</Text> PAUSE  <Text color={palette.waveA}>[M]</Text> MODE  <Text color={palette.waveA}>[H]</Text> LEARN  <Text color={palette.waveA}>[R]</Text> RESET  <Text color={palette.waveA}>[Q]</Text> QUIT</Text>;
}

function Theory({ compact, mode, waveA, waveB, phaseDelta, resultAmplitude, presentation }: {
  compact: boolean;
  mode: LabMode;
  waveA: WaveParameters;
  waveB: WaveParameters;
  phaseDelta: number;
  resultAmplitude: number;
  presentation: InterferencePresentation;
}) {
  if (mode === "interference") {
    const [explanationA, explanationB] = contextualExplanation(presentation.label);
    return <Box flexGrow={1} flexDirection="column" justifyContent="center" paddingX={1}>
      <Text color={palette.waveB} bold>LEARN · INTERFERENCE</Text>
      {!compact && <Gap/>}
      <Text color={presentation.color} bold>{presentationHeading(presentation)}</Text>
      <Text color={palette.primary}>{explanationA}</Text>
      <Text color={palette.muted}>{explanationB}</Text>
      <Gap/>
      <Text color={palette.result} bold>LIVE EQUATIONS</Text>
      <Text color={palette.waveA}>{namedEquationFor(waveA, "y₁")}</Text>
      <Text color={palette.waveB}>{namedEquationFor(waveB, "y₂")}</Text>
      <Text color={palette.primary}>y(x,t) = y₁(x,t) + y₂(x,t)</Text>
      <Gap/>
      <Text color={palette.result} bold>PHASE MAP</Text>
      <Text color={palette.primary}>φA <Text color={palette.waveA}>{phaseTrack(waveA.phase)}</Text>  φB <Text color={palette.waveB}>{phaseTrack(waveB.phase)}</Text></Text>
      <Text color={palette.muted}>Δφ = <Text color={palette.result}>{phaseDelta.toFixed(2)} rad</Text>  ·  Aresult = <Text color={presentation.color}>{resultAmplitude.toFixed(2)}</Text></Text>
      <Text color={presentation.color}>{intensityBar(presentation.ratio, 18)}  {Math.round(presentation.ratio * 100)}% of maximum</Text>
      <Gap/>
      <Text color={palette.muted}>[H / ESC] RETURN TO LAB</Text>
    </Box>;
  }

  const derived = deriveWave(waveA);
  return <Box flexGrow={1} flexDirection="column" justifyContent="center" paddingX={2}>
    <Text color={palette.waveA} bold>LEARN · TRAVELLING WAVE</Text>
    {!compact && <Gap/>}
    <Text color={palette.primary}>The profile moves through space without changing shape.</Text>
    <Text color={palette.muted}>Frequency controls oscillation rate; λ controls spacing.</Text>
    <Gap/>
    <Text color={palette.waveA} bold>FUNDAMENTAL RELATION</Text>
    <Text color={palette.primary}>v = λf = {waveA.wavelength.toFixed(2)} × {waveA.frequency.toFixed(2)} = <Text color={palette.success}>{derived.speed.toFixed(2)} m/s</Text></Text>
    <Text color={palette.muted}>T = {derived.period.toFixed(2)} s  ·  k = {derived.waveNumber.toFixed(2)} rad/m  ·  ω = {derived.angularFrequency.toFixed(2)} rad/s</Text>
    <Gap/>
    <Text color={palette.waveB} bold>LIVE EQUATION</Text>
    <Text color={palette.primary}>{namedEquationFor(waveA, "y")}</Text>
    <Text color={palette.muted}>Every displayed point is calculated from this equation.</Text>
    <Gap/>
    <Text color={palette.muted}>[H / ESC] RETURN TO LAB</Text>
  </Box>;
}

function FullScreen({ children }: { children: ReactNode }) {
  const { stdout } = useStdout();
  return <Box width={stdout?.columns || 80} height={Math.max(23, (stdout?.rows || 30) - 1)}>{children}</Box>;
}

function Gap({ lines = 1 }: { lines?: number }) {
  return <Box flexDirection="column" flexShrink={0}>{Array.from({ length: lines }, (_, index) => <Text key={index}> </Text>)}</Box>;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function wrapPhase(value: number): number {
  return Math.round((((value % TAU) + TAU) % TAU) * 100) / 100;
}

function waveSampleAtTime(wave: WaveParameters, time: number): (position: number) => number {
  const { waveNumber, angularFrequency } = deriveWave(wave);
  const phaseOffset = -wave.direction * angularFrequency * time + wave.phase;
  return position => wave.amplitude * Math.sin(waveNumber * position + phaseOffset);
}

function describeInterference(kind: InterferenceKind, phaseDelta: number, resultAmplitude: number, maximumAmplitude: number): InterferencePresentation {
  const ratio = maximumAmplitude > 0 ? clamp(resultAmplitude / maximumAmplitude, 0, 1) : 0;
  if (kind === "constructive") {
    return {
      category: "CONSTRUCTIVE",
      label: "CONSTRUCTIVE",
      relation: phaseDelta < 0.08 ? "IN PHASE" : "NEARLY IN PHASE",
      color: palette.success,
      ratio,
    };
  }
  if (kind === "destructive") {
    return {
      category: "DESTRUCTIVE",
      label: ratio < 0.01 ? "CANCELLED" : "DESTRUCTIVE",
      relation: "OUT OF PHASE",
      color: palette.waveA,
      ratio,
    };
  }
  return {
    category: "PARTIAL",
    label: "PARTIAL",
    relation: Math.abs(phaseDelta - Math.PI / 2) < 0.12
      ? "QUARTER CYCLE"
      : phaseDelta < Math.PI / 2 ? "PARTLY IN PHASE" : "PARTLY OUT OF PHASE",
    color: palette.result,
    ratio,
  };
}

function namedEquationFor(wave: WaveParameters, name: "y" | "y₁" | "y₂"): string {
  return equationFor(wave).replace("y(x,t)", `${name}(x,t)`);
}

function intensityBar(ratio: number, width = 10): string {
  const filled = Math.round(clamp(ratio, 0, 1) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function phaseTrack(phase: number, width = 9): string {
  const normalized = ((phase % TAU) + TAU) % TAU;
  const marker = Math.round((normalized / TAU) * (width - 1));
  return Array.from({ length: width }, (_, index) => index === marker ? "●" : "─").join("");
}

function contextualExplanation(label: InterferencePresentation["label"]): [string, string] {
  if (label === "CONSTRUCTIVE") {
    return [
      "Crests meet crests and troughs meet troughs.",
      "The amplitudes reinforce toward their maximum.",
    ];
  }
  if (label === "CANCELLED") {
    return [
      "Equal waves are exactly opposite: crest meets trough.",
      "Their displacements cancel completely at every point.",
    ];
  }
  if (label === "DESTRUCTIVE") {
    return [
      "The waves are close to opposite phase.",
      "Most of their displacement is cancelled.",
    ];
  }
  return [
    "The waves are neither aligned nor fully opposite.",
    "The result lies between reinforcement and cancellation.",
  ];
}

function presentationHeading(presentation: InterferencePresentation): string {
  return presentation.label === presentation.category
    ? `${presentation.category} INTERFERENCE`
    : `${presentation.label} · ${presentation.category} INTERFERENCE`;
}
