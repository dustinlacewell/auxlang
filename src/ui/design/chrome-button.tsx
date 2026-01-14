import { CHROME_BUTTON_PADDING } from "./constants";

interface ChromeButtonProps {
	onClick: () => void;
	disabled?: boolean;
	title?: string;
	rounded?: boolean;
	children: React.ReactNode;
}

export function ChromeButton({ onClick, disabled, title, rounded, children }: ChromeButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={`${CHROME_BUTTON_PADDING} text-gray-300 hover:text-white hover:bg-surface-600 disabled:text-gray-600 disabled:cursor-not-allowed ${rounded ? "rounded" : ""}`}
		>
			{children}
		</button>
	);
}

export function ChromeDivider() {
	return <div className="w-px bg-surface-600" />;
}
