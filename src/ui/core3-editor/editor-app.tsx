/**
 * The live editor page: the standard code embed (Examples tab left, playback
 * and graph tabs right) over the editor controller, with the seed and the
 * loud error strip below, inside the shared site shell.
 */

import { SitePage } from "@/ui/site/site-page";
import { EditorEmbed } from "./editor-embed";
import { ErrorStrip } from "./error-strip";
import { SeedBar } from "./seed-bar";
import { useCore3Editor } from "./use-core3-editor";

export function EditorApp() {
	const { code, setCode, error, isPlaying, seed, sourceMap, run, reroll, halt, ensureSlotSite } =
		useCore3Editor();

	return (
		<SitePage current="editor" onStopAll={halt}>
			<EditorEmbed
				code={code}
				onChange={setCode}
				isPlaying={isPlaying}
				sourceMap={sourceMap}
				ensureSlotSite={ensureSlotSite}
				onRun={() => void run()}
				onStop={halt}
			/>
			<SeedBar seed={seed} isPlaying={isPlaying} onReroll={() => void reroll()} />
			<ErrorStrip error={error} />
		</SitePage>
	);
}
