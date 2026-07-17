/**
 * Shared contract types for core3. All tracks build against these.
 * See llm/platonic.md (the spec) and llm/platonic-impl.md (track boundaries).
 */

// ---------------------------------------------------------------------------
// Units & port annotations (documentation with behavior — NOT a type system)
// ---------------------------------------------------------------------------

export type Unit =
	| "sig" // audio/any signal, -1..1 nominal
	| "hz"
	| "unit" // 0..1 knob
	| "semis" // pitch, MIDI semitones (69 = A440)
	| "beats" // musical time, resolved against governing clock
	| "secs"
	| "gate" // 0/1, threshold 0.5
	| "trig" // single-sample 1
	| "phase"; // unbounded beat ramp

export interface PortAnn {
	readonly unit: Unit;
	/** Default when unconnected. null = required (loud error if unconnected). */
	readonly def: number | null;
}

export const sig = (def: number | null = 0): PortAnn => ({ unit: "sig", def });
export const hz = (def: number | null): PortAnn => ({ unit: "hz", def });
export const unit = (def: number | null): PortAnn => ({ unit: "unit", def });
export const semis = (def: number | null): PortAnn => ({ unit: "semis", def });
export const beats = (def: number | null): PortAnn => ({ unit: "beats", def });
export const secs = (def: number | null): PortAnn => ({ unit: "secs", def });
export const gatePort = (def: number | null = 0): PortAnn => ({ unit: "gate", def });
export const trigPort = (def: number | null = 0): PortAnn => ({ unit: "trig", def });
export const phasePort = (def: number | null = 0): PortAnn => ({ unit: "phase", def });

// ---------------------------------------------------------------------------
// Module contract — pure Mealy machines
// ---------------------------------------------------------------------------

/** Per-lane tick: reads inputs + state, writes outputs + state. Pure otherwise. */
export type TickFn = (
	state: Record<string, unknown>,
	ins: Record<string, number>,
	outs: Record<string, number>,
	config: Record<string, unknown>,
	sampleRate: number,
) => void;

/**
 * Reducer tick: sees all lanes of each input at once (Float32Array per port,
 * or a plain number when the input is a broadcast constant). One output lane set.
 */
export type ReduceTickFn = (
	state: Record<string, unknown>,
	ins: Record<string, Float32Array | number>,
	outs: Record<string, number>,
	config: Record<string, unknown>,
	sampleRate: number,
	width: number,
) => void;

export interface ModuleSpec {
	readonly name: string;
	readonly ins: Record<string, PortAnn>;
	readonly outs: Record<string, PortAnn>;
	/** Static per-node values (JSON-serializable; pattern ASTs live here). */
	readonly config?: Record<string, unknown>;
	/** Names (input or config) filled by positional factory args, in order. */
	readonly positional?: readonly string[];
	readonly defaultIn: string;
	readonly defaultOut: string;
	/** "map" (default): tick per lane. "reduce": one tick sees all lanes, width collapses to 1. */
	readonly policy?: "map" | "reduce";
	/** Fresh state per lane. MUST return plain serializable data (numbers, typed arrays, nested plain objects). */
	readonly state?: (sampleRate: number) => Record<string, unknown>;
	readonly tick: TickFn | ReduceTickFn;
}

export type Registry = ReadonlyMap<string, ModuleSpec>;

// ---------------------------------------------------------------------------
// Compiled program — serializable, interpreted by the engine
// ---------------------------------------------------------------------------

export type PortSrc =
	| { readonly k: "c"; readonly v: number } // constant
	| { readonly k: "n"; readonly node: number; readonly port: string; readonly lane: number } // connection (node = index into Program.nodes)
	| { readonly k: "z"; readonly node: number; readonly port: string; readonly lane: number } // cycle-cut connection: reads PREVIOUS sample
	| { readonly k: "l"; readonly src: string }; // user lambda, stringified (state, sr, time) => number

export interface PNode {
	/** Stable structural id (hash of module+config+input structure) for state migration. */
	readonly id: string;
	readonly module: string;
	readonly width: number;
	/** Per-lane input sources: lanes[lane][portName]. length === width (1 for reduce). */
	readonly lanes: readonly Record<string, PortSrc>[];
	readonly config: Record<string, unknown>;
	/** User-pinned identity (overrides structural id in migration). */
	readonly pin?: string;
}

export interface Program {
	/** Topologically ordered with z-edges cut. */
	readonly nodes: readonly PNode[];
	/** Indices of `out` nodes; engine sums their `l`/`r` outputs. */
	readonly outs: readonly number[];
	readonly seed: number;
}

// ---------------------------------------------------------------------------
// Engine contract — one interpreter, two hosts (offline renderer + worklet)
// ---------------------------------------------------------------------------

export interface EngineState {
	/** nodeStructuralId -> per-lane state array */
	readonly nodes: Record<string, Record<string, unknown>[]>;
	readonly sampleCount: number;
}

export interface Engine {
	/** Advance one sample; write [l, r] into out. Allocates nothing. */
	tick(out: Float32Array): void;
	collectState(): EngineState;
	readonly sampleCount: number;
}

export interface EngineCtor {
	(program: Program, sampleRate: number, registry: Registry, prev?: EngineState): Engine;
}
