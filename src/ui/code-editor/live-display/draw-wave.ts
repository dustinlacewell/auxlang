/**
 * Draws a scope widget's canvas (scope-widget-extension.ts) in device pixels:
 * every drawn trace of every lane, its buffer left to right in bucket order
 * (scope.js records each sweep from bucket 0, so the new sweep wipes over the
 * last), scaled to that trace's range (scope-scale.ts). A trace is one filled
 * shape: the top edge of its pixel columns (wave-columns.ts) left to right,
 * then the bottom edge back. A column thinner than the line width widens
 * about its centre, so a slow signal draws as an even line. Each (trace,
 * lane) has its own color.
 */

import type { Range } from "./trace-stats";
import { bucketsOf } from "./trace-stats";
import { type Columns, waveColumns } from "./wave-columns";

const LINE_CSS_PX = 1.25;

const TRACE_COLORS = [
	"rgba(96,165,250,0.9)",
	"rgba(250,204,21,0.9)",
	"rgba(74,222,128,0.9)",
	"rgba(244,114,182,0.9)",
	"rgba(192,132,252,0.9)",
	"rgba(248,113,113,0.9)",
	"rgba(45,212,191,0.9)",
	"rgba(251,146,60,0.9)",
];

let scratch: Columns = { lo: new Float32Array(0), hi: new Float32Array(0) };

/** `traces`: the trace numbers to draw; `ranges[trace]`: the range each is drawn against. */
export function drawWave(
	canvas: HTMLCanvasElement,
	lanes: readonly Float64Array[],
	traces: readonly number[],
	ranges: readonly (Range | undefined)[],
): void {
	const ctx = canvas.getContext("2d");
	if (ctx === null) return;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const line = LINE_CSS_PX * (window.devicePixelRatio || 1);
	for (const trace of traces) {
		const range = ranges[trace];
		if (range === undefined) continue;
		for (let lane = 0; lane < lanes.length; lane++) {
			const color = TRACE_COLORS[(trace * lanes.length + lane) % TRACE_COLORS.length] as string;
			const words = lanes[lane] as Float64Array;
			drawTrace(ctx, words, trace, range, color, canvas.width, canvas.height, line);
		}
	}
}

function drawTrace(
	ctx: CanvasRenderingContext2D,
	words: Float64Array,
	trace: number,
	range: Range,
	color: string,
	width: number,
	height: number,
	line: number,
): void {
	const cols = Math.max(2, width);
	const columns = columnsFor(cols);
	waveColumns(words, trace, 0, bucketsOf(words), cols, columns);

	const pad = line / 2;
	const span = height - line;
	const y = (v: number) => pad + (1 - (v - range.min) / (range.max - range.min)) * span;
	ctx.fillStyle = color;
	ctx.beginPath();
	for (let c = 0; c < cols; c++) {
		const [top] = edge(y(columns.hi[c] as number), y(columns.lo[c] as number), line);
		if (c === 0) ctx.moveTo(c + 0.5, top);
		else ctx.lineTo(c + 0.5, top);
	}
	for (let c = cols - 1; c >= 0; c--) {
		const [, bottom] = edge(y(columns.hi[c] as number), y(columns.lo[c] as number), line);
		ctx.lineTo(c + 0.5, bottom);
	}
	ctx.closePath();
	ctx.fill();
}

/** A column's top and bottom, at least `line` apart about its centre. */
function edge(top: number, bottom: number, line: number): [number, number] {
	if (bottom - top >= line) return [top, bottom];
	const centre = (top + bottom) / 2;
	return [centre - line / 2, centre + line / 2];
}

function columnsFor(cols: number): Columns {
	if (scratch.lo.length < cols)
		scratch = { lo: new Float32Array(cols), hi: new Float32Array(cols) };
	return scratch;
}
