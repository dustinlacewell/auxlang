/**
 * Pastes a node the planner chose. It pastes
 * when its module has checked source text (every module but the exempt
 * bridge ones), no other lane shares its state objects, and its tick and
 * helpers print (anything the printer refuses keeps the node at its call
 * site, with every scope binding the attempt made rolled back). Helpers
 * paste once per module into the driver's shared code (driver-scope.ts).
 */

import { hashRandom } from "../../../random/hash-random";
import type { ModuleSource } from "../../../types";
import type { NodeRun } from "../../node-run";
import type { DriverScope } from "../driver-scope";
import type { NameTable } from "../name-table";
import type { NodeCode } from "../node-code";
import type { SlotAccess } from "../slot-access";
import { type PasteEnv, type PasteTick, emitPastedNode } from "./emit-pasted-node";
import { functionNames } from "./function-names";
import { NotPasteable } from "./not-pasteable";
import type { ParseCache } from "./parse-cache";
import { type PastedHelpers, pasteHelpers } from "./paste-helpers";
import { sharedStates } from "./shared-states";

export class Paster {
	private readonly helpers = new Map<string, PastedHelpers | NotPasteable>();
	private readonly helperLines: string[] = [];
	private readonly shared: ReadonlySet<object>;
	private readonly env: PasteEnv;

	constructor(
		runs: readonly NodeRun[],
		scope: DriverScope,
		private readonly trees: ParseCache,
		private readonly names: NameTable,
	) {
		this.shared = sharedStates(runs);
		this.env = { names: this.names, scope, hashRandom: scope.bind(this.names.fresh(), hashRandom) };
	}

	/** The node pasted inline, or null when it keeps its call site. */
	paste(run: NodeRun, i: number, slots: SlotAccess): NodeCode | null {
		if (run.source === undefined) return null;
		if (run.states.some((s) => this.shared.has(s))) return null;
		const mark = this.env.scope.mark();
		try {
			return emitPastedNode(run, i, this.tickOf(run.source), this.env, slots);
		} catch (err) {
			if (!(err instanceof NotPasteable)) throw err;
			this.env.scope.rollback(mark);
			return null;
		}
	}

	/** The pasted helper functions. They use no bound value, so every driver instance shares them. */
	helperSource(): string {
		return this.helperLines.join("\n");
	}

	private tickOf(source: ModuleSource): PasteTick {
		const helpers = this.helpersOf(source.helpers);
		const fn = this.trees.parse(source.tick);
		return {
			fn,
			declared: functionNames(fn, new Set(helpers.names.keys())),
			helpers: helpers.names,
		};
	}

	/** Each distinct helper set pastes once; a set that cannot paste is remembered as such. */
	private helpersOf(helpers: Readonly<Record<string, string>>): PastedHelpers {
		const key = JSON.stringify(helpers);
		let pasted = this.helpers.get(key);
		if (pasted === undefined) {
			try {
				pasted = pasteHelpers(helpers, this.names, this.trees);
				this.helperLines.push(...pasted.lines);
			} catch (err) {
				if (!(err instanceof NotPasteable)) throw err;
				pasted = err;
			}
			this.helpers.set(key, pasted);
		}
		if (pasted instanceof NotPasteable) throw pasted;
		return pasted;
	}
}
