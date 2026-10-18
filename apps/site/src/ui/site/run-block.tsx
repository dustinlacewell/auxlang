/**
 * A runnable patch outside the card grid: the code block (whose tab buttons
 * carry playback and graph toggles) with the loud error below. The landing
 * hello patch and every guide example use it, all over one page-level
 * SharedAudio host.
 */

import { RunnableCode } from "@/ui/docs-kit/runnable-code";
import type { SharedAudio } from "@/ui/docs-kit/use-shared-audio";

interface RunBlockProps {
	id: string;
	code: string;
	audio: SharedAudio;
	/** Start with the signal graph expanded. */
	graphOpen?: boolean;
	/** Drawn at the play tab. */
	playHint?: React.ReactNode;
}

export function RunBlock({ id, code, audio, graphOpen = false, playHint }: RunBlockProps) {
	const playing = audio.playingId === id;
	return (
		<div className="mb-4">
			<RunnableCode
				code={code}
				graphOpen={graphOpen}
				playing={playing}
				playHint={playHint}
				onRun={(edited) => audio.run(id, edited)}
				onStop={audio.halt}
				sourceMap={playing ? audio.sourceMap : undefined}
				liveSlots={playing ? audio.liveSlots : undefined}
				onEnsureSlotSite={playing ? audio.ensureSlotSite : undefined}
				{...(audio.errors[id] ? { error: audio.errors[id] } : {})}
			/>
		</div>
	);
}
