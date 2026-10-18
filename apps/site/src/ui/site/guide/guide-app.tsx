/**
 * The guide: one brick at a time, each a short text and a runnable patch that
 * changes one thing from the brick before it. Content lives in bricks.ts;
 * layout is shared with the module dsp page via bricks/brick-chapters.tsx.
 */

import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { BrickChapters } from "@/ui/site/bricks/brick-chapters";
import { SitePage } from "@/ui/site/site-page";
import { CHAPTERS } from "./bricks";

export function GuideApp() {
	const audio = useSharedAudio();

	return (
		<SitePage current="guide" narrow onStopAll={audio.halt}>
			<h1 className="text-xl font-bold mb-8">Guide</h1>

			<BrickChapters chapters={CHAPTERS} idPrefix="guide" audio={audio} />
		</SitePage>
	);
}
