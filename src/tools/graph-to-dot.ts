/**
 * Convert a flat graph to Graphviz DOT format.
 */

export interface NodeInput {
	ref?: string
	out?: string
	value?: number | number[]
}

export interface GraphNode {
	id: string
	device: string
	inputs: Record<string, NodeInput | number | number[]>
}

export interface FlatGraph {
	nodes: GraphNode[]
	output: string
}

function formatValue(v: number | number[]): string {
	if (Array.isArray(v)) {
		return `[${v.join(', ')}]`
	}
	return String(v)
}

function escapeLabel(s: string): string {
	return s.replace(/"/g, '\\"')
}

export function graphToDot(graph: FlatGraph): string {
	const lines: string[] = []
	lines.push('digraph {')
	lines.push('  rankdir=LR')
	lines.push('  node [shape=box, style=rounded]')
	lines.push('')

	// Create nodes with labels
	for (const node of graph.nodes) {
		const args: string[] = []
		for (const [name, input] of Object.entries(node.inputs)) {
			if (typeof input === 'number' || Array.isArray(input)) {
				args.push(formatValue(input))
			} else if (input.value !== undefined) {
				args.push(formatValue(input.value))
			}
		}

		const label = args.length > 0
			? `${node.device}(${args.join(', ')})`
			: `${node.device}()`

		const isOutput = node.id === graph.output
		const style = isOutput ? ', style="rounded,bold", penwidth=2' : ''
		lines.push(`  ${node.id} [label="${escapeLabel(label)}"${style}]`)
	}

	lines.push('')

	// Create edges
	for (const node of graph.nodes) {
		for (const [inputName, input] of Object.entries(node.inputs)) {
			if (typeof input === 'object' && input.ref) {
				const isDefaultInput = inputName === 'input'
				if (isDefaultInput) {
					// Default input: solid line, no label
					lines.push(`  ${input.ref} -> ${node.id}`)
				} else {
					// Non-default input: dashed line with label
					lines.push(`  ${input.ref} -> ${node.id} [label="${inputName}", style=dashed, color=gray40]`)
				}
			}
		}
	}

	lines.push('}')
	return lines.join('\n')
}

// --- Mock graph example ---

const mockGraph: FlatGraph = {
	nodes: [
		{ id: 'lfo1', device: 'lfo', inputs: { rate: 2 } },
		{ id: 'saw1', device: 'saw', inputs: { freq: 440 } },
		{
			id: 'gain1',
			device: 'gain',
			inputs: {
				input: { ref: 'saw1', out: 'audio' },
				level: { ref: 'lfo1', out: 'out' }
			}
		},
		{
			id: 'scale1',
			device: 'scale',
			inputs: {
				input: { ref: 'lfo1', out: 'out' },
				min: 200,
				max: 2000
			}
		},
		{
			id: 'lpf1',
			device: 'lpf',
			inputs: {
				input: { ref: 'gain1', out: 'audio' },
				cutoff: { ref: 'scale1', out: 'out' },
				resonance: 0.5
			}
		}
	],
	output: 'lpf1'
}

// Run if executed directly
async function main() {
	const { instance } = await import('@viz-js/viz')
	const viz = await instance()

	const dot = graphToDot(mockGraph)
	console.log('--- DOT ---')
	console.log(dot)
	console.log('')

	const svg = viz.renderString(dot, { format: 'svg' })

	// Write SVG to file
	const fs = await import('fs')
	fs.writeFileSync('graph-output.svg', svg)
	console.log('--- SVG written to graph-output.svg ---')
}

main()
