import readline from "node:readline";
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
import { renderTrace, type WaveCell } from "./rendering/wave.js";

export type LabMode = "travelling" | "interference";
type Screen = "lab" | "learn";
type Parameter = "amplitude" | "wavelength" | "frequency" | "phase" | "phaseB" | "rate";
type StyleName = "default" | "primary" | "muted" | "border" | "waveA" | "waveB" | "result" | "success" | "button";

interface Cell {
  char: string;
  style: StyleName;
}

interface TerminalState {
  mode: LabMode;
  screen: Screen;
  paused: boolean;
  time: number;
  amplitude: number;
  wavelength: number;
  frequency: number;
  phase: number;
  phaseB: number;
  rate: number;
  selected: number;
}

interface InterferencePresentation {
  category: "CONSTRUCTIVE" | "DESTRUCTIVE" | "PARTIAL";
  label: "CONSTRUCTIVE" | "DESTRUCTIVE" | "PARTIAL" | "CANCELLED";
  relation: "IN PHASE" | "NEARLY IN PHASE" | "PARTLY IN PHASE" | "QUARTER CYCLE" | "PARTLY OUT OF PHASE" | "OUT OF PHASE";
  style: StyleName;
  ratio: number;
}

export interface TerminalOptions {
  initialMode?: LabMode;
  initialAmplitude?: number;
  initialWavelength?: number;
  initialFrequency?: number;
}

const SIDEBAR_WIDTH = 25;
const MIN_COLUMNS = 80;
const MIN_ROWS = 24;
const MIN_ANIMATION_FPS = 4;
const MAX_ANIMATION_FPS = 6;
const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const RESET = "\x1b[0m";

const STYLE: Record<StyleName, string> = {
  default: RESET,
  primary: "\x1b[97m",
  muted: "\x1b[90m",
  border: "\x1b[90m",
  waveA: "\x1b[1;91m",
  waveB: "\x1b[1;96m",
  result: "\x1b[1;93m",
  success: "\x1b[1;92m",
  button: "\x1b[1;30;101m",
};

export const LAMBDO_ART = [
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
] as const;

export const LAMBDO_ASCII = LAMBDO_ART.join("\n");

export async function runTerminal({
  initialMode = "travelling",
  initialAmplitude = 1,
  initialWavelength = 8,
  initialFrequency = 1,
}: TerminalOptions = {}): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  const state: TerminalState = {
    mode: initialMode,
    screen: "lab",
    paused: false,
    time: 0,
    amplitude: initialAmplitude,
    wavelength: initialWavelength,
    frequency: initialFrequency,
    phase: 0,
    phaseB: Math.PI,
    rate: 1,
    selected: 0,
  };

  let previousGrid: Cell[][] = [];
  let outputBlocked = false;
  let pendingFrame = false;
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  let resolveExit: (() => void) | undefined;
  const wasRaw = stdin.isRaw;

  const frame = (force = false): void => {
    if (closed) return;
    if (outputBlocked) {
      pendingFrame = true;
      return;
    }

    const nextGrid = buildFrame(state, stdout.columns ?? MIN_COLUMNS, stdout.rows ?? MIN_ROWS);
    const chunks: string[] = [];
    const dimensionsChanged = previousGrid.length !== nextGrid.length || previousGrid[0]?.length !== nextGrid[0]?.length;
    if (force || dimensionsChanged) {
      chunks.push("\x1b[2J");
      for (let row = 0; row < nextGrid.length; row += 1) {
        const lastVisible = lastVisibleColumn(nextGrid[row]!);
        if (lastVisible >= 0) chunks.push(`\x1b[${row + 1};1H${serializeRange(nextGrid[row]!, 0, lastVisible)}${RESET}\x1b[K`);
      }
    } else {
      for (let row = 0; row < nextGrid.length; row += 1) {
        const range = changedRange(previousGrid[row]!, nextGrid[row]!);
        if (range) {
          chunks.push(`\x1b[${row + 1};${range.first + 1}H${serializeRange(nextGrid[row]!, range.first, range.last)}${RESET}`);
        }
      }
    }
    previousGrid = nextGrid;
    if (chunks.length === 0) return;

    const accepted = stdout.write(chunks.join(""));
    if (!accepted) {
      outputBlocked = true;
      stdout.once("drain", () => {
        outputBlocked = false;
        if (pendingFrame && !closed) {
          pendingFrame = false;
          frame();
        }
      });
    }
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    stdin.off("keypress", onKeypress);
    stdout.off("resize", onResize);
    if (stdin.isTTY && !wasRaw) stdin.setRawMode(false);
    stdout.write(`${RESET}${SHOW_CURSOR}${EXIT_ALT_SCREEN}`);
    resolveExit?.();
  };

  const onResize = (): void => {
    previousGrid = [];
    frame(true);
  };

  const onKeypress = (input: string, key: readline.Key): void => {
    if ((key.ctrl && key.name === "c") || input === "q") {
      close();
      return;
    }
    if (state.screen === "learn") {
      if (key.name === "escape" || input === "h") {
        state.screen = "lab";
        frame(true);
      }
      return;
    }

    const parameters = activeParameters(state.mode);
    if (key.name === "up" || input === "w") state.selected = (state.selected - 1 + parameters.length) % parameters.length;
    else if (key.name === "down" || input === "s") state.selected = (state.selected + 1) % parameters.length;
    else if (key.name === "left" || input === "a" || input === "-") adjust(state, parameters[state.selected]!, -1);
    else if (key.name === "right" || input === "d" || input === "+" || input === "=") adjust(state, parameters[state.selected]!, 1);
    else if (input === " " || key.name === "space") state.paused = !state.paused;
    else if (input === "m" || key.name === "tab") switchMode(state, state.mode === "travelling" ? "interference" : "travelling");
    else if (input === "1") switchMode(state, "travelling");
    else if (input === "2") switchMode(state, "interference");
    else if (input === "p" && state.mode === "interference") state.phaseB = shortestPhaseDifference(state.phaseB, 0) < 0.1 ? Math.PI : 0;
    else if (input === "r") resetState(state);
    else if (input === "h" || input === "?") state.screen = "learn";
    frame();
  };

  readline.emitKeypressEvents(stdin);
  stdin.on("keypress", onKeypress);
  stdout.on("resize", onResize);
  if (stdin.isTTY && !stdin.isRaw) stdin.setRawMode(true);
  stdout.write(`${ENTER_ALT_SCREEN}${HIDE_CURSOR}\x1b[2J`);
  frame(true);

  let previousTick = performance.now();
  const tick = (): void => {
    if (closed) return;
    const currentTick = performance.now();
    if (!state.paused && state.screen === "lab") {
      state.time = (state.time + ((currentTick - previousTick) / 1_000) * state.rate) % 10_000;
      frame();
    }
    previousTick = currentTick;
    const fps = clamp(Math.ceil(4 + state.frequency * state.rate * 6), MIN_ANIMATION_FPS, MAX_ANIMATION_FPS);
    timer = setTimeout(tick, 1_000 / fps);
  };
  timer = setTimeout(tick, 1_000 / MAX_ANIMATION_FPS);

  await new Promise<void>(resolve => {
    resolveExit = resolve;
  });
}

function buildFrame(state: TerminalState, columns: number, rows: number): Cell[][] {
  const grid = createGrid(columns, rows);
  if (columns < MIN_COLUMNS || rows < MIN_ROWS) {
    writeText(grid, 1, 2, "LAMBDO NEEDS MORE ROOM", "waveA");
    writeText(grid, 3, 2, `minimum ${MIN_COLUMNS}×${MIN_ROWS}  ·  current ${columns}×${rows}`, "muted");
    writeText(grid, 5, 2, "Resize the terminal to reveal the wave laboratory.", "primary");
    writeText(grid, 7, 2, "[Q] QUIT", "muted");
    return grid;
  }

  drawSidebar(grid, state, rows);
  drawHeader(grid, state, columns);
  if (state.screen === "learn") drawLearn(grid, state, columns, rows);
  else if (state.mode === "travelling") drawTravelling(grid, state, columns, rows);
  else drawInterference(grid, state, columns, rows);
  return grid;
}

function drawSidebar(grid: Cell[][], state: TerminalState, rows: number): void {
  const right = SIDEBAR_WIDTH - 1;
  for (let column = 1; column < right; column += 1) {
    put(grid, 0, column, "─", "border");
    put(grid, rows - 1, column, "─", "border");
  }
  for (let row = 1; row < rows - 1; row += 1) {
    put(grid, row, 0, "│", "border");
    put(grid, row, right, "│", "border");
  }
  put(grid, 0, 0, "┌", "border");
  put(grid, 0, right, "┐", "border");
  put(grid, rows - 1, 0, "└", "border");
  put(grid, rows - 1, right, "┘", "border");

  LAMBDO_ART.forEach((line, index) => writeText(grid, index + 1, 2, line, "waveA", right - 2));
  writeText(grid, 12, 2, "MODE", "muted");
  writeText(grid, 12, 8, "1 WAVE", state.mode === "travelling" ? "waveA" : "primary");
  writeText(grid, 12, 16, "2 MIX", state.mode === "interference" ? "waveB" : "primary");
  writeText(grid, 13, 2, "PARAMETERS  ↑↓", "muted");

  const parameters = activeParameters(state.mode);
  const values: Record<Parameter, [string, string]> = {
    amplitude: ["A", state.amplitude.toFixed(2)],
    wavelength: ["λ", `${state.wavelength.toFixed(2)} m`],
    frequency: ["f", `${state.frequency.toFixed(2)} Hz`],
    phase: ["φA", `${state.phase.toFixed(2)} rad`],
    phaseB: ["φB", `${state.phaseB.toFixed(2)} rad`],
    rate: ["time", `${state.rate.toFixed(2)}×`],
  };
  parameters.forEach((parameter, index) => {
    const [label, value] = values[parameter];
    const active = index === state.selected;
    writeText(grid, 14 + index, 2, `${active ? ">" : " "} ${label.padEnd(5)}${value.padStart(10)}`, active ? "waveA" : "primary", right - 2);
  });

  const frozen = state.paused || state.screen === "learn";
  writeText(grid, rows - 4, 2, `${frozen ? "Ⅱ PAUSED" : "▶ LIVE"}  t ${state.time.toFixed(2)}s`, frozen ? "result" : "success", right - 2);
  writeText(grid, rows - 3, 2, " ←  →  CHANGE ", "button", right - 2);
}

function drawHeader(grid: Cell[][], state: TerminalState, columns: number): void {
  const x = SIDEBAR_WIDTH + 1;
  const frozen = state.paused || state.screen === "learn";
  writeText(grid, 0, x, state.mode === "travelling" ? "TRAVELLING WAVE" : "INTERFERENCE", state.mode === "travelling" ? "waveA" : "waveB");
  writeRight(grid, 0, columns - 2, frozen ? "TIME FROZEN" : `LIVE  t=${state.time.toFixed(2)}s`, frozen ? "result" : "success", x);
}

function drawTravelling(grid: Cell[][], state: TerminalState, columns: number, rows: number): void {
  const x = SIDEBAR_WIDTH + 1;
  const width = columns - x - 1;
  const shortcutsRow = rows - 2;
  const equationRow = rows - 3;
  const derivedRow = rows - 4;
  const dividerRow = rows - 5;
  const scaleRow = dividerRow - 1;
  const traceHeight = Math.max(8, scaleRow - 1);
  const wave = waveAFrom(state);
  const trace = renderTrace({ width, height: traceHeight, span: 20, amplitudeScale: Math.max(0.1, wave.amplitude), sample: waveSampleAtTime(wave, state.time) });
  drawTrace(grid, 1, x, trace, "waveA");
  writeText(grid, scaleRow, x, `0m ${"·".repeat(Math.max(0, width - 10))} 20m →`, "muted", width);
  writeText(grid, dividerRow, x, "·".repeat(width), "border", width);
  const derived = deriveWave(wave);
  writeText(grid, derivedRow, x, `v ${derived.speed.toFixed(2)} m/s   k ${derived.waveNumber.toFixed(2)} rad/m   ω ${derived.angularFrequency.toFixed(2)} rad/s`, "primary", width);
  writeText(grid, equationRow, x, equationFor(wave), "muted", width);
  writeText(grid, shortcutsRow, x, shortcuts(width), "muted", width);
}

function drawInterference(grid: Cell[][], state: TerminalState, columns: number, rows: number): void {
  const x = SIDEBAR_WIDTH + 1;
  const width = columns - x - 1;
  const shortcutsRow = rows - 2;
  const sumRow = rows - 3;
  const phaseRow = rows - 4;
  const statusRow = rows - 5;
  const dividerRow = rows - 6;
  const availableTraceRows = Math.max(9, dividerRow - 4);
  const traceAHeight = Math.max(3, Math.ceil(availableTraceRows / 3));
  const traceBHeight = traceAHeight;
  const resultHeight = Math.max(3, availableTraceRows - traceAHeight - traceBHeight);
  const waveA = waveAFrom(state);
  const waveB = waveBFrom(state);
  const sampleA = waveSampleAtTime(waveA, state.time);
  const sampleB = waveSampleAtTime(waveB, state.time);
  const traceA = renderTrace({ width, height: traceAHeight, span: 20, amplitudeScale: waveA.amplitude, sample: sampleA, glow: false });
  const traceB = renderTrace({ width, height: traceBHeight, span: 20, amplitudeScale: waveB.amplitude, sample: sampleB, glow: false });
  const traceResult = renderTrace({ width, height: resultHeight, span: 20, amplitudeScale: Math.max(0.1, waveA.amplitude + waveB.amplitude), sample: position => sampleA(position) + sampleB(position) });
  const phaseDelta = shortestPhaseDifference(state.phase, state.phaseB);
  const resultAmplitude = resultantAmplitude(state.amplitude, state.amplitude, phaseDelta);
  const presentation = describeInterference(classifyInterference(state.amplitude, state.amplitude, phaseDelta), phaseDelta, resultAmplitude, state.amplitude * 2);

  let row = 1;
  writeText(grid, row, x, namedEquationFor(waveA, "y₁"), "waveA", width);
  row += 1;
  drawTrace(grid, row, x, traceA, "waveA");
  row += traceAHeight;
  writeText(grid, row, x, namedEquationFor(waveB, "y₂"), "waveB", width);
  row += 1;
  drawTrace(grid, row, x, traceB, "waveB");
  row += traceBHeight;
  writeText(grid, row, x, `RESULT A=${resultAmplitude.toFixed(2)} ${intensityBar(presentation.ratio)}  ${presentation.label}`, presentation.style, width);
  row += 1;
  drawTrace(grid, row, x, traceResult, "result");

  writeText(grid, dividerRow, x, "·".repeat(width), "border", width);
  writeText(grid, statusRow, x, `INTERFERENCE: ${presentation.category}  ·  ${presentation.relation}`, presentation.style, width);
  writeText(grid, phaseRow, x, `φA ${phaseTrack(state.phase)}  φB ${phaseTrack(state.phaseB)}  Δφ ${phaseDelta.toFixed(2)}`, "primary", width);
  writeText(grid, sumRow, x, "y(x,t) = y₁(x,t) + y₂(x,t)", "muted", width);
  writeText(grid, shortcutsRow, x, shortcuts(width), "muted", width);
}

function drawLearn(grid: Cell[][], state: TerminalState, columns: number, rows: number): void {
  const x = SIDEBAR_WIDTH + 3;
  const width = columns - x - 2;
  if (state.mode === "interference") {
    const waveA = waveAFrom(state);
    const waveB = waveBFrom(state);
    const phaseDelta = shortestPhaseDifference(state.phase, state.phaseB);
    const resultAmplitude = resultantAmplitude(state.amplitude, state.amplitude, phaseDelta);
    const presentation = describeInterference(classifyInterference(state.amplitude, state.amplitude, phaseDelta), phaseDelta, resultAmplitude, state.amplitude * 2);
    const [explanationA, explanationB] = contextualExplanation(presentation.label);
    const lines: Array<[string, StyleName]> = [
      ["LEARN · INTERFERENCE", "waveB"],
      [presentationHeading(presentation), presentation.style],
      [explanationA, "primary"],
      [explanationB, "muted"],
      ["", "default"],
      ["LIVE EQUATIONS", "result"],
      [namedEquationFor(waveA, "y₁"), "waveA"],
      [namedEquationFor(waveB, "y₂"), "waveB"],
      ["y(x,t) = y₁(x,t) + y₂(x,t)", "primary"],
      ["", "default"],
      ["PHASE MAP", "result"],
      [`φA ${phaseTrack(state.phase)}  φB ${phaseTrack(state.phaseB)}`, "primary"],
      [`Δφ = ${phaseDelta.toFixed(2)} rad  ·  Aresult = ${resultAmplitude.toFixed(2)}`, "muted"],
      [`${intensityBar(presentation.ratio, 18)}  ${Math.round(presentation.ratio * 100)}% of maximum`, presentation.style],
      ["", "default"],
      ["[H / ESC] RETURN TO LAB", "muted"],
    ];
    drawLearnLines(grid, lines, x, width, rows);
    return;
  }

  const wave = waveAFrom(state);
  const derived = deriveWave(wave);
  const lines: Array<[string, StyleName]> = [
    ["LEARN · TRAVELLING WAVE", "waveA"],
    ["The profile moves through space without changing shape.", "primary"],
    ["Frequency controls oscillation rate; λ controls spacing.", "muted"],
    ["", "default"],
    ["FUNDAMENTAL RELATION", "waveA"],
    [`v = λf = ${wave.wavelength.toFixed(2)} × ${wave.frequency.toFixed(2)} = ${derived.speed.toFixed(2)} m/s`, "primary"],
    [`T = ${derived.period.toFixed(2)} s  ·  k = ${derived.waveNumber.toFixed(2)} rad/m`, "muted"],
    [`ω = ${derived.angularFrequency.toFixed(2)} rad/s`, "muted"],
    ["", "default"],
    ["LIVE EQUATION", "waveB"],
    [namedEquationFor(wave, "y"), "primary"],
    ["Every displayed point is calculated from this equation.", "muted"],
    ["", "default"],
    ["[H / ESC] RETURN TO LAB", "muted"],
  ];
  drawLearnLines(grid, lines, x, width, rows);
}

function drawLearnLines(grid: Cell[][], lines: Array<[string, StyleName]>, x: number, width: number, rows: number): void {
  const start = Math.max(2, Math.floor((rows - lines.length) / 2));
  lines.forEach(([text, style], index) => writeText(grid, start + index, x, text, style, width));
}

function createGrid(columns: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => ({ char: " ", style: "default" as StyleName })));
}

function put(grid: Cell[][], row: number, column: number, char: string, style: StyleName): void {
  const cell = grid[row]?.[column];
  if (!cell) return;
  cell.char = char;
  cell.style = style;
}

function writeText(grid: Cell[][], row: number, column: number, text: string, style: StyleName, maximumWidth = Number.POSITIVE_INFINITY): void {
  const characters = Array.from(text).slice(0, maximumWidth);
  characters.forEach((character, offset) => put(grid, row, column + offset, character, style));
}

function writeRight(grid: Cell[][], row: number, rightColumn: number, text: string, style: StyleName, minimumColumn: number): void {
  const width = Array.from(text).length;
  writeText(grid, row, Math.max(minimumColumn, rightColumn - width + 1), text, style, rightColumn - minimumColumn + 1);
}

function drawTrace(grid: Cell[][], startRow: number, startColumn: number, trace: WaveCell[][], style: StyleName): void {
  trace.forEach((traceRow, rowOffset) => {
    traceRow.forEach((cell, columnOffset) => {
      put(grid, startRow + rowOffset, startColumn + columnOffset, cell.glyph, style);
    });
  });
}

function lastVisibleColumn(row: Cell[]): number {
  let lastVisible = row.length - 1;
  while (lastVisible >= 0 && row[lastVisible]!.char === " ") lastVisible -= 1;
  return lastVisible;
}

function changedRange(previous: Cell[], next: Cell[]): { first: number; last: number } | undefined {
  let first = -1;
  let last = -1;
  for (let index = 0; index < next.length; index += 1) {
    if (previous[index]?.char !== next[index]!.char || previous[index]?.style !== next[index]!.style) {
      if (first < 0) first = index;
      last = index;
    }
  }
  return first < 0 ? undefined : { first, last };
}

function serializeRange(row: Cell[], first: number, last: number): string {
  let currentStyle: StyleName | undefined;
  let output = "";
  for (let index = first; index <= last; index += 1) {
    const cell = row[index]!;
    if (cell.style !== currentStyle) {
      output += STYLE[cell.style];
      currentStyle = cell.style;
    }
    output += cell.char;
  }
  return output;
}

function activeParameters(mode: LabMode): Parameter[] {
  return mode === "interference"
    ? ["amplitude", "wavelength", "frequency", "phase", "phaseB", "rate"]
    : ["amplitude", "wavelength", "frequency", "phase", "rate"];
}

function switchMode(state: TerminalState, mode: LabMode): void {
  state.mode = mode;
  state.selected = 0;
}

function adjust(state: TerminalState, parameter: Parameter, direction: -1 | 1): void {
  if (parameter === "amplitude") state.amplitude = clamp(round(state.amplitude + direction * 0.1), 0.1, 3);
  if (parameter === "wavelength") state.wavelength = clamp(round(state.wavelength + direction * 0.5), 2, 20);
  if (parameter === "frequency") state.frequency = clamp(round(state.frequency + direction * 0.1), 0.1, 5);
  if (parameter === "phase") state.phase = wrapPhase(state.phase + direction * Math.PI / 8);
  if (parameter === "phaseB") state.phaseB = wrapPhase(state.phaseB + direction * Math.PI / 8);
  if (parameter === "rate") state.rate = clamp(round(state.rate + direction * 0.25), 0.25, 3);
}

function resetState(state: TerminalState): void {
  state.amplitude = 1;
  state.wavelength = 8;
  state.frequency = 1;
  state.phase = 0;
  state.phaseB = Math.PI;
  state.rate = 1;
  state.time = 0;
  state.paused = false;
}

function waveAFrom(state: TerminalState): WaveParameters {
  return { amplitude: state.amplitude, wavelength: state.wavelength, frequency: state.frequency, phase: state.phase, direction: 1 };
}

function waveBFrom(state: TerminalState): WaveParameters {
  return { amplitude: state.amplitude, wavelength: state.wavelength, frequency: state.frequency, phase: state.phaseB, direction: 1 };
}

function waveSampleAtTime(wave: WaveParameters, time: number): (position: number) => number {
  const { waveNumber, angularFrequency } = deriveWave(wave);
  const phaseOffset = -wave.direction * angularFrequency * time + wave.phase;
  return position => wave.amplitude * Math.sin(waveNumber * position + phaseOffset);
}

function describeInterference(kind: InterferenceKind, phaseDelta: number, resultAmplitude: number, maximumAmplitude: number): InterferencePresentation {
  const ratio = maximumAmplitude > 0 ? clamp(resultAmplitude / maximumAmplitude, 0, 1) : 0;
  if (kind === "constructive") return { category: "CONSTRUCTIVE", label: "CONSTRUCTIVE", relation: phaseDelta < 0.08 ? "IN PHASE" : "NEARLY IN PHASE", style: "success", ratio };
  if (kind === "destructive") return { category: "DESTRUCTIVE", label: ratio < 0.01 ? "CANCELLED" : "DESTRUCTIVE", relation: "OUT OF PHASE", style: "waveA", ratio };
  return {
    category: "PARTIAL",
    label: "PARTIAL",
    relation: Math.abs(phaseDelta - Math.PI / 2) < 0.12 ? "QUARTER CYCLE" : phaseDelta < Math.PI / 2 ? "PARTLY IN PHASE" : "PARTLY OUT OF PHASE",
    style: "result",
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
  if (label === "CONSTRUCTIVE") return ["Crests meet crests and troughs meet troughs.", "The amplitudes reinforce toward their maximum."];
  if (label === "CANCELLED") return ["Equal waves are exactly opposite: crest meets trough.", "Their displacements cancel completely at every point."];
  if (label === "DESTRUCTIVE") return ["The waves are close to opposite phase.", "Most of their displacement is cancelled."];
  return ["The waves are neither aligned nor fully opposite.", "The result lies between reinforcement and cancellation."];
}

function presentationHeading(presentation: InterferencePresentation): string {
  return presentation.label === presentation.category ? `${presentation.category} INTERFERENCE` : `${presentation.label} · ${presentation.category} INTERFERENCE`;
}

function shortcuts(width: number): string {
  const full = "[←→] EDIT [SPC] PAUSE [M] MODE [H] LEARN [R] RESET [Q] QUIT";
  const compact = "[←→] EDIT [SPC] PAUSE [M] MODE [H] LEARN [Q] QUIT";
  return Array.from(full).length <= width ? full : compact;
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
