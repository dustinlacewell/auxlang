/**
 * Module DSP: a language guide for writing modules, chapter by chapter.
 * Narrow prose column, every example runnable, over one shared audio host —
 * the same shape as the guide page, including its chapter sidebar.
 */

import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { BrickChapters } from "@/ui/site/bricks/brick-chapters";
import { ChapterSidebar } from "@/ui/site/bricks/chapter-sidebar";
import { SitePage } from "@/ui/site/site-page";
import { List } from "lucide-react";
import { useState } from "react";
import { CHAPTERS } from "./bricks";

const ID_PREFIX = "module-dsp";

export function ModuleDspApp() {
	const audio = useSharedAudio();
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<SitePage current="module dsp" onStopAll={audio.halt}>
			<div className="flex gap-6">
				<ChapterSidebar
					chapters={CHAPTERS}
					idPrefix={ID_PREFIX}
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
				/>
				<div className="flex-1 min-w-0 max-w-3xl">
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-xl font-bold">Module DSP</h1>
						<button
							type="button"
							onClick={() => setDrawerOpen(true)}
							className="md:hidden flex items-center gap-1 text-sm text-gray-400 hover:text-white"
						>
							<List size={14} /> chapters
						</button>
					</div>
					<BrickChapters chapters={CHAPTERS} idPrefix={ID_PREFIX} audio={audio} />
				</div>
			</div>
		</SitePage>
	);
}
