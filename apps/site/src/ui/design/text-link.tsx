/**
 * The standard inline link: bold white, underline on hover. One component so
 * link treatment changes in one place, not per call site.
 */

interface TextLinkProps {
	href: string;
	className?: string;
	children: React.ReactNode;
}

export function TextLink({ href, className = "", children }: TextLinkProps) {
	return (
		<a href={href} className={`font-bold text-white hover:underline ${className}`}>
			{children}
		</a>
	);
}
