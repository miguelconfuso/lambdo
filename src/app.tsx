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
import { renderTrace, type WaveCell } from "./rendering/wave.js";

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

  const parameters: Parameter[] = mode === "interference"
    ? ["amplitude", "wavelength", "frequency", "phase", "phaseB", "rate"]
    : ["amplitude", "wavelength", "frequency", "phase", "rate"];
  const selectedParameter = parameters[Math.min(selected, parameters.length - 1)]!;

  useEffect(() => {
    if (paused || tooSmall) return;
    const timer = setInterval(() => setTime(value => (value + 0.05 * rate) % 10_000), 50);
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
    <Header paused={paused} compact={compact}/>
    <Gap/>
    {screen === "lab" ? <Box gap={2}>
      <Panel title="WAVE CONTROL" width={24} height={compact ? 19 : 22}>
        <Text color={palette.muted}>MODE</Text>
        <Text color={mode === "travelling" ? palette.waveA : palette.primary} bold={mode === "travelling"}>1  travelling</Text>
        <Text color={mode === "interference" ? palette.waveB : palette.primary} bold={mode === "interference"}>2  interference</Text>
        <Gap/>
        <Text color={palette.muted}>PARAMETERS  <Text color={palette.border}>↑↓</Text></Text>
        <ParameterRow active={selectedParameter === "amplitude"} label="A" value={amplitude.toFixed(2)}/>
        <ParameterRow active={selectedParameter === "wavelength"} label="λ" value={`${wavelength.toFixed(2)} m`}/>
        <ParameterRow active={selectedParameter === "frequency"} label="f" value={`${frequency.toFixed(2)} Hz`}/>
        <ParameterRow active={selectedParameter === "phase"} label="φA" value={`${phase.toFixed(2)} rad`}/>
        {mode === "interference" && <ParameterRow active={selectedParameter === "phaseB"} label="φB" value={`${phaseB.toFixed(2)} rad`}/>} 
        <ParameterRow active={selectedParameter === "rate"} label="time" value={`${rate.toFixed(2)}×`}/>
        <Gap/>
        <Text color={palette.muted}>STATE</Text>
        <Text color={paused ? palette.result : palette.success} bold>{paused ? "Ⅱ PAUSED" : "▶ PROPAGATING"}</Text>
        <Text color={palette.primary}>t = <Text color={palette.result}>{time.toFixed(2)} s</Text></Text>
        <Text backgroundColor={palette.waveA} color={palette.button} bold> ← / →  CHANGE </Text>
      </Panel>
      <Panel title={`${MODE_LABELS[mode]}  /  20m`} width={54} height={compact ? 19 : 22}>
        {mode === "travelling"
          ? <TravellingView wave={waveA} time={time} compact={compact}/>
          : <InterferenceView waveA={waveA} waveB={waveB} time={time} resultAmplitude={resultAmplitude} kind={interference} compact={compact}/>} 
        <Text color={palette.border}>{"─".repeat(50)}</Text>
        <Text color={palette.primary}>v <Text color={palette.success}>{derived.speed.toFixed(2)} m/s</Text>   k <Text color={palette.waveB}>{derived.waveNumber.toFixed(2)} rad/m</Text>   ω <Text color={palette.result}>{derived.angularFrequency.toFixed(2)} rad/s</Text></Text>
        <Text color={palette.muted}>{mode === "travelling" ? equationFor(waveA) : `Δφ = ${phaseDelta.toFixed(2)} rad  ·  Aresult = ${resultAmplitude.toFixed(2)}`}</Text>
      </Panel>
    </Box> : <Theory compact={compact}/>}
    <Gap/>
    {compact
      ? <Text color={palette.muted}><Text color={palette.waveA}>[↑↓]</Text> SELECT  <Text color={palette.waveA}>[←→]</Text> CHANGE  <Text color={palette.waveA}>[SPACE]</Text> PAUSE  <Text color={palette.waveA}>[M]</Text> MODE  <Text color={palette.waveA}>[Q]</Text> QUIT</Text>
      : <Text color={palette.muted}><Text color={palette.waveA}>[↑↓]</Text> SELECT  <Text color={palette.waveA}>[←→]</Text> CHANGE  <Text color={palette.waveA}>[SPACE]</Text> PAUSE  <Text color={palette.waveA}>[M]</Text> MODE  <Text color={palette.waveA}>[H]</Text> LEARN  <Text color={palette.waveA}>[R]</Text> RESET  <Text color={palette.waveA}>[Q]</Text> QUIT</Text>}
  </FullScreen>;
}

function TravellingView({ wave, time, compact }: { wave: WaveParameters; time: number; compact: boolean }) {
  const trace = renderTrace({ width: 50, height: compact ? 10 : 13, span: 20, amplitudeScale: Math.max(0.1, wave.amplitude), sample: x => displacementAt(x, time, wave) });
  return <>
    <Text color={palette.muted}>AMPLITUDE</Text>
    <WavePlot trace={trace} traceColor={palette.waveA} glowColor={palette.waveAGlow}/>
    <Text color={palette.muted}>0m <Text color={palette.border}>{"·".repeat(39)}</Text> 20m →</Text>
  </>;
}

function InterferenceView({ waveA, waveB, time, resultAmplitude, kind, compact }: { waveA: WaveParameters; waveB: WaveParameters; time: number; resultAmplitude: number; kind: string; compact: boolean }) {
  const common = { width: 50, span: 20 };
  const traceA = renderTrace({ ...common, height: compact ? 3 : 4, amplitudeScale: waveA.amplitude, sample: x => displacementAt(x, time, waveA), glow: false });
  const traceB = renderTrace({ ...common, height: compact ? 3 : 4, amplitudeScale: waveB.amplitude, sample: x => displacementAt(x, time, waveB), glow: false });
  const traceResult = renderTrace({ ...common, height: compact ? 4 : 5, amplitudeScale: Math.max(0.1, waveA.amplitude + waveB.amplitude), sample: x => superpositionAt(x, time, [waveA, waveB]) });
  const color = kind === "constructive" ? palette.success : kind === "destructive" ? palette.waveA : palette.result;
  return <>
    <Text color={palette.waveA} bold>WAVE A</Text>
    <WavePlot trace={traceA} traceColor={palette.waveA} glowColor={palette.waveAGlow}/>
    <Text color={palette.waveB} bold>WAVE B</Text>
    <WavePlot trace={traceB} traceColor={palette.waveB} glowColor={palette.waveBGlow}/>
    <Text><Text color={palette.result} bold>RESULT</Text><Text color={palette.muted}>  A = {resultAmplitude.toFixed(2)}  </Text><Text color={color} bold>{kind.toUpperCase()}</Text></Text>
    <WavePlot trace={traceResult} traceColor={palette.result} glowColor={palette.resultGlow}/>
  </>;
}

function WavePlot({ trace, traceColor, glowColor }: { trace: WaveCell[][]; traceColor: string; glowColor: string }) {
  return <Box flexDirection="column">{trace.map((row, rowIndex) => <Text key={rowIndex}>{row.map((cell, columnIndex) => {
    const color = cell.kind === "trace" ? traceColor : cell.kind === "glow" ? glowColor : cell.kind === "axis" ? palette.border : palette.primary;
    return <Text key={columnIndex} color={color} bold={cell.kind === "trace"}>{cell.glyph}</Text>;
  })}</Text>)}</Box>;
}

function ParameterRow({ active, label, value }: { active: boolean; label: string; value: string }) {
  return <Text color={active ? palette.waveA : palette.primary} backgroundColor={active ? palette.surface : undefined} bold={active}>{active ? ">" : " "} {label.padEnd(5)}{value.padStart(10)}</Text>;
}

function Theory({ compact }: { compact: boolean }) {
  return <Panel title="LEARN · SEE THE WAVE, UNDERSTAND THE MATH" width={80} height={compact ? 19 : 22}>
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
  </Panel>;
}

function Header({ paused, compact }: { paused: boolean; compact: boolean }) {
  return <Box flexDirection="column" alignItems="center">
    <Text><Text color={palette.waveA} bold>λAMB</Text><Text color={palette.waveB} bold>Do</Text><Text color={palette.muted}>  ·  interactive wave laboratory</Text></Text>
    {!compact && <Text color={palette.muted}>TRAVEL / INTERFERE / UNDERSTAND  ·  <Text color={paused ? palette.result : palette.success}>{paused ? "TIME FROZEN" : "LIVE EQUATIONS"}</Text></Text>}
  </Box>;
}

function FullScreen({ children }: { children: ReactNode }) {
  const { stdout } = useStdout();
  return <Box width={stdout?.columns || 80} height={Math.max(23, (stdout?.rows || 30) - 1)} flexDirection="column" alignItems="center" justifyContent="center">{children}</Box>;
}

function Panel({ title, width, height, children }: { title: string; width: number; height: number; children: ReactNode }) {
  const tail = Math.max(0, width - title.length - 6);
  return <Box flexDirection="column" width={width} height={height}>
    <Text><Text color={palette.border}>╭─ </Text><Text color={palette.waveA} bold>{title}</Text><Text color={palette.border}> {"─".repeat(tail)}╮</Text></Text>
    <Box width={width} height={height - 1} borderStyle="round" borderTop={false} borderColor={palette.border} paddingX={1} flexDirection="column">{children}</Box>
  </Box>;
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
