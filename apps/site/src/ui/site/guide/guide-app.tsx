/**
 * The guide: one brick at a time, each a short text and a runnable patch that
 * changes one thing from the brick before it. Content lives in bricks.ts;
 * layout is shared with the module dsp page via bricks/brick-chapters.tsx and
 * bricks/chapter-sidebar.tsx.
 */

import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { BrickChapters } from "@/ui/site/bricks/brick-chapters";
import { ChapterSidebar } from "@/ui/site/bricks/chapter-sidebar";
import { SitePage } from "@/ui/site/site-page";
import { List } from "lucide-react";
import { useState } from "react";
import { CHAPTERS } from "./bricks";

const ID_PREFIX = "guide";

export function GuideApp() {
	const audio = useSharedAudio();
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<SitePage current="guide" onStopAll={audio.halt}>
			<div className="flex gap-6">
				<ChapterSidebar
					chapters={CHAPTERS}
					idPrefix={ID_PREFIX}
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
				/>
				<div className="flex-1 min-w-0 max-w-3xl">
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-xl font-bold">Guide</h1>
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
