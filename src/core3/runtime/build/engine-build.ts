/**
 * Builds an engine from a prepared program, one step at a time
 * (build-steps.ts), so the worklet can spread the build over blocks while
 * the old engine plays (MANIFESTO §8). The steps:
 *
 * - specs: hydrate the patch's specs over the base registry;
 * - layout: the output layout, value buffers and feedback start values;
 * - node: fresh lane states and the node's run;
 * - carry: for a node paired with an old one, which lanes carry from the
 *   source engine (hand-over/carry-states.ts); their values are copied now
 *   into the twin, and into the engine to map its pages, then again into the
 *   engine at the swap;
 * - unit, warm: the primary driver's units, compiled and warmed on the
 *   shadow twin (driver-build.ts);
 * - assemble: the driver (the generated one, the interpreter when codegen is
 *   off or blocked, wrapped in the tier-up driver with phase 2) and the
 *   engine's parts.
 *
 * A generated engine copies each of its values through one cloner, and the
 * twin copies those through another (shadow-clone.ts): code warmed on the
 * twin then fits the engine's values. The twin shares each lane's scratch
 * (derived data, such as seq's event table): warming from the carried state
 * fills it for where the engine will be at the swap.
 */

import type { EngineState, KeyedIdentity, ModuleSpec, PNode, Registry } from "../../types";
import type { Driver, DriverPlan, ValueBuffers } from "../driver";
import type { EngineParts } from "../engine-parts";
import { type FeedbackRead, feedbackReads, restoreFeedback } from "../feedback";
import { freshNodeStates } from "../fresh-node-states";
import { type CarryPair, applyCarry, planCarry } from "../hand-over/carry-states";
import { withProgramSpecs } from "../hydrate-specs";
import { interpretBlock } from "../interpret-block";
import type { NodeRun } from "../node-run";
import { type OutputLayout, buildOutputLayout, slotOf } from "../output-slots";
import type { PreparedProgram } from "../prepare/prepare-program";
import { tierDriver } from "../tier/tier-driver";
import { buildRun } from "./build-run";
import { type BuildStep, buildSteps } from "./build-steps";
import { DriverBuild, type DriverTarget } from "./driver-build";
import { driverSteps } from "./driver-steps";
import { shadowCloner } from "./shadow-clone";
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
	private readonly twin = { runs: [] as NodeRun[], bufs: null as ValueBuffers | null };
	private readonly scratch = new WeakSet<object>();
	private readonly own = shadowCloner();
	private readonly shadow = shadowCloner((value) => this.scratch.has(value));
	private readonly carry: CarryPair[] = [];
	private readonly paired: ReadonlyMap<number, string>;
	private layered: Registry | null = null;
	private specs: readonly ModuleSpec[] = [];
	private laid: Layout | null = null;
	private primary: DriverBuild | null = null;
	private built: EngineParts | null = null;

	/** `source`: the state the engine will continue at the swap; its lanes are live objects. */
	constructor(
		readonly prepared: PreparedProgram,
		private readonly registry: Registry,
		private readonly source: EngineState | undefined,
	) {
		this.paired = new Map(prepared.paired);
		this.runner = new StepRunner(buildSteps(prepared), (step) => this.execute(step));
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

	private get generated(): boolean {
		return this.prepared.primary !== null;
	}

	private execute(step: BuildStep): void {
		if (step.k === "specs") this.hydrateSpecs();
		else if (step.k === "layout") this.layOut();
		else if (step.k === "node") this.buildNode(step.node);
		else if (step.k === "carry") this.planNodeCarry(step.node);
		else if (step.k === "unit" || step.k === "warm") (this.primary as DriverBuild).execute(step);
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
		const fresh: ValueBuffers = {
			cur: new Float64Array(layout.size),
			prv: new Float64Array(layout.size),
		};
		restoreFeedback(feedback, new Map(), layout, sampleRate, undefined, fresh.cur);
		const bufs = this.generated ? (this.own(fresh) as ValueBuffers) : fresh;
		const taps = (port: string) => Int32Array.from(program.outs, (n) => slotOf(layout, n, port, 0));
		this.laid = {
			layout,
			feedback,
			bufs,
			plan: { runs: this.runs, tapsL: taps("l"), tapsR: taps("r") },
		};
		if (this.prepared.primary === null) return;
		this.twin.bufs = this.shadow(bufs) as ValueBuffers;
		this.primary = this.driverBuild(this.prepared.primary);
	}

	private buildNode(i: number): void {
		const { program, sampleRate, identities } = this.prepared;
		const node = program.nodes[i] as PNode;
		const spec = this.specs[i] as ModuleSpec;
		const key = (identities[i] as KeyedIdentity).key;
		const states = freshNodeStates(node, spec, sampleRate, program.seed, key);
		const run = buildRun(node, i, spec, (this.laid as Layout).layout, states);
		if (!this.generated) {
			this.runs[i] = run;
			return;
		}
		const own = this.own(run) as NodeRun;
		for (const state of own.states) this.scratch.add(state.__scratch as object);
		this.runs[i] = own;
		this.twin.runs[i] = this.shadow(own) as NodeRun;
	}

	private planNodeCarry(i: number): void {
		const { source } = this;
		if (source === undefined || source.sampleRate !== this.prepared.sampleRate) return;
		const old = source.nodes[this.paired.get(i) as string];
		const pairs = planCarry((this.runs[i] as NodeRun).states, old);
		applyCarry(pairs);
		this.carry.push(...pairs);
		if (this.generated) applyCarry(planCarry((this.twin.runs[i] as NodeRun).states, old));
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
			driver: this.driver(plan),
		};
	}

	/** The generated driver, tiering up when asked; the interpreter when codegen is off or blocked. */
	private driver(plan: DriverPlan): Driver {
		const primary = this.primary;
		if (primary === null || primary.blocked) return interpretBlock(plan);
		const tier = this.prepared.tier;
		if (tier === null) return primary.driver();
		const config = this.prepared.tierConfig;
		const phase2 = this.driverBuild(tier);
		const runner = new StepRunner(driverSteps(tier, config.rounds), (step) => phase2.execute(step));
		return tierDriver(
			primary.driver(),
			{ advance: (budget) => runner.advance(budget), driver: () => phase2.driver() },
			config,
		);
	}

	private driverBuild(code: NonNullable<PreparedProgram["primary"]>): DriverBuild {
		const engine: DriverTarget = { runs: this.runs, bufs: (this.laid as Layout).bufs };
		const twin: DriverTarget = { runs: this.twin.runs, bufs: this.twin.bufs as ValueBuffers };
		return new DriverBuild(code, engine, twin, this.prepared.sampleRate);
	}
}
