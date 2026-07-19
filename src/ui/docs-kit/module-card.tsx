/**
 * One module's card: name, its `doc` line from the spec, the input-port table,
 * and the output ports — generated from the LIVE registry so it can never
 * drift from the code. Used standalone in the guide and grid-tiled by the
 * module reference. ◂ marks the default input/output.
 */

import "@/core3/modules/all";

import { getModule } from "@/core3/module/define";
import type { PortAnn } from "@/core3/types";
import { ModName } from "@/ui/design/mod-name";
import { ModuleBadge } from "@/ui/design/module-badge";

function portRow(name: string, ann: PortAnn, isDefault: boolean): React.ReactNode {
	const optional = ann.def === null && ann.opt;
	const required = ann.def === null && !ann.opt;
	return (
		<tr key={name} className="border-t border-surface-700">
			<td className="py-0.5 pr-4 font-mono">
				{name}
				{isDefault && (
					<span className="text-white" title="default port">
						{" "}
						◂
					</span>
				)}
				{optional && (
					<span className="text-gray-500 text-xs" title="optional">
						{" "}
						?
					</span>
				)}
			</td>
			<td className="py-0.5 pr-4 text-gray-400">{ann.unit}</td>
			<td className="py-0.5 text-gray-400">
				{required ? "required" : ann.def === null ? "—" : ann.def}
			</td>
		</tr>
	);
}

export function ModuleCard({ name }: { name: string }) {
	const spec = getModule(name);
	return (
		<div className="bg-surface-800 border border-surface-700 rounded-md p-3">
			<div className="flex items-baseline gap-2">
				<ModName name={spec.name} category={spec.category} />
				<span className="ml-auto">
					<ModuleBadge category={spec.category} />
				</span>
			</div>
			{spec.doc && <p className="text-sm text-gray-400 mt-0.5 mb-2">{spec.doc}</p>}
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
						{o === spec.defaultOut && <span className="text-white">◂</span>}
					</span>
				))}
			</div>
		</div>
	);
}
