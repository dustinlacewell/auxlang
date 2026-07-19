/**
 * A runnable patch outside the card grid: the code block (whose tab buttons
 * carry playback and graph toggles) with the loud error below. The landing
 * hello patch and every guide example use it, all over one page-level
 * SharedAudio host.
 */

import { ErrorDisplay } from "@/ui/design/error-display";
import { CodeBlock } from "@/ui/docs-kit/code-block";
import type { SharedAudio } from "@/ui/docs-kit/use-shared-audio";

interface RunBlockProps {
	id: string;
	code: string;
	audio: SharedAudio;
	/** Start with the signal graph expanded. */
	graphOpen?: boolean;
}

export function RunBlock({ id, code, audio, graphOpen = false }: RunBlockProps) {
	const playing = audio.playingId === id;
	const error = audio.errors[id];
	return (
		<div className="mb-4">
			<CodeBlock
				code={code}
				graphOpen={graphOpen}
				playing={playing}
				onTogglePlay={() => (playing ? audio.halt() : audio.run(id, code))}
			/>
			{error && <ErrorDisplay message={error} />}
		</div>
	);
}
