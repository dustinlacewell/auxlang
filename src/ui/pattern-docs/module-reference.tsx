/**
 * The module reference: one table per module, generated from the LIVE registry
 * (import modules/all, iterate getRegistry) so it can never drift from the code.
 * No hand-written per-module prose — just ports, defaults, and policy. Grouped
 * by the file-ish category heuristic. Plain tables in the app's dark palette.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import type { ModuleSpec, PortAnn } from "@/core3/types";
import { CATEGORY_ORDER, categoryOf } from "./module-category";

const registry = getRegistry();

function modulesByCategory(): Map<string, ModuleSpec[]> {
	const groups = new Map<string, ModuleSpec[]>(CATEGORY_ORDER.map((c) => [c, []]));
	for (const spec of registry.values()) {
		const cat = categoryOf(spec.name);
		(groups.get(cat) ?? groups.set(cat, []).get(cat)!).push(spec);
	}
	return groups;
}

function portRow(name: string, ann: PortAnn, isDefault: boolean): React.ReactNode {
	const optional = ann.def === null && ann.opt;
	const required = ann.def === null && !ann.opt;
	return (
		<tr key={name} className="border-t border-surface-700">
			<td className="py-0.5 pr-4 font-mono">
				{name}
				{isDefault && <span className="text-accent-blue" title="default port"> ◂</span>}
				{optional && <span className="text-gray-500"> (opt)</span>}
			</td>
			<td className="py-0.5 pr-4 text-gray-400">{ann.unit}</td>
			<td className="py-0.5 text-gray-400">
				{required ? "required" : ann.def === null ? "—" : ann.def}
			</td>
		</tr>
	);
}

function ModuleTable({ spec }: { spec: ModuleSpec }) {
	return (
		<div className="bg-surface-800 border border-surface-700 rounded-md p-3">
			<div className="flex items-baseline gap-2 mb-2">
				<span className="font-mono font-bold text-accent-green">{spec.name}</span>
				<span className="text-xs text-gray-500">{spec.policy ?? "map"}</span>
			</div>
			<table className="w-full text-sm text-left">
				<thead>
					<tr className="text-gray-500 text-xs uppercase">
						<th className="pr-4 font-medium">in</th>
						<th className="pr-4 font-medium">unit</th>
						<th className="font-medium">default</th>
					</tr>
				</thead>
				<tbody>
					{Object.entries(spec.ins).map(([n, ann]) => portRow(n, ann, n === spec.defaultIn))}
				</tbody>
			</table>
			<div className="text-xs text-gray-500 mt-2">
				outs:{" "}
				{Object.keys(spec.outs).map((o) => (
					<span key={o} className="font-mono text-gray-400 mr-2">
						{o}
						{o === spec.defaultOut && <span className="text-accent-blue">◂</span>}
					</span>
				))}
			</div>
		</div>
	);
}

export function ModuleReference() {
	const groups = modulesByCategory();
	return (
		<div className="mb-6">
			<h2 className="text-lg font-medium border-b border-surface-700 pb-1 mb-3 text-accent-blue">
				Module reference
			</h2>
			<p className="text-sm text-gray-400 mb-4">
				Generated from the live registry. ◂ marks the default input (chain target) and default
				output; (opt) marks an optional input.
			</p>
			{CATEGORY_ORDER.map((cat) => {
				const mods = groups.get(cat) ?? [];
				if (mods.length === 0) return null;
				return (
					<div key={cat} className="mb-5">
						<h3 className="text-sm font-medium text-gray-400 mb-2">{cat}</h3>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 items-start">
							{mods.map((spec) => (
								<ModuleTable key={spec.name} spec={spec} />
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
