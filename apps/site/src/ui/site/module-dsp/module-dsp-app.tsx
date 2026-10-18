/**
 * Module DSP: a language guide for writing modules, chapter by chapter.
 * Narrow prose column, every example runnable, over one shared audio host —
 * the same shape as the guide page.
 */

import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { BrickChapters } from "@/ui/site/bricks/brick-chapters";
import { SitePage } from "@/ui/site/site-page";
import { CHAPTERS } from "./bricks";

export function ModuleDspApp() {
	const audio = useSharedAudio();

	return (
		<SitePage current="module dsp" narrow onStopAll={audio.halt}>
			<h1 className="text-xl font-bold mb-8">Module DSP</h1>

			<BrickChapters chapters={CHAPTERS} idPrefix="module-dsp" audio={audio} />
		</SitePage>
	);
}
