/**
 * Executes one generated driver's build steps (driver-steps.ts). A unit step
 * compiles the unit and calls its factory twice: over the engine's values
 * and over the shadow twin's (binding paths resolved in each). The two
 * functions share V8's type feedback and optimized code, so a warm step,
 * which runs the shadow function on the twin's state, warms the real one
 * without touching the engine. Each instance has its own block buffer; the
 * helpers unit has one instance for both, since it binds nothing.
 *
 * A host that forbids `new Function` (a CSP without 'unsafe-eval' throws
 * EvalError) blocks the build, with a loud log; the engine then runs the
 * interpreter. Any other compile error is a generator bug and propagates.
 */

import { type BindingPath, type PathExtras, resolvePath } from "../codegen/binding-path";
import { type CodeUnit, type UnitFactory, compileUnit } from "../codegen/code-unit";
import type { DriverCode } from "../codegen/emit-grouped-code";
import { BLOCK_MAX } from "../codegen/group/block-slots";
import { type GroupFn, type TapsFn, groupedDriver } from "../codegen/grouped-driver";
import type { Driver, ValueBuffers } from "../driver";
import type { NodeRun } from "../node-run";
import type { DriverStep } from "./driver-steps";

/** The values a driver instance binds: node runs and value buffers. */
export interface DriverTarget {
	readonly runs: readonly NodeRun[];
	readonly bufs: ValueBuffers;
}

interface Instance {
	readonly fns: unknown[];
	readonly extras: { block: Float64Array; helpers: readonly unknown[] };
}

export class DriverBuild {
	private readonly real: Instance;
	private readonly shadow: Instance;
	private readonly scratchL = new Float32Array(BLOCK_MAX);
	private readonly scratchR = new Float32Array(BLOCK_MAX);
	private shadowCount = 0;
	private isBlocked = false;

	constructor(
		private readonly code: DriverCode,
		private readonly engine: DriverTarget,
		private readonly twin: DriverTarget,
		private readonly sampleRate: number,
		private readonly compile: (unit: CodeUnit) => UnitFactory = compileUnit,
	) {
		this.real = instance(code);
		this.shadow = instance(code);
	}

	/** True once `new Function` was refused: the engine falls back to the interpreter. */
	get blocked(): boolean {
		return this.isBlocked;
	}

	execute(step: DriverStep): void {
		if (this.isBlocked) return;
		if (step.k === "unit") this.compileStep(step.unit);
		else this.warmStep(step.unit, step.samples);
	}

	/** The real driver, once every unit step has run. */
	driver(): Driver {
		const fns = this.real.fns;
		const groups = this.code.groups.map((name) => fns[this.unitIndex(name)] as GroupFn);
		return groupedDriver(groups, fns[this.unitIndex(this.code.taps)] as TapsFn);
	}

	private compileStep(index: number): void {
		const unit = this.code.units[index] as CodeUnit;
		const factory = this.compileOrBlock(unit);
		if (factory === null) return;
		if (unit.name === this.code.helpers) {
			const helpers = factory() as unknown[];
			this.real.fns[index] = this.shadow.fns[index] = helpers;
			this.real.extras.helpers = this.shadow.extras.helpers = helpers;
			return;
		}
		this.real.fns[index] = factory(...this.args(unit, this.engine, this.real));
		this.shadow.fns[index] = factory(...this.args(unit, this.twin, this.shadow));
	}

	private warmStep(index: number, samples: number): void {
		const fn = this.shadow.fns[index];
		if ((this.code.units[index] as CodeUnit).name !== this.code.taps) {
			(fn as GroupFn)(this.twin.bufs, samples, this.shadowCount, this.sampleRate);
			return;
		}
		(fn as TapsFn)(this.scratchL, this.scratchR, 0, samples);
		this.shadowCount += samples;
	}

	private args(unit: CodeUnit, target: DriverTarget, inst: Instance): unknown[] {
		const extras: PathExtras = inst.extras;
		return unit.params.map((name) => resolvePath(this.path(name), target.runs, extras));
	}

	private path(name: string): BindingPath {
		const path = this.code.paths[name];
		if (path === undefined)
			throw new Error(`codegen: unit parameter '${name}' has no binding path`);
		return path;
	}

	private unitIndex(name: string): number {
		return this.code.units.findIndex((u) => u.name === name);
	}

	private compileOrBlock(unit: CodeUnit): UnitFactory | null {
		try {
			return this.compile(unit);
		} catch (err) {
			if (!(err instanceof EvalError)) throw err;
			console.error(`[core3] codegen blocked, falling back to the interpreter: ${String(err)}`);
			this.isBlocked = true;
			return null;
		}
	}
}

function instance(code: DriverCode): Instance {
	return { fns: [], extras: { block: new Float64Array(blockLength(code)), helpers: [] } };
}

function blockLength(code: DriverCode): number {
	for (const path of Object.values(code.paths)) if (path.k === "block") return path.length;
	return 0;
}
