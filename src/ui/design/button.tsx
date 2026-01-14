interface ButtonProps {
	variant: "play" | "stop" | "default" | "chrome";
	onClick: () => void;
	children: React.ReactNode;
	disabled?: boolean;
	className?: string;
}

const variantStyles = {
	play: "bg-accent-green hover:bg-accent-green/80 text-white",
	stop: "bg-accent-red hover:bg-accent-red/80 text-white",
	default: "bg-surface-700 hover:bg-surface-600 text-white",
	chrome: "bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white border border-surface-600",
};

export function Button({ variant, onClick, children, disabled, className = "" }: ButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
		>
			{children}
		</button>
	);
}
