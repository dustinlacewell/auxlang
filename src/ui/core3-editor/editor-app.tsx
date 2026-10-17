/**
 * The live editor page: a patch-list sidebar (desktop column / mobile
 * drawer) beside the standard code embed, over the editor controller, with
 * the seed and the loud error strip below, inside the shared site shell.
 */

import { SitePage } from "@/ui/site/site-page";
import { useState } from "react";
import { EditorEmbed } from "./editor-embed";
import { ErrorStrip } from "./error-strip";
import { DEFAULT_EXAMPLE, EXAMPLES } from "./examples";
import { type OpenPatch, PatchSidebar } from "./patch-sidebar";
import { SeedBar } from "./seed-bar";
import type { SavedPatch } from "./storage/saved-patches";
import { useDebouncedAutosave } from "./storage/use-debounced-autosave";
import { useSavedPatches } from "./storage/use-saved-patches";
import { useCore3Editor } from "./use-core3-editor";

export function EditorApp() {
	const {
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
	} = useCore3Editor();

	const { patches, createUntitled, updateSource, rename, remove } = useSavedPatches();
	const [current, setCurrent] = useState<OpenPatch | null>(() => {
		const example = EXAMPLES.find((ex) => ex.source === DEFAULT_EXAMPLE);
		return example ? { kind: "example", name: example.name } : null;
	});
	const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const loadCode = (source: string, opened: OpenPatch) => {
		if (isPlaying) halt();
		setCode(source);
		setCurrent(opened);
		setDrawerOpen(false);
	};

	const handlePickExample = (name: string) => {
		const example = EXAMPLES.find((ex) => ex.name === name);
		if (example) loadCode(example.source, { kind: "example", name });
	};

	const handlePickSaved = (patch: SavedPatch) => {
		loadCode(patch.source, { kind: "saved", id: patch.id });
	};

	const handleSaveAsNew = () => {
		const patch = createUntitled(code);
		setCurrent({ kind: "saved", id: patch.id });
		setJustCreatedId(patch.id);
	};

	const handleRemove = (id: string) => {
		remove(id);
		if (current?.kind === "saved" && current.id === id) setCurrent(null);
	};

	useDebouncedAutosave(current?.kind === "saved" ? current.id : null, code, updateSource);

	return (
		<SitePage current="editor" onStopAll={halt}>
			<div className="flex gap-3">
				<PatchSidebar
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
					current={current}
					savedPatches={patches}
					justCreatedId={justCreatedId}
					onPickExample={handlePickExample}
					onPickSaved={handlePickSaved}
					onSaveAsNew={handleSaveAsNew}
					onRename={(id, name) => {
						rename(id, name);
						setJustCreatedId(null);
					}}
					onRemove={handleRemove}
				/>
				<div className="flex-1 min-w-0">
					<EditorEmbed
						code={code}
						onChange={setCode}
						isPlaying={isPlaying}
						sourceMap={sourceMap}
						liveSlots={liveSlots}
						ensureSlotSite={ensureSlotSite}
						onRun={() => void run()}
						onStop={halt}
						onOpenPatches={() => setDrawerOpen(true)}
					/>
					<SeedBar seed={seed} isPlaying={isPlaying} onReroll={() => void reroll()} />
					<ErrorStrip error={error} />
				</div>
			</div>
		</SitePage>
	);
}
