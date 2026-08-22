import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import {
  TAU,
  classifyInterference,
  deriveWave,
  displacementAt,
  equationFor,
  resultantAmplitude,
  shortestPhaseDifference,
  superpositionAt,
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
  waveAGlow: "#7f1d1d",
  waveB: "#67e8f9",
  waveBGlow: "#164e63",
  result: "#fbbf24",
  resultGlow: "#713f12",
  success: "#a3e635",
  button: "#09090b",
};

const MODE_LABELS: Record<LabMode, string> = {
  travelling: "TRAVELLING WAVE",
  interference: "INTERFERENCE",
};

const FRAME_INTERVAL_MS = 100;

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

  useEffect(() => {
    if (paused || tooSmall) return;
    let previousFrame = performance.now();
    const timer = setInterval(() => {
      const currentFrame = performance.now();
      const elapsedSeconds = (currentFrame - previousFrame) / 1_000;
      previousFrame = currentFrame;
      setTime(value => (value + elapsedSeconds * rate) % 10_000);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, rate, tooSmall]);

  const waveA = useMemo<WaveParameters>(() => ({ amplitude, wavelength, frequency, phase, direction: 1 }), [amplitude, frequency, phase, wavelength]);
  const waveB = useMemo<WaveParameters>(() => ({ amplitude, wavelength, frequency, phase: phaseB, direction: 1 }), [amplitude, frequency, phaseB, wavelength]);
  const derived = deriveWave(waveA);
  const phaseDelta = shortestPhaseDifference(phase, phaseB);
  const resultAmplitude = resultantAmplitude(amplitude, amplitude, phaseDelta);
  const interference = classifyInterference(amplitude, amplitude, phaseDelta);

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
        time={time}
        paused={paused}
      />
      <Box width={canvasWidth} height={rows - 1} paddingX={1} flexDirection="column">
        <CanvasHeader mode={mode} paused={paused} time={time} compact={compact}/>
        {screen === "lab" ? <>
          <Box height={plotHeight} flexDirection="column" justifyContent="center">
            {mode === "travelling"
              ? <TravellingView wave={waveA} time={time} width={plotWidth} height={plotHeight}/>
              : <InterferenceView waveA={waveA} waveB={waveB} time={time} resultAmplitude={resultAmplitude} kind={interference} width={plotWidth} height={plotHeight}/>}
          </Box>
          <Text color={palette.border}>{"·".repeat(plotWidth)}</Text>
          <Text color={palette.primary}>v <Text color={palette.success}>{derived.speed.toFixed(2)} m/s</Text>   k <Text color={palette.waveB}>{derived.waveNumber.toFixed(2)} rad/m</Text>   ω <Text color={palette.result}>{derived.angularFrequency.toFixed(2)} rad/s</Text></Text>
          <Text color={palette.muted}>{mode === "travelling" ? equationFor(waveA) : `Δφ = ${phaseDelta.toFixed(2)} rad  ·  Aresult = ${resultAmplitude.toFixed(2)}`}</Text>
          <CanvasShortcuts compact={compact}/>
        </> : <Theory compact={compact}/>}
      </Box>
    </Box>
  </FullScreen>;
}

function TravellingView({ wave, time, width, height }: { wave: WaveParameters; time: number; width: number; height: number }) {
  const traceHeight = Math.max(8, height - 1);
  const trace = renderTrace({ width, height: traceHeight, span: 20, amplitudeScale: Math.max(0.1, wave.amplitude), sample: x => displacementAt(x, time, wave) });
  return <>
    <WavePlot trace={trace} traceColor={palette.waveA}/>
    <Text color={palette.muted}>0m <Text color={palette.border}>{"·".repeat(Math.max(0, width - 10))}</Text> 20m →</Text>
  </>;
}

function InterferenceView({ waveA, waveB, time, resultAmplitude, kind, width, height }: { waveA: WaveParameters; waveB: WaveParameters; time: number; resultAmplitude: number; kind: string; width: number; height: number }) {
  const traceHeight = Math.max(3, Math.floor((height - 3) / 3));
  const resultHeight = Math.max(3, height - 3 - traceHeight * 2);
  const common = { width, span: 20 };
  const traceA = renderTrace({ ...common, height: traceHeight, amplitudeScale: waveA.amplitude, sample: x => displacementAt(x, time, waveA), glow: false });
  const traceB = renderTrace({ ...common, height: traceHeight, amplitudeScale: waveB.amplitude, sample: x => displacementAt(x, time, waveB), glow: false });
  const traceResult = renderTrace({ ...common, height: resultHeight, amplitudeScale: Math.max(0.1, waveA.amplitude + waveB.amplitude), sample: x => superpositionAt(x, time, [waveA, waveB]) });
  const color = kind === "constructive" ? palette.success : kind === "destructive" ? palette.waveA : palette.result;
  return <>
    <Text color={palette.waveA} bold>WAVE A</Text>
    <WavePlot trace={traceA} traceColor={palette.waveA}/>
    <Text color={palette.waveB} bold>WAVE B</Text>
    <WavePlot trace={traceB} traceColor={palette.waveB}/>
    <Text><Text color={palette.result} bold>RESULT</Text><Text color={palette.muted}>  A = {resultAmplitude.toFixed(2)}  </Text><Text color={color} bold>{kind.toUpperCase()}</Text></Text>
    <WavePlot trace={traceResult} traceColor={palette.result}/>
  </>;
}

function WavePlot({ trace, traceColor }: { trace: WaveCell[][]; traceColor: string }) {
  return <Text color={traceColor}>{traceToText(trace)}</Text>;
}

function ParameterRow({ active, label, value }: { active: boolean; label: string; value: string }) {
  return <Text color={active ? palette.waveA : palette.primary} backgroundColor={active ? palette.surface : undefined} bold={active}>{active ? ">" : " "} {label.padEnd(5)}{value.padStart(10)}</Text>;
}

function Sidebar({ width, mode, selected, amplitude, wavelength, frequency, phase, phaseB, rate, time, paused }: {
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
    <Text><Text color={palette.waveA} bold>λAMB</Text><Text color={palette.waveB} bold>Do</Text></Text>
    <Text color={palette.muted}>WAVE CONTROL</Text>
    <Gap/>
    <Text color={palette.muted}>MODE</Text>
    <Text color={mode === "travelling" ? palette.waveA : palette.primary} bold={mode === "travelling"}>1  travelling</Text>
    <Text color={mode === "interference" ? palette.waveB : palette.primary} bold={mode === "interference"}>2  interference</Text>
    <Gap/>
    <Text color={palette.muted}>PARAMETERS  <Text color={palette.border}>↑↓</Text></Text>
    <ParameterRow active={selected === "amplitude"} label="A" value={amplitude.toFixed(2)}/>
    <ParameterRow active={selected === "wavelength"} label="λ" value={`${wavelength.toFixed(2)} m`}/>
    <ParameterRow active={selected === "frequency"} label="f" value={`${frequency.toFixed(2)} Hz`}/>
    <ParameterRow active={selected === "phase"} label="φA" value={`${phase.toFixed(2)} rad`}/>
    {mode === "interference" && <ParameterRow active={selected === "phaseB"} label="φB" value={`${phaseB.toFixed(2)} rad`}/>}
    <ParameterRow active={selected === "rate"} label="time" value={`${rate.toFixed(2)}×`}/>
    <Box flexGrow={1}/>
    <Text color={palette.muted}>STATE</Text>
    <Text color={paused ? palette.result : palette.success} bold>{paused ? "Ⅱ PAUSED" : "▶ PROPAGATING"}</Text>
    <Text color={palette.primary}>t = <Text color={palette.result}>{time.toFixed(2)} s</Text></Text>
    <Text backgroundColor={palette.waveA} color={palette.button} bold> ←  →  CHANGE </Text>
  </Box>;
}

function CanvasHeader({ mode, paused, time, compact }: { mode: LabMode; paused: boolean; time: number; compact: boolean }) {
  return <Box flexDirection="column">
    <Box justifyContent="space-between">
      <Text color={mode === "travelling" ? palette.waveA : palette.waveB} bold>{MODE_LABELS[mode]}</Text>
      <Text color={paused ? palette.result : palette.success}>{paused ? "TIME FROZEN" : `LIVE  t=${time.toFixed(2)}s`}</Text>
    </Box>
    {!compact && <Text color={palette.muted}>CHARACTER WAVEFIELD  ·  0—20 METRES</Text>}
  </Box>;
}

function CanvasShortcuts({ compact }: { compact: boolean }) {
  return compact
    ? <Text color={palette.muted}><Text color={palette.waveA}>[←→]</Text> CHANGE  <Text color={palette.waveA}>[SPACE]</Text> PAUSE  <Text color={palette.waveA}>[M]</Text> MODE  <Text color={palette.waveA}>[Q]</Text> QUIT</Text>
    : <Text color={palette.muted}><Text color={palette.waveA}>[↑↓]</Text> SELECT  <Text color={palette.waveA}>[←→]</Text> CHANGE  <Text color={palette.waveA}>[SPACE]</Text> PAUSE  <Text color={palette.waveA}>[M]</Text> MODE  <Text color={palette.waveA}>[H]</Text> LEARN  <Text color={palette.waveA}>[R]</Text> RESET  <Text color={palette.waveA}>[Q]</Text> QUIT</Text>;
}

function Theory({ compact }: { compact: boolean }) {
  return <Box flexGrow={1} flexDirection="column" justifyContent="center" paddingX={2}>
    <Text color={palette.waveA} bold>LEARN · SEE THE WAVE, UNDERSTAND THE MATH</Text>
    {!compact && <Gap/>}
    <Text color={palette.waveA} bold>FUNDAMENTAL RELATION</Text>
    <Text color={palette.primary}>v = λf</Text>
    <Text color={palette.muted}>wave speed = wavelength × frequency</Text>
    <Gap/>
    <Text color={palette.waveB} bold>TRAVELLING WAVE</Text>
    <Text color={palette.primary}>y(x,t) = A sin(kx − ωt + φ)</Text>
    <Text color={palette.muted}>k = 2π/λ  ·  ω = 2πf  ·  T = 1/f</Text>
    <Gap/>
    <Text color={palette.result} bold>SUPERPOSITION</Text>
    <Text color={palette.primary}>ytotal(x,t) = yA(x,t) + yB(x,t)</Text>
    <Text color={palette.muted}>Δφ ≈ 0 → constructive  ·  Δφ ≈ π → destructive</Text>
    <Gap/>
    <Text color={palette.success}>Nothing in this display is pre-drawn: every frame comes from the equations above.</Text>
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
