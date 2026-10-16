/**
 * Collects a template's palette while parsing. Spliced signals (and spliced
 * sub-pattern palettes) register immediately and PIN their leaf object, so
 * `finalize()`'s rewrite leaves them untouched; every other `pure` leaf
 * (plain literal atoms, written anywhere in the template) is a number that
 * `finalize()` registers on its way past, deduped by value.
 *
 * `finalize(pat)` returns the original `pat` untouched when no signal was
 * ever spliced — a template with no signal must come back exactly as
 * before — else the rewritten pat plus the collected palette.
 */

import type { Pat } from "../ast";
import { mapPureLeaves } from "../palette/map-pure-leaves";
import type { PaletteSignal } from "../palette/palette-signal";
import { isSignalMember } from "../palette/palette-signal";

export class PaletteCollector {
	private readonly members: PaletteSignal[] = [];
	private readonly numberIndex = new Map<number, number>();
	private readonly pinned = new Set<Pat>();
	private sawSignal = false;

	/** A spliced signal occurrence: never deduped. Returns its pinned index leaf. */
	addSignal(signal: PaletteSignal, site: number | undefined): Pat {
		this.sawSignal = true;
		const leaf: Pat = { op: "pure", value: this.members.length, ...(site !== undefined ? { site } : {}) };
		this.pinned.add(leaf);
		this.members.push(signal);
		return leaf;
	}

	/**
	 * A spliced palette P: absorbs its members after this one's, and shifts
	 * its ast's indices to match — pinning every shifted leaf so finalize()
	 * leaves them alone.
	 */
	absorbPattern(pat: Pat, members: readonly PaletteSignal[]): Pat {
		const offset = this.members.length;
		for (const member of members) {
			if (isSignalMember(member)) this.sawSignal = true;
			this.members.push(member);
		}
		return mapPureLeaves(pat, (leaf) => {
			const shifted = { ...leaf, value: leaf.value + offset };
			this.pinned.add(shifted);
			return shifted;
		});
	}

	private addNumber(value: number): number {
		const found = this.numberIndex.get(value);
		if (found !== undefined) return found;
		const index = this.members.length;
		this.members.push(value);
		this.numberIndex.set(value, index);
		return index;
	}

	/** Rewrite every un-pinned `pure` leaf to its (deduped) palette index; pinned leaves keep the index they were given. */
	finalize(pat: Pat): { readonly pat: Pat; readonly palette?: readonly PaletteSignal[] } {
		if (!this.sawSignal) return { pat };
		const rewritten = this.rewrite(pat);
		return { pat: rewritten, palette: this.members };
	}

	private rewrite(pat: Pat): Pat {
		return mapPureLeaves(pat, (leaf) =>
			this.pinned.has(leaf) ? leaf : { ...leaf, value: this.addNumber(leaf.value) },
		);
	}
}
