/**
 * Shared contract types for core3. All tracks build against these.
 * See llm/platonic.md (the spec) and llm/platonic-impl.md (track boundaries).
 */

import type { SlotDecl } from "./runtime/live/live-contract";

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
	/**
	 * A port group: one name, this annotation, any number of members the node
	 * fixes at eval (module/node-ports). A member's port is `group.member`, or
	 * the bare member name in an `open` group. `like` names another group on
	 * the same side whose members this one copies.
	 */
	readonly group?: PortGroup;
	/**
	 * A control port (runtime/live/live-contract.ts): a number bound to it
	 * becomes a live slot the editor writes while the patch plays.
	 */
	readonly slot?: SlotRange;
}

/** A control port's clamp range: each bound is a port whose constant gives it, or a fixed number. */
export interface SlotRange {
	readonly min: string | number;
	readonly max: string | number;
}

export interface PortGroup {
	readonly open?: true;
	readonly like?: string;
}

// The convertible units (hz, semis, secs, beats) are unit tags: units/tag.ts.
export const sig = (def: number | null = 0): PortAnn => ({ unit: "sig", def });
export const unit = (def: number | null): PortAnn => ({ unit: "unit", def });
export const gatePort = (def: number | null = 0): PortAnn => ({ unit: "gate", def });
export const trigPort = (def: number | null = 0): PortAnn => ({ unit: "trig", def });
export const phasePort = (def: number | null = 0): PortAnn => ({ unit: "phase", def });
/** Mark a `def: null` input optional: unconnected is legal, tick sees an absent sentinel. */
export const optional = (ann: PortAnn): PortAnn => ({ ...ann, opt: true });
/** Make `ann` a port group: its members are fixed per node. */
export const group = (ann: PortAnn, opts: PortGroup = {}): PortAnn => ({ ...ann, group: { ...opts } });
/** A signal group set as an array: members `0..n-1`. */
export const sigs = (def: number | null = 0): PortAnn => group(sig(def));
/** Make `ann` a control port whose live slot clamps to `range`. */
export const slotted = (ann: PortAnn, range: SlotRange): PortAnn => ({ ...ann, slot: { ...range } });

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
 * Reducer tick: sees all lanes of each input at once (Float64Array per port,
 * or a plain number when the input is a broadcast constant). One output lane set.
 * Each port's array holds that source's own lanes (its length); a narrower
 * source is not copied across lanes. `width` is the widest connected source.
 */
export type ReduceTickFn = (
	state: Record<string, unknown>,
	ins: Record<string, Float64Array | number>,
	outs: Record<string, number>,
	config: Record<string, unknown>,
	sampleRate: number,
	width: number,
) => void;

/**
 * A module's port surface: everything the patch layer reads to build, chain
 * and connect a node. A tick module (ModuleSpec) and a sub-patch module
 * (patch/subpatch) both have one.
 */
export interface ModulePorts {
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
	/** The chain target. Absent only on a sub-patch with no inputs, which nothing can chain into. */
	readonly defaultIn?: string;
	/**
	 * The output a whole-module connection reads. Absent on a stereo module
	 * (`pan`, MANIFESTO §5): it connects by name, and a single-port read of it
	 * is a loud error.
	 */
	readonly defaultOut?: string;
}

export interface ModuleSpec extends ModulePorts {
	readonly defaultIn: string;
	/** "map" (default): tick per lane. "reduce": one tick sees all lanes, width collapses to 1. */
	readonly policy?: "map" | "reduce";
	/**
	 * "pattern": the tick reads `config.pattern` through its lane's event table
	 * with the table intrinsics (module/front/intrinsics/table-intrinsics.ts).
	 */
	readonly reads?: "pattern";
	/**
	 * Fresh state per lane. MUST return plain serializable data (numbers, typed
	 * arrays, nested plain objects). After construction (or migration) the engine
	 * injects `state.__lane = laneIndex`, so per-lane modules (seq) know which
	 * packed lane they render without any extra contract surface,
	 * `state.__scratch`, a per-lane record for data derived from config (the
	 * event table of a module that reads a pattern), never carried across a
	 * re-eval, and
	 * `state.__seed`, the patch seed `hashRandom(key)` in a tick uses. A fresh
	 * lane also gets `state.__rng`, its own random stream position seeded from
	 * (patch seed, identity, lane), which `Math.random()` in the tick draws.
	 * State is fixed-shape: a re-eval keeps it whenever its shape still fits.
	 * Receives the node's config, so a config edit rebuilds any read-only
	 * fields derived from it.
	 */
	readonly state?: (sampleRate: number, config: Record<string, unknown>) => Record<string, unknown>;
	/** The tick as the engine runs it: rebuilt from `source` with the tick names bound (module/tick-build). */
	readonly tick: TickFn | ReduceTickFn;
	/**
	 * The authoritative text of `tick` and its helpers, as written. Absent only
	 * on a spec built by hand (a test's own spec), whose `tick` is the host
	 * closure itself.
	 */
	readonly source?: ModuleSource;
	/**
	 * Setup-local fields the tick writes (shape-C lowering, lower/tick-writes.ts):
	 * the re-eval carry rule reads this list. Absent on an old-form spec, whose
	 * carry rule keeps today's whole-shape-fits behavior.
	 */
	readonly writes?: readonly string[];
}

/** A module's tick and named helpers as source text (MANIFESTO §5.1). */
export interface ModuleSource {
	readonly tick: string;
	readonly helpers: Readonly<Record<string, string>>;
	/**
	 * Where each part (`tick`, `helper 'step'`) starts in the file it was
	 * written in, when that file was being evaluated: a loud error found at
	 * build then names the file line, as one found at eval does.
	 */
	readonly origins?: Readonly<Record<string, SourceOrigin>>;
}

/** A 1-based file line in a library file or the patch. */
export interface SourceOrigin {
	readonly file: string;
	readonly line: number;
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
	readonly reads?: "pattern";
	readonly state?: string;
	readonly tick: string;
	/** Helper name → function source. Present only when the module declares helpers. */
	readonly helpers?: Readonly<Record<string, string>>;
	/** ModuleSource `origins`. Present only when a part was found in its file. */
	readonly origins?: Readonly<Record<string, SourceOrigin>>;
	/** `ModuleSpec.writes`, carried across the crossing. */
	readonly writes?: readonly string[];
}

// ---------------------------------------------------------------------------
// Compiled program — serializable, interpreted by the engine
// ---------------------------------------------------------------------------

export type PortSrc =
	| { readonly k: "c"; readonly v: number } // constant
	| { readonly k: "n"; readonly node: number; readonly port: string; readonly lane: number } // connection (node = index into Program.nodes)
	// cycle-cut connection: reads PREVIOUS sample; `start` is the value before the source's first (absent = 0, runtime/feedback)
	| {
			readonly k: "z";
			readonly node: number;
			readonly port: string;
			readonly lane: number;
			readonly start?: number;
	  }
	| { readonly k: "l"; readonly lambda: BoundLambda } // user lambda (state, sr, time) => number
	| { readonly k: "s"; readonly slot: number }; // live slot (index into Program.liveSlots), written while playing

/**
 * A signal lambda bound to auxlang's math (module/bind-math/bind-lambda-math.ts),
 * as data: the rewritten function text, the library functions it calls and
 * its call cache size. Each engine builds what it runs from this: JS wraps it
 * with the helpers and a cache array (bind-math/lambda-wrapper.ts); WASM
 * calls the shared library and keeps the cache in memory.
 */
export interface BoundLambda {
	/** The function text; its math calls go through `__math_<name>` and `__mc[slot]`. */
	readonly fn: string;
	/** The library functions `fn` calls, by name without the prefix, sorted. */
	readonly math: readonly string[];
	/** Its call cache size. */
	readonly slots: number;
}

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
	/** Port group members, as on the GNode (graph/node.ts). Absent when the node has none. */
	readonly groups?: Readonly<Record<string, readonly string[]>>;
	/**
	 * Local seed from `.seed(n)`. Replaces the patch seed for this node's
	 * streams and `hashRandom`, and its streams no longer follow its key.
	 */
	readonly seed?: number;
	/**
	 * Source locations (MANIFESTO §10.1): the site of the call that made the
	 * node, and of the literal each input or config entry was bound from, in
	 * the eval's location tables. Metadata for the editor; the engine ignores it.
	 */
	readonly site?: number;
	readonly bindingSites?: Readonly<Record<string, number>>;
}

export interface Program {
	/** Topologically ordered with z-edges cut. */
	readonly nodes: readonly PNode[];
	/** Indices of `out` nodes; engine sums their `l`/`r` outputs. */
	readonly outs: readonly number[];
	readonly seed: number;
	/** Patch-defined module specs used by `nodes` (defmod). Present only when non-empty. */
	readonly specs?: readonly SerializedModuleSpec[];
	/** The live slots PortSrc "s" entries read, by index (runtime/live). Present only when non-empty. */
	readonly liveSlots?: readonly SlotDecl[];
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
	/** [site, value] of each live slot, in slot order; absent with none. A swap carries a value by site. */
	readonly liveSlots?: readonly (readonly [number, number])[];
}

export interface Engine {
	/** Advance one sample; write [l, r] into out. Allocates nothing. */
	tick(out: Float32Array): void;
	/** Advance `n` samples; write l/r into outL/outR from `offset`. Allocates nothing. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void;
	collectState(): EngineState;
	readonly sampleCount: number;
}

export type EngineCtor = (
	program: Program,
	sampleRate: number,
	registry: Registry,
	prev?: EngineState,
) => Engine;
