/**
 * The chapter nav for a brick page (guide, module dsp): links to each
 * chapter's Section by id. Same shape as the editor's patch-sidebar — a
 * persistent column on desktop, a slide-over drawer on mobile.
 */

import { X } from "lucide-react";
import { useMemo } from "react";
import { chapterSectionId } from "./chapter-section-id";
import type { Chapter } from "./types";
import { useActiveSection } from "./use-active-section";

interface ChapterSidebarProps {
	chapters: readonly Chapter[];
	idPrefix: string;
	open: boolean;
	onClose: () => void;
}

function SidebarContent({
	chapters,
	idPrefix,
	activeId,
	onNavigate,
}: {
	chapters: readonly Chapter[];
	idPrefix: string;
	activeId: string | null;
	onNavigate: () => void;
}) {
	return (
		<nav className="flex flex-col h-full overflow-y-auto py-2">
			{chapters.map((chapter) => {
				const id = chapterSectionId(idPrefix, chapter.title);
				const active = id === activeId;
				return (
					<a
						key={chapter.title}
						href={`#${id}`}
						onClick={onNavigate}
						className={`block px-3 py-1.5 text-sm truncate ${
							active
								? "bg-surface-700 text-white"
								: "text-gray-300 hover:bg-surface-800 hover:text-white"
						}`}
					>
						{chapter.title}
					</a>
				);
			})}
		</nav>
	);
}

export function ChapterSidebar({ chapters, idPrefix, open, onClose }: ChapterSidebarProps) {
	const ids = useMemo(
		() => chapters.map((chapter) => chapterSectionId(idPrefix, chapter.title)),
		[chapters, idPrefix],
	);
	const activeId = useActiveSection(ids);

	return (
		<>
			{/* Desktop: a persistent column. */}
			<div className="hidden md:block w-48 shrink-0 border border-surface-700 rounded bg-surface-900 h-fit sticky top-16">
				<SidebarContent
					chapters={chapters}
					idPrefix={idPrefix}
					activeId={activeId}
					onNavigate={() => {}}
				/>
			</div>

			{/* Mobile: a slide-over drawer. */}
			{open && (
				<div className="md:hidden fixed inset-0 z-30">
					<button
						type="button"
						aria-label="Close chapter list"
						className="absolute inset-0 bg-black/60"
						onClick={onClose}
					/>
					<div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-900 border-r border-surface-700 shadow-xl flex flex-col">
						<div className="flex items-center justify-between px-3 h-10 border-b border-surface-700">
							<span className="text-xs uppercase tracking-wide text-gray-500">chapters</span>
							<button
								type="button"
								aria-label="Close chapter list"
								onClick={onClose}
								className="p-1 text-gray-400 hover:text-white"
							>
								<X size={16} />
							</button>
						</div>
						<SidebarContent
							chapters={chapters}
							idPrefix={idPrefix}
							activeId={activeId}
							onNavigate={onClose}
						/>
					</div>
				</div>
			)}
		</>
	);
}
