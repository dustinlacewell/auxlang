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
	| "phase"; // a position: unbounded, in cycles (a clock's bars, a counter's steps)

/** Module family — drives docs grouping and node coloring (see src/theme/colors.ts). */
export type Category =
	| "timing"
	| "sources"
	| "filters"
	| "envelopes"
	| "effects"
	| "drums"
	| "bridge"
	| "utils";

export interface PortAnn {
	readonly unit: Unit;
	/** Default when unconnected. null = required (loud error if unconnected) unless `opt`. */
	readonly def: number | null;
	/**
	 * With `def: null`: unconnected is LEGAL. The engine binds NaN as the
	 * "absent" sentinel (direct-driver tests pass null); modules guard with
	 * `Number.isFinite`.
	 */
	readonly opt?: true;
}

// The convertible units (hz, semis, secs, beats) are unit tags: units/tag.ts.
export const sig = (def: number | null = 0): PortAnn => ({ unit: "sig", def });
export const unit = (def: number | null): PortAnn => ({ unit: "unit", def });
export const gatePort = (def: number | null = 0): PortAnn => ({ unit: "gate", def });
export const trigPort = (def: number | null = 0): PortAnn => ({ unit: "trig", def });
export const phasePort = (def: number | null = 0): PortAnn => ({ unit: "phase", def });
/** Mark a `def: null` input optional: unconnected is legal, tick sees an absent sentinel. */
export const optional = (ann: PortAnn): PortAnn => ({ ...ann, opt: true });

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
 * Each port's array holds that source's own lanes (its length); a narrower
 * source is not copied across lanes. `width` is the widest connected source.
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
	/** One-line human description, rendered by the site's module cards/reference. */
	readonly doc?: string;
	/** Module family — drives docs grouping and node coloring. */
	readonly category: Category;
	readonly ins: Record<string, PortAnn>;
	readonly outs: Record<string, PortAnn>;
	/** Static per-node values (JSON-serializable; pattern ASTs live here). */
	readonly config?: Record<string, unknown>;
	/** Names (input or config) filled by positional factory args, in order. */
	readonly positional?: readonly string[];
	readonly defaultIn: string;
	/**
	 * The output a whole-module connection reads. Absent on a stereo module
	 * (`pan`, MANIFESTO §5): it connects by name, and a single-port read of it
	 * is a loud error.
	 */
	readonly defaultOut?: string;
	/** "map" (default): tick per lane. "reduce": one tick sees all lanes, width collapses to 1. */
	readonly policy?: "map" | "reduce";
	/**
	 * Fresh state per lane. MUST return plain serializable data (numbers, typed
	 * arrays, nested plain objects). After construction (or migration) the engine
	 * injects `state.__lane = laneIndex`, so per-lane modules (seq) know which
	 * packed lane they render without any extra contract surface,
	 * `state.__scratch = {}`, a per-lane record for data derived from config
	 * (seq's event tables), never carried across a re-eval, and
	 * `state.__seed`, the patch seed `hashRandom(key)` in a tick uses. A fresh
	 * lane also gets `state.__rng`, its own random stream position seeded from
	 * (patch seed, identity, lane), which `Math.random()` in the tick draws.
	 * State is fixed-shape: a re-eval keeps it whenever its shape still fits,
	 * whatever the config, so state must not cache values derived from config.
	 */
	readonly state?: (sampleRate: number) => Record<string, unknown>;
	/** The tick as the engine runs it: rebuilt from `source` with the tick names bound (module/tick-build). */
	readonly tick: TickFn | ReduceTickFn;
	/**
	 * The authoritative text of `tick` and its helpers, as written. Absent only
	 * for the modules exempt from the tick subset (module/tick-subset/exempt.ts),
	 * whose `tick` is the host closure itself.
	 */
	readonly source?: ModuleSource;
}

/** A module's tick and named helpers as source text (MANIFESTO §5.1). */
export interface ModuleSource {
	readonly tick: string;
	readonly helpers: Readonly<Record<string, string>>;
}

export type Registry = ReadonlyMap<string, ModuleSpec>;

/**
 * A patch-defined ModuleSpec as it crosses the worklet boundary: `tick` (and
 * `state`, when present) are function SOURCE strings; everything else is plain
 * JSON. Hydrated back into a ModuleSpec per engine (runtime/hydrate-specs).
 */
export interface SerializedModuleSpec {
	readonly name: string;
	readonly doc?: string;
	readonly category: Category;
	readonly ins: Record<string, PortAnn>;
	readonly outs: Record<string, PortAnn>;
	readonly config?: Record<string, unknown>;
	readonly positional?: readonly string[];
	readonly defaultIn: string;
	readonly defaultOut?: string;
	readonly policy?: "map" | "reduce";
	readonly state?: string;
	readonly tick: string;
	/** Helper name → function source. Present only when the module declares helpers. */
	readonly helpers?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Compiled program — serializable, interpreted by the engine
// ---------------------------------------------------------------------------

export type PortSrc =
	| { readonly k: "c"; readonly v: number } // constant
	| { readonly k: "n"; readonly node: number; readonly port: string; readonly lane: number } // connection (node = index into Program.nodes)
	| { readonly k: "z"; readonly node: number; readonly port: string; readonly lane: number } // cycle-cut connection: reads PREVIOUS sample
	| { readonly k: "l"; readonly src: string }; // user lambda, stringified (state, sr, time) => number

/** What re-eval matching sees of a node (runtime/match.ts, MANIFESTO §6.2). Wiring and constants are not identity. */
export interface Identity {
	/** Module type; a patch-defined module adds a hash of its source (a changed tick is a different machine). */
	readonly kind: string;
	/** Hash of the kind and the first path of (port, module) hops from an `out` root. */
	readonly place: string;
	/** Hash of the module types and ports feeding the node, recursively; breaks ties among nodes sharing a place. */
	readonly upstream: string;
	/** Sorted hashes of the constants and config on the node and upstream of it; breaks ties left after `upstream`. Not identity. */
	readonly constants: readonly number[];
	/** User-pinned identity (`.id(name)`), matched first. */
	readonly pin?: string;
}

/** A running node's identity plus its migration key (the key its state is carried under). */
export interface KeyedIdentity extends Identity {
	readonly key: string;
}

export interface PNode extends Identity {
	readonly module: string;
	readonly width: number;
	/** Per-lane input sources: lanes[lane][portName]. length === width (1 for reduce). */
	readonly lanes: readonly Record<string, PortSrc>[];
	readonly config: Record<string, unknown>;
}

export interface Program {
	/** Topologically ordered with z-edges cut. */
	readonly nodes: readonly PNode[];
	/** Indices of `out` nodes; engine sums their `l`/`r` outputs. */
	readonly outs: readonly number[];
	readonly seed: number;
	/** Patch-defined module specs used by `nodes` (defmod). Present only when non-empty. */
	readonly specs?: readonly SerializedModuleSpec[];
}

// ---------------------------------------------------------------------------
// Engine contract — one interpreter, two hosts (offline renderer + worklet)
// ---------------------------------------------------------------------------

/** Migration key → output port → per-lane value. */
export type FeedbackValues = Readonly<Record<string, Readonly<Record<string, readonly number[]>>>>;

export interface EngineState {
	/** migration key -> per-lane state array */
	readonly nodes: Record<string, Record<string, unknown>[]>;
	/** The running nodes' identities, in program order: the old side of re-eval matching. */
	readonly identities: readonly KeyedIdentity[];
	/** The last sample's outputs that z-edges read, for the next engine's first tick (runtime/feedback.ts). */
	readonly feedback: FeedbackValues;
	/** The rate the state was built at; a different rate migrates nothing. */
	readonly sampleRate: number;
	readonly sampleCount: number;
}

export interface Engine {
	/** Advance one sample; write [l, r] into out. Allocates nothing. */
	tick(out: Float32Array): void;
	collectState(): EngineState;
	readonly sampleCount: number;
}

export type EngineCtor = (
	program: Program,
	sampleRate: number,
	registry: Registry,
	prev?: EngineState,
) => Engine;
