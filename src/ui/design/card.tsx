import type { PlaybackState } from "@/ui/audio/types";

interface CardProps {
	status?: PlaybackState;
	children: React.ReactNode;
	className?: string;
}

const statusBorderStyles: Record<PlaybackState, string> = {
	idle: "border-surface-700",
	playing: "border-accent-green",
	error: "border-accent-red bg-accent-red/10",
};

export function Card({ status = "idle", children, className = "" }: CardProps) {
	return (
		<div
			className={`bg-surface-800 border rounded-md p-3 h-full ${statusBorderStyles[status]} ${className}`}
		>
			{children}
		</div>
	);
}
