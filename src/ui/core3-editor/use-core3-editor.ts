/**
 * Core3 editor controller: owns the code, playing state, the seed shown, and
 * the verbatim eval/compile error. `run` evaluates the patch under the play
 * session's seed (a patch's own seed(n) wins) and hands the Program to the
 * audio host — re-running while playing is a crossfade swap in the worklet,
 * not a restart. `reroll` draws a new session seed and re-runs. `stop`
 * silences and ends the session, so the next play draws a fresh seed. Errors
 * are the language's loud errors, surfaced unmodified behind the line and
 * column they point at. (The graph renders
 * from the code itself via PatchGraph in the embed, so no compiled Program is
 * held here.)
 *
 * Controls show as soon as the code is in the editor, not only once playing:
 * a debounced, silent, audio-free `evaluatePatch` (no `play`) runs on mount
 * and after each edit, and its Program's `liveSlots` feed the control widgets
 * while stopped. An eval error here is swallowed — the last good widget set
 * just stays put until the code compiles again.
 */

import { play, playSeed, stop } from "@/core3/runtime/audio";
import type { SlotDecl } from "@/core3/runtime/live/live-contract";
import { EMPTY_SOURCE_MAP, type SourceMap } from "@/core3/source/source-map";
import { evaluatePatch } from "@/ui/core3-playground/eval-patch";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "./error-text";
import { DEFAULT_EXAMPLE } from "./examples";
import type { ShownSeed } from "./seed-bar";
import { codeFromUrl } from "./share-url";

/** Debounce for the silent preview eval that keeps widgets live while stopped. */
const PREVIEW_DEBOUNCE_MS = 300;

interface Core3EditorState {
	code: string;
	setCode: (code: string) => void;
	error: string | null;
	isPlaying: boolean;
	seed: ShownSeed | null;
	/** The last successful eval's location tables (source/source-map.ts), for the live display's pattern highlight. */
	sourceMap: SourceMap;
	/** The last successful eval's live slots — while playing, the playing program's; while stopped, the silent preview eval's. */
	liveSlots: readonly SlotDecl[];
	run: () => Promise<void>;
	reroll: () => Promise<void>;
	halt: () => void;
	/** Turns a number literal's site into a live slot: re-evaluates with it added to slotSites, no restart (a swap). A no-op while stopped. */
	ensureSlotSite: (site: number) => Promise<void>;
}

export function useCore3Editor(): Core3EditorState {
	const [code, setCode] = useState(() => codeFromUrl() ?? DEFAULT_EXAMPLE);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [seed, setSeed] = useState<ShownSeed | null>(null);
	const [sourceMap, setSourceMap] = useState<SourceMap>(EMPTY_SOURCE_MAP);
	const [liveSlots, setLiveSlots] = useState<readonly SlotDecl[]>([]);
	/** Sites dragged into slots this play session; an ordinary run()/reroll() clears it so a literal bakes again. */
	const slotSitesRef = useRef<Set<number>>(new Set());
	const codeRef = useRef(code);
	codeRef.current = code;
	const isPlayingRef = useRef(isPlaying);
	isPlayingRef.current = isPlaying;

	const evalAndPlay = useCallback(async (slotSites: ReadonlySet<number>) => {
		const { program, seedPinned, sourceMap: evaluated } = evaluatePatch(codeRef.current, {
			seed: playSeed.current(),
			slotSites,
		});
		setError(null);
		setSourceMap(evaluated);
		setLiveSlots(program.liveSlots ?? []);
		await play(program);
		setSeed({ value: program.seed, pinned: seedPinned });
		setIsPlaying(true);
	}, []);

	const previewEval = useCallback((source: string) => {
		try {
			const { program, sourceMap: evaluated } = evaluatePatch(source, { seed: playSeed.current() });
			setSourceMap(evaluated);
			setLiveSlots(program.liveSlots ?? []);
		} catch {
			// Keep the last good widget set; a mid-edit parse/compile error is expected.
		}
	}, []);

	// Silent preview: while stopped, a no-audio eval keeps the control
	// widgets live from the code alone. The first eval
	// (mount, or coming back from playing) runs right away so widgets show
	// with no click/focus needed; later edits debounce. While playing, the
	// playing program (evalAndPlay above) is the source of truth instead, so
	// this effect does nothing.
	const hasPreviewedRef = useRef(false);
	useEffect(() => {
		if (isPlaying) return;
		if (!hasPreviewedRef.current) {
			hasPreviewedRef.current = true;
			previewEval(code);
			return;
		}
		const timer = setTimeout(() => previewEval(code), PREVIEW_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [code, isPlaying, previewEval]);

	// Playing just stopped: the next preview eval should run immediately again.
	useEffect(() => {
		if (isPlaying) hasPreviewedRef.current = false;
	}, [isPlaying]);

	const run = useCallback(async () => {
		slotSitesRef.current = new Set();
		try {
			await evalAndPlay(slotSitesRef.current);
		} catch (err) {
			setError(errorText(err, codeRef.current));
		}
	}, [evalAndPlay]);

	const reroll = useCallback(async () => {
		playSeed.reroll();
		await run();
	}, [run]);

	const halt = useCallback(() => {
		stop();
		setIsPlaying(false);
	}, []);

	const ensureSlotSite = useCallback(
		async (site: number) => {
			if (!isPlayingRef.current || slotSitesRef.current.has(site)) return;
			slotSitesRef.current.add(site);
			try {
				await evalAndPlay(slotSitesRef.current);
			} catch (err) {
				slotSitesRef.current.delete(site);
				setError(errorText(err, codeRef.current));
			}
		},
		[evalAndPlay],
	);

	return {
		code,
		setCode,
		error,
		isPlaying,
		seed,
		sourceMap,
		liveSlots,
		run,
		reroll,
		halt,
		ensureSlotSite,
	};
}
