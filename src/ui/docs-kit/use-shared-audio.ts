/**
 * One shared audio host for the whole page. Run compiles the card's patch and
 * swaps it into the single worklet via core3's `play()` (which crossfades);
 * a second Run on a different card simply swaps again — no per-card contexts.
 * Compile/eval errors are the language's loud errors, surfaced per card.
 *
 * The playing card's `sourceMap`/`liveSlots` are exposed so its CodeBlock can
 * drive the same live-feedback extensions (pattern highlight, number drag,
 * control widgets) as the main editor (use-editor.ts) — `ensureSlotSite`
 * mirrors that hook's, minus seed-session/reroll, which docs examples don't need.
 */

import type { SlotDecl } from "@/engine/runtime/live/live-contract";
import { play, stop } from "@/engine/runtime/audio";
import { EMPTY_SOURCE_MAP, type SourceMap } from "@/engine/source/source-map";
import { evaluatePatch } from "@/engine/eval-patch";
import { useCallback, useRef, useState } from "react";

export interface SharedAudio {
	/** id of the card currently sounding, or null. */
	readonly playingId: string | null;
	/** id -> error message from the last failed Run. */
	readonly errors: Readonly<Record<string, string>>;
	/** The playing card's last successful eval's location tables, for its live-feedback extensions. */
	readonly sourceMap: SourceMap;
	/** The playing card's live slots, for its control widgets. */
	readonly liveSlots: readonly SlotDecl[];
	run(id: string, code: string): void;
	halt(): void;
	/** Turns a dragged number literal's site into a live slot (a re-eval with it added), for the playing card. */
	ensureSlotSite(site: number): Promise<void>;
}

export function useSharedAudio(): SharedAudio {
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [sourceMap, setSourceMap] = useState<SourceMap>(EMPTY_SOURCE_MAP);
	const [liveSlots, setLiveSlots] = useState<readonly SlotDecl[]>([]);
	const codeRef = useRef("");
	/** Sites dragged into slots this play session; a fresh run() clears it so a literal bakes again. */
	const slotSitesRef = useRef<Set<number>>(new Set());

	const evalAndPlay = useCallback(async (id: string, code: string, slotSites: ReadonlySet<number>) => {
		const { program, sourceMap: evaluated } = evaluatePatch(code, { slotSites });
		setSourceMap(evaluated);
		setLiveSlots(program.liveSlots ?? []);
		await play(program);
		setErrors((prev) => clearKey(prev, id));
		setPlayingId(id);
	}, []);

	const run = useCallback(
		(id: string, code: string) => {
			codeRef.current = code;
			slotSitesRef.current = new Set();
			void evalAndPlay(id, code, slotSitesRef.current).catch((err) => {
				setErrors((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : String(err) }));
			});
		},
		[evalAndPlay],
	);

	const halt = useCallback(() => {
		stop();
		setPlayingId(null);
		setSourceMap(EMPTY_SOURCE_MAP);
		setLiveSlots([]);
	}, []);

	const ensureSlotSite = useCallback(
		async (site: number) => {
			if (playingId === null || slotSitesRef.current.has(site)) return;
			slotSitesRef.current.add(site);
			try {
				await evalAndPlay(playingId, codeRef.current, slotSitesRef.current);
			} catch (err) {
				slotSitesRef.current.delete(site);
				setErrors((prev) => ({
					...prev,
					[playingId]: err instanceof Error ? err.message : String(err),
				}));
			}
		},
		[playingId, evalAndPlay],
	);

	return { playingId, errors, sourceMap, liveSlots, run, halt, ensureSlotSite };
}

function clearKey(map: Record<string, string>, key: string): Record<string, string> {
	if (!(key in map)) return map;
	const next = { ...map };
	delete next[key];
	return next;
}
