/**
 * The live editor page: the standard code embed (Examples tab left, playback
 * and graph tabs right) over the editor controller, with the loud error strip
 * below, inside the shared site shell.
 */

import { SitePage } from "@/ui/site/site-page";
import { EditorEmbed } from "./editor-embed";
import { ErrorStrip } from "./error-strip";
import { useCore3Editor } from "./use-core3-editor";

export function EditorApp() {
	const { code, setCode, error, isPlaying, run, halt } = useCore3Editor();

	return (
		<SitePage current="editor" onStopAll={halt}>
			<EditorEmbed
				code={code}
				onChange={setCode}
				isPlaying={isPlaying}
				onRun={() => void run()}
				onStop={halt}
			/>
			<ErrorStrip error={error} />
		</SitePage>
	);
}
