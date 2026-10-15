/**
 * Builds an engine from a prepared program, one step at a time
 * (build-steps.ts), so the worklet can spread the build over blocks while
 * the old engine plays (MANIFESTO §8). The steps:
 *
 * - specs: hydrate the patch's specs over the base registry;
 * - layout: the output layout, value buffers and feedback start values;
 * - node: fresh lane states and the node's run;
 * - carry: for a node paired with an old one, which lanes carry from the
 *   source engine (hand-over/carry-states.ts); their values are copied now,
 *   to map the engine's pages, then again at the swap;
 * - assemble: the interpreter's driver and the engine's parts.
 *
 * The offline engine (engine.ts) runs every step at once. The worklet's
 * WASM program runs them with no source, for the start values it writes
 * into memory (worklet/wasm-host-program.ts).
 */

import type { EngineState, KeyedIdentity, ModuleSpec, PNode, Registry } from "../../types";
import type { DriverPlan, ValueBuffers } from "../driver";
import type { EngineParts } from "../engine-parts";
import { type FeedbackRead, feedbackReads, restoreFeedback } from "../feedback";
import { freshNodeStates } from "../fresh-node-states";
import { type CarryPair, applyCarry, planCarry } from "../hand-over/carry-states";
import { withProgramSpecs } from "../hydrate-specs";
import { interpretBlock } from "../interpret-block";
import type { NodeRun } from "../node-run";
import { type OutputLayout, buildOutputLayout, slotOf } from "../output-slots";
import type { PreparedProgram } from "../prepare/prepare-program";
import { buildRun } from "./build-run";
import { type BuildStep, buildSteps } from "./build-steps";
import { StepRunner } from "./step-runner";

interface Layout {
	readonly layout: OutputLayout;
	readonly feedback: readonly FeedbackRead[];
	readonly plan: DriverPlan;
	readonly bufs: ValueBuffers;
}

export class EngineBuild {
	private readonly runner: StepRunner<BuildStep>;
	private readonly runs: NodeRun[] = [];
	private readonly carry: CarryPair[] = [];
	private readonly paired: ReadonlyMap<number, string>;
	private layered: Registry | null = null;
	private specs: readonly ModuleSpec[] = [];
	private laid: Layout | null = null;
	private built: EngineParts | null = null;

	/** `source`: the state the engine will continue at the swap; its lanes are live objects. */
	constructor(
		readonly prepared: PreparedProgram,
		private readonly registry: Registry,
		private readonly source: EngineState | undefined,
	) {
		this.paired = new Map(prepared.paired);
		this.runner = new StepRunner(buildSteps(prepared, source !== undefined), (step) =>
			this.execute(step),
		);
	}

	get done(): boolean {
		return this.runner.done;
	}

	/** Run build steps within `budget` (estimated microseconds); true when the engine is built. */
	advance(budget: number): boolean {
		return this.runner.advance(budget);
	}

	finish(): EngineParts {
		this.runner.finish();
		return this.parts();
	}

	/** The built engine's parts; only once `done`. */
	parts(): EngineParts {
		if (this.built === null) throw new Error("engine build: not done");
		return this.built;
	}

	private execute(step: BuildStep): void {
		if (step.k === "specs") this.hydrateSpecs();
		else if (step.k === "layout") this.layOut();
		else if (step.k === "node") this.buildNode(step.node);
		else if (step.k === "carry") this.planNodeCarry(step.node);
		else this.assemble();
	}

	private hydrateSpecs(): void {
		this.layered = withProgramSpecs(this.registry, this.prepared.program);
	}

	private layOut(): void {
		const { program, sampleRate } = this.prepared;
		const registry = this.layered as Registry;
		const layout = buildOutputLayout(program.nodes, registry);
		this.specs = program.nodes.map((n) => registry.get(n.module) as ModuleSpec);
		const feedback = feedbackReads(program.nodes);
		const bufs: ValueBuffers = {
			cur: new Float64Array(layout.size),
			prv: new Float64Array(layout.size),
		};
		restoreFeedback(feedback, new Map(), layout, sampleRate, undefined, bufs.cur);
		const taps = (port: string) => Int32Array.from(program.outs, (n) => slotOf(layout, n, port, 0));
		this.laid = {
			layout,
			feedback,
			bufs,
			plan: { runs: this.runs, tapsL: taps("l"), tapsR: taps("r") },
		};
	}

	private buildNode(i: number): void {
		const { program, sampleRate, identities } = this.prepared;
		const node = program.nodes[i] as PNode;
		const spec = this.specs[i] as ModuleSpec;
		const key = (identities[i] as KeyedIdentity).key;
		const states = freshNodeStates(node, spec, sampleRate, program.seed, key);
		this.runs[i] = buildRun(node, i, spec, (this.laid as Layout).layout, states);
	}

	private planNodeCarry(i: number): void {
		const { source } = this;
		if (source === undefined || source.sampleRate !== this.prepared.sampleRate) return;
		const old = source.nodes[this.paired.get(i) as string];
		const pairs = planCarry((this.runs[i] as NodeRun).states, old);
		applyCarry(pairs);
		this.carry.push(...pairs);
	}

	private assemble(): void {
		const { layout, feedback, plan, bufs } = this.laid as Layout;
		const { prepared } = this;
		this.built = {
			sampleRate: prepared.sampleRate,
			identities: prepared.identities,
			paired: this.paired,
			carry: this.carry,
			layout,
			feedback,
			runs: this.runs,
			bufs,
			driver: interpretBlock(plan),
		};
	}
}
