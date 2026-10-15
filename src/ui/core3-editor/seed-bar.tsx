/**
 * The patch seed (MANIFESTO §7, §10.2): the value the last run played with,
 * so a happy accident can be pinned with seed(n), and a reroll that draws a
 * new session seed and re-runs. A seed the patch pins itself cannot reroll.
 */

import { ChromeButton } from "@/ui/design/chrome-button";

export interface ShownSeed {
	readonly value: number;
	readonly pinned: boolean;
}

interface SeedBarProps {
	seed: ShownSeed | null;
	isPlaying: boolean;
	onReroll: () => void;
}

export function SeedBar({ seed, isPlaying, onReroll }: SeedBarProps) {
	if (seed === null) return null;
	return (
		<div className="mt-2 flex items-center gap-2 text-xs font-mono text-gray-400">
			<span>
				seed {seed.value}
				{seed.pinned && " (set by seed())"}
			</span>
			<ChromeButton
				onClick={onReroll}
				disabled={!isPlaying || seed.pinned}
				title="Draw a new seed and re-run"
				rounded
			>
				reroll
			</ChromeButton>
		</div>
	);
}
