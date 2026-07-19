/**
 * Shared site chrome: the wordmark and top-level nav, identical on every page.
 * Sticky so the long docs pages keep navigation at hand. `current` highlights
 * the page being viewed.
 */

const LINKS = [
	{ href: "/editor.html", label: "editor" },
	{ href: "/guide.html", label: "guide" },
	{ href: "/patterns.html", label: "patterns" },
	{ href: "/modules.html", label: "modules" },
] as const;

export type SitePageName = (typeof LINKS)[number]["label"] | "home";

interface SiteHeaderProps {
	current: SitePageName;
}

export function SiteHeader({ current }: SiteHeaderProps) {
	return (
		<header className="sticky top-0 z-10 border-b border-surface-700 bg-surface-900/95 backdrop-blur">
			<div className="max-w-6xl mx-auto px-5 h-11 flex items-center gap-6">
				<a href="/" className="font-mono font-bold text-white hover:underline">
					auxlang
				</a>
				<nav className="flex gap-4 text-sm">
					{LINKS.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className={link.label === current ? "text-white" : "text-gray-400 hover:text-white"}
						>
							{link.label}
						</a>
					))}
				</nav>
			</div>
		</header>
	);
}
