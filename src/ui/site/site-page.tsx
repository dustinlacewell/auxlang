/**
 * Shared page shell: site header over a centered content column. `narrow` is
 * for prose pages (the guide, the landing); the default width fits the card
 * grids of the docs pages. Pages that make sound pass `onStopAll` — a fixed
 * bottom-right Stop All button that stays available during scroll.
 */

import { Button } from "@/ui/design/button";
import { Square } from "lucide-react";
import { SiteHeader, type SitePageName } from "./site-header";

interface SitePageProps {
	current: SitePageName;
	narrow?: boolean;
	/** Silences the page's audio host; presence renders the floating Stop All. */
	onStopAll?: () => void;
	children: React.ReactNode;
}

export function SitePage({ current, narrow, onStopAll, children }: SitePageProps) {
	return (
		<div className="min-h-screen">
			<SiteHeader current={current} />
			<main className={`${narrow ? "max-w-3xl" : "max-w-6xl"} mx-auto px-5 py-6`}>{children}</main>
			{onStopAll && (
				<div className="fixed bottom-5 right-5 z-40">
					<Button
						variant="chrome"
						onClick={onStopAll}
						className="text-red-400 hover:text-red-300 shadow-lg shadow-black/40"
					>
						<span className="flex items-center gap-1.5">
							<Square size={14} />
							Stop All
						</span>
					</Button>
				</div>
			)}
		</div>
	);
}
