/**
 * The one way to write a module's name anywhere on the site: category-colored
 * (via ModName) and hover-inspectable — the pointer summons the module's card
 * in a portal, the same card the graph shows on node hover. The card itself
 * renders plain ModName, so there is exactly one level of popup.
 */

import "@/core3/modules/all";

import { getModule } from "@/core3/module/define";
import { ModName } from "@/ui/design/mod-name";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ModuleCard } from "./module-card";

interface ModuleNameProps {
	name: string;
	bold?: boolean;
}

export function ModuleName({ name, bold = true }: ModuleNameProps) {
	const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
	const spec = getModule(name);

	return (
		<span
			onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
			onMouseLeave={() => setPos(null)}
		>
			<ModName name={name} category={spec.category} bold={bold} />
			{pos &&
				createPortal(
					<div
						className="fixed z-50 pointer-events-none w-72 shadow-lg"
						style={{
							left: Math.min(pos.x + 12, window.innerWidth - 320),
							top: pos.y,
							transform:
								pos.y < window.innerHeight / 2
									? "translateY(14px)"
									: "translateY(calc(-100% - 14px))",
						}}
					>
						<ModuleCard name={name} />
					</div>,
					document.body,
				)}
		</span>
	);
}
