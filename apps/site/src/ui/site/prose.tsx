/**
 * Prose primitives for the narrow site pages: a titled section, a paragraph,
 * and inline code that upgrades a bare registered module name to the live
 * ModuleName.
 */

import { ModuleName } from "@/ui/docs-kit/module-name";
import { hasModule } from "auxlang/dsp/define";

export function Section({
	id,
	title,
	children,
}: {
	id?: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section id={id} className="mb-10 scroll-mt-16">
			<h2 className="text-lg font-medium border-b border-surface-700 pb-1 mb-3 text-gray-100">
				{title}
			</h2>
			{children}
		</section>
	);
}

export function P({ children }: { children: React.ReactNode }) {
	return <p className="text-gray-400 leading-relaxed mb-3">{children}</p>;
}

/** Inline code; a bare registered module name upgrades to the live ModuleName. */
export function C({ children }: { children: React.ReactNode }) {
	if (typeof children === "string" && hasModule(children)) {
		return (
			<span className="text-[0.9em]">
				<ModuleName name={children} />
			</span>
		);
	}
	return <code className="font-mono text-gray-200 text-[0.9em]">{children}</code>;
}
