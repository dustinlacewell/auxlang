/**
 * "Press play" with a hand-drawn arrow. Positions itself above its anchor
 * (the play tab): the arrow's tip lands on the anchor's top center, and the
 * text sits up and to the left where the arrow's tail starts. Fades out
 * when `visible` turns false.
 */

export function PlayHint({ visible }: { visible: boolean }) {
	return (
		<div
			aria-hidden={!visible}
			className={`absolute flex items-start gap-1 text-amber-300 pointer-events-none select-none transition-opacity duration-700 ${
				visible ? "opacity-100" : "opacity-0"
			}`}
			style={{ bottom: "calc(100% + 1px)", right: "calc(50% - 6px)" }}
		>
			<span className="font-mono text-sm whitespace-nowrap -translate-y-1.5">Press play</span>
			<svg width="34" height="28" viewBox="0 0 34 28" fill="none" aria-hidden="true">
				<path
					d="M2 8C14 4 26 10 28 25M23 20L28 25L31 19"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}
