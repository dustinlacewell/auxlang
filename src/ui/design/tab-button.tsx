/**
 * A small tab attached to the top edge of a block: rounded top corners, open
 * bottom, sits flush on the block's border. Used for the code-block toggles
 * (playback, graph).
 */

interface TabButtonProps {
	active?: boolean;
	title: string;
	onClick: () => void;
	children: React.ReactNode;
}

export function TabButton({ active, title, onClick, children }: TabButtonProps) {
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className={`px-2 py-1 rounded-t border border-b-0 border-surface-700 text-xs flex items-center transition-colors ${
				active ? "bg-surface-700 text-white" : "bg-surface-800 text-gray-400 hover:text-white"
			}`}
		>
			{children}
		</button>
	);
}
