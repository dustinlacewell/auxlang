/**
 * Assemble a WebAssembly module from its parts: function types, imported
 * functions, defined functions (locals and body), one memory, and exports.
 * Sections in the order the binary format requires.
 */

import { unsignedLeb } from "./leb128";
import { OP } from "./opcodes";

export interface FuncType {
	readonly params: readonly number[];
	readonly results: readonly number[];
}

export interface ImportedFunc {
	readonly module: string;
	readonly name: string;
	readonly type: number;
}

export interface DefinedFunc {
	readonly type: number;
	/** The value type of each local after the parameters. */
	readonly locals: readonly number[];
	/** The body's instructions, without the final `end`. */
	readonly body: readonly number[];
}

export interface Export {
	readonly name: string;
	/** 0 function, 2 memory. */
	readonly kind: 0 | 2;
	readonly index: number;
}

export interface ModuleParts {
	readonly types: readonly FuncType[];
	readonly imports: readonly ImportedFunc[];
	readonly funcs: readonly DefinedFunc[];
	readonly memoryPages: number;
	readonly exports: readonly Export[];
}

const MAGIC = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

export function moduleBytes(parts: ModuleParts): Uint8Array<ArrayBuffer> {
	const out = [...MAGIC];
	section(out, 1, vector(parts.types, funcType));
	section(out, 2, vector(parts.imports, importEntry));
	section(
		out,
		3,
		vector(parts.funcs, (f, b) => unsignedLeb(f.type, b)),
	);
	section(out, 5, vector([parts.memoryPages], memoryEntry));
	section(out, 7, vector(parts.exports, exportEntry));
	section(out, 10, vector(parts.funcs, codeEntry));
	return Uint8Array.from(out);
}

function section(out: number[], id: number, content: number[]): void {
	out.push(id);
	unsignedLeb(content.length, out);
	for (const b of content) out.push(b);
}

function vector<T>(items: readonly T[], write: (item: T, out: number[]) => void): number[] {
	const out: number[] = [];
	unsignedLeb(items.length, out);
	for (const item of items) write(item, out);
	return out;
}

function funcType(t: FuncType, out: number[]): void {
	out.push(0x60);
	unsignedLeb(t.params.length, out);
	out.push(...t.params);
	unsignedLeb(t.results.length, out);
	out.push(...t.results);
}

function name(text: string, out: number[]): void {
	const bytes = new TextEncoder().encode(text);
	unsignedLeb(bytes.length, out);
	for (const b of bytes) out.push(b);
}

function importEntry(entry: ImportedFunc, out: number[]): void {
	name(entry.module, out);
	name(entry.name, out);
	out.push(0x00);
	unsignedLeb(entry.type, out);
}

function memoryEntry(pages: number, out: number[]): void {
	out.push(0x00);
	unsignedLeb(pages, out);
}

function exportEntry(entry: Export, out: number[]): void {
	name(entry.name, out);
	out.push(entry.kind);
	unsignedLeb(entry.index, out);
}

function codeEntry(fn: DefinedFunc, out: number[]): void {
	const body: number[] = [];
	const runs = localRuns(fn.locals);
	unsignedLeb(runs.length, body);
	for (const [count, type] of runs) {
		unsignedLeb(count, body);
		body.push(type);
	}
	for (const b of fn.body) body.push(b);
	body.push(OP.end);
	unsignedLeb(body.length, out);
	for (const b of body) out.push(b);
}

/** Consecutive locals of one type as (count, type) runs. */
function localRuns(locals: readonly number[]): [number, number][] {
	const runs: [number, number][] = [];
	for (const type of locals) {
		const last = runs[runs.length - 1];
		if (last !== undefined && last[1] === type) last[0]++;
		else runs.push([1, type]);
	}
	return runs;
}
