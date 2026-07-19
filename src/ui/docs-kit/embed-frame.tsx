/**
 * The standard code-embed skeleton: a tab row riding the top edge (left and
 * right slots for TabButtons), the bordered content box, and an optional panel
 * that expands below the content behind a divider (the signal graph). Both the
 * read-only doc CodeBlock and the live editor compose this frame, so every
 * code embed on the site carries the same silhouette.
 */

interface EmbedFrameProps {
	/** Tabs attached top-left (e.g. the editor's Examples tab). */
	tabsLeft?: React.ReactNode;
	/** Tabs attached top-right (playback, graph toggle). */
	tabsRight: React.ReactNode;
	/** The code surface. */
	children: React.ReactNode;
	/** Expanded panel below the code (e.g. PatchGraph), already gated by the caller. */
	panel?: React.ReactNode;
}

export function EmbedFrame({ tabsLeft, tabsRight, children, panel }: EmbedFrameProps) {
	return (
		<div className="mb-2">
			<div className="flex justify-between px-2">
				<div className="flex gap-1">{tabsLeft}</div>
				<div className="flex gap-1">{tabsRight}</div>
			</div>
			<div className="border border-surface-700 rounded overflow-hidden">
				<div className="overflow-auto">{children}</div>
				{panel && <div className="border-t border-surface-700 bg-surface-900">{panel}</div>}
			</div>
		</div>
	);
}
