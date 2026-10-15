/**
 * A program on the JS engine (host-program.ts): built in costed steps
 * (build/engine-build.ts), the carry planned against the running JS
 * engine's live state; the swap makes the engine and hands it over
 * (live-engine.ts `handOver`), then lets go of the build and the source.
 */

import type { Registry } from "../../types";
import { EngineBuild } from "../build/engine-build";
import { LiveEngine } from "../live-engine";
import type { PreparedProgram } from "../prepare/prepare-program";
import type { HostProgram } from "./host-program";

export class JsHostProgram implements HostProgram {
	private build: EngineBuild | null;
	private source: LiveEngine | null;
	private engine: LiveEngine | null = null;

	constructor(
		readonly prepared: PreparedProgram,
		registry: Registry,
		source: HostProgram | null,
	) {
		this.source = prepared.continues && source instanceof JsHostProgram ? source.engine : null;
		this.build = new EngineBuild(prepared, registry, this.source?.liveState());
	}

	get built(): boolean {
		return this.build?.done ?? true;
	}

	advance(budget: number): void {
		this.build?.advance(budget);
	}

	swapIn(): void {
		const next = new LiveEngine((this.build as EngineBuild).parts());
		if (this.source !== null) next.handOver(this.source.liveState());
		this.engine = next;
		this.build = null;
		this.source = null;
	}

	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		(this.engine as LiveEngine).renderBlock(outL, outR, offset, n);
	}
}
